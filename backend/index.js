const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

/**
 * CipherNote backend is intentionally an "untrusted storage server".
 * It never receives plaintext note content or the AES-GCM decryption key.
 */

app.use(helmet());

app.use(
    cors({
        origin: ["https://ciperwish.internalbuildtools.online", "http://localhost:3000"],
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "x-vault-pin"],
    })
);

app.use(express.json({ limit: "100kb" }));

const createLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many note creation attempts. Please try again later." },
});

const readLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many access attempts. Please try again later." },
});

const pinLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    message: { error: "Too many PIN attempts for this note. Please wait and try again." },
});

const HEX_RE = /^[0-9a-f]+$/i;
const SHARE_ID_RE = /^[0-9a-f]{48}$/i;

function isHex(value, minLength, maxLength) {
    return (
        typeof value === "string" &&
        value.length >= minLength &&
        value.length <= maxLength &&
        value.length % 2 === 0 &&
        HEX_RE.test(value)
    );
}

function validateCreatePayload(body) {
    const errors = [];

    if (!isHex(body.iv, 24, 24)) {
        errors.push("iv must be a 12-byte / 24-character hex string.");
    }

    if (!isHex(body.ciphertext, 2, 80_000)) {
        errors.push("ciphertext must be a non-empty hex string below the size limit.");
    }

    if (typeof body.isEphemeral !== "boolean") {
        errors.push("isEphemeral must be a boolean.");
    }

    if (!isHex(body.publicKey, 100, 2000)) {
        errors.push("publicKey must be a valid exported SPKI public key hex string.");
    }

    if (!isHex(body.signature, 100, 2000)) {
        errors.push("signature must be a valid signature hex string.");
    }

    if (body.publicKeyFingerprint && !isHex(body.publicKeyFingerprint, 64, 64)) {
        errors.push("publicKeyFingerprint must be a SHA-256 hex digest.");
    }

    if (body.pin !== undefined && body.pin !== null && body.pin !== "") {
        if (typeof body.pin !== "string") {
            errors.push("pin must be a string.");
        } else if (body.pin.length < 6 || body.pin.length > 64) {
            errors.push("pin/passphrase must be between 6 and 64 characters.");
        }
    }

    return errors;
}

const wishlistSchema = new mongoose.Schema({
    shareId: { type: String, required: true, unique: true, index: true },
    iv: { type: String, required: true },
    ciphertext: { type: String, required: true },
    isEphemeral: { type: Boolean, default: false },
    pinHash: { type: String, required: false },
    publicKey: { type: String, required: true },
    publicKeyFingerprint: { type: String, required: true },
    signature: { type: String, required: true },
    failedPinAttempts: { type: Number, default: 0 },
    lastFailedPinAt: { type: Date },
    createdAt: { type: Date, default: Date.now, expires: "30d" },
});

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

function createShareId() {
    return crypto.randomBytes(24).toString("hex");
}

async function createUniqueShareId() {
    for (let i = 0; i < 5; i++) {
        const shareId = createShareId();
        const existing = await Wishlist.exists({ shareId });
        if (!existing) return shareId;
    }
    throw new Error("Unable to generate unique share id.");
}

app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "ciphernote-untrusted-storage" });
});

app.post("/api/wishlists", createLimiter, async (req, res) => {
    try {
        const errors = validateCreatePayload(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ error: "Invalid request payload.", details: errors });
        }

        const { iv, ciphertext, isEphemeral, pin, publicKey, publicKeyFingerprint, signature } = req.body;

        let pinHash;
        if (pin && pin.trim() !== "") {
            const salt = await bcrypt.genSalt(12);
            pinHash = await bcrypt.hash(pin, salt);
        }

        const shareId = await createUniqueShareId();

        const wishlist = await Wishlist.create({
            shareId,
            iv,
            ciphertext,
            isEphemeral,
            pinHash,
            publicKey,
            publicKeyFingerprint,
            signature,
        });

        res.status(201).json({ id: wishlist.shareId });
    } catch (error) {
        console.error("Create note failed:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/api/wishlists/:shareId", readLimiter, pinLimiter, async (req, res) => {
    try {
        const { shareId } = req.params;

        if (!SHARE_ID_RE.test(shareId)) {
            return res.status(404).json({ error: "Note not found." });
        }

        const list = await Wishlist.findOne({ shareId });

        if (!list) {
            return res.status(404).json({ error: "Note not found, expired, or already consumed." });
        }

        if (list.pinHash) {
            const providedPin = req.headers["x-vault-pin"];

            if (!providedPin || typeof providedPin !== "string") {
                return res.status(401).json({
                    requiresPin: true,
                    error: "A Vault PIN/passphrase is required to access this list.",
                });
            }

            const isMatch = await bcrypt.compare(providedPin, list.pinHash);

            if (!isMatch) {
                await Wishlist.updateOne(
                    { shareId },
                    { $inc: { failedPinAttempts: 1 }, $set: { lastFailedPinAt: new Date() } }
                );
                return res.status(403).json({ error: "Incorrect Vault PIN/passphrase. Access denied." });
            }
        }

        let result = list;

        // Atomic burn-after-reading. Only the first successful reader receives the encrypted payload.
        if (list.isEphemeral) {
            result = await Wishlist.findOneAndDelete({ shareId });
            if (!result) {
                return res.status(404).json({ error: "Note was already consumed." });
            }
        }

        res.status(200).json({
            iv: result.iv,
            ciphertext: result.ciphertext,
            publicKey: result.publicKey,
            publicKeyFingerprint: result.publicKeyFingerprint,
            signature: result.signature,
        });
    } catch (error) {
        console.error("Read note failed:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("✅ Connected to MongoDB. Untrusted storage server ready.");
        app.listen(PORT, () => console.log(`🚀 CipherNote backend running on port ${PORT}`));
    })
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    });
