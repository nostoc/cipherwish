const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors()); // Allows your Next.js frontend to talk to this backend
app.use(express.json()); // Allows the server to accept JSON payloads

// --- Database Schema ---
// Notice: There is NO password or key stored here. Just the Initialization Vector (IV) and Ciphertext.
const wishlistSchema = new mongoose.Schema({
    iv: { type: String, required: true },
    ciphertext: { type: String, required: true },
    isEphemeral: { type: Boolean, default: false },
    pinHash: { type: String, required: false },
    // NEW: Fields for Digital Signatures
    publicKey: { type: String, required: true },
    signature: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: '30d' }
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

// --- API Endpoints ---

// 1. POST: Save an encrypted wishlist
app.post('/api/wishlists', async (req, res) => {
    try {
        const { iv, ciphertext, isEphemeral, pin, publicKey, signature } = req.body;

        if (!iv || !ciphertext || !publicKey || !signature) {
            return res.status(400).json({ error: 'Missing cryptography parameters' });
        }

        let pinHash = undefined;
        if (pin && pin.trim() !== '') {
            // Generate a salt and hash the PIN. This takes the plaintext PIN and turns it into gibberish.
            const salt = await bcrypt.genSalt(10);
            pinHash = await bcrypt.hash(pin, salt);
        }

        const newList = new Wishlist({ iv, ciphertext, isEphemeral, pinHash, publicKey, signature });
        const savedList = await newList.save();

        res.status(201).json({ id: savedList._id });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// 2. GET: Retrieve an encrypted wishlist by its ID
app.get('/api/wishlists/:id', async (req, res) => {
    try {
        const list = await Wishlist.findById(req.params.id);

        if (!list) {
            return res.status(404).json({ error: 'Wishlist not found, or it was already viewed and destroyed.' });
        }

        // NEW: Vault PIN Verification
        if (list.pinHash) {
            const providedPin = req.headers['x-vault-pin']; // Grab the PIN from the request header

            if (!providedPin) {
                // If the list has a PIN, but the user hasn't provided one yet, tell the frontend to ask for it.
                return res.status(401).json({ requiresPin: true, error: 'A Vault PIN is required to access this list.' });
            }

            // Compare the provided PIN against the hashed PIN in the database
            const isMatch = await bcrypt.compare(providedPin, list.pinHash);
            if (!isMatch) {
                return res.status(403).json({ error: 'Incorrect Vault PIN. Access Denied.' });
            }
        }

        const responseData = {
            iv: list.iv,
            ciphertext: list.ciphertext,
            publicKey: list.publicKey,
            signature: list.signature
        };

        // Self-Destruct Sequence (only happens if the PIN was correct!)
        if (list.isEphemeral) {
            await Wishlist.findByIdAndDelete(req.params.id);
            console.log(`💥 Ephemeral list ${req.params.id} has been destroyed.`);
        }

        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Start the Server ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB (Untrusted Server Ready)');
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch((err) => console.error('❌ MongoDB connection error:', err));