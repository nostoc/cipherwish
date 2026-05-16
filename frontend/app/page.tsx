"use client";

import { useState } from "react";
import {
    buildSignedPayload,
    encryptData,
    exportPublicKey,
    fingerprintPublicKey,
    generateKeyString,
    generateSigningKeyPair,
    signPayload,
} from "../utils/crypto";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export default function Home() {
    const [wishlist, setWishlist] = useState("");
    const [shareLink, setShareLink] = useState("");
    const [isEphemeral, setIsEphemeral] = useState(false);
    const [pin, setPin] = useState("");
    const [formError, setFormError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreateLink = async () => {
        if (!wishlist.trim()) {
            setFormError("Add at least one wishlist item before generating a secure link.");
            return;
        }

        if (pin && pin.length < 6) {
            setFormError("Use at least 6 characters for the Vault PIN/passphrase.");
            return;
        }

        setFormError("");
        setLoading(true);

        try {
            const keyString = await generateKeyString();
            const { iv, ciphertext } = await encryptData(wishlist, keyString);

            const rsaKeyPair = await generateSigningKeyPair();
            const publicKey = await exportPublicKey(rsaKeyPair.publicKey);
            const publicKeyFingerprint = await fingerprintPublicKey(publicKey);

            const signedPayload = buildSignedPayload(iv, ciphertext);
            const signature = await signPayload(signedPayload, rsaKeyPair.privateKey);

            const response = await fetch(`${API_BASE_URL}/api/wishlists`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    iv,
                    ciphertext,
                    isEphemeral,
                    pin,
                    publicKey,
                    publicKeyFingerprint,
                    signature,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Server rejected the request.");
            }

            // Fragment format: AES_KEY.PUBLIC_KEY_FINGERPRINT
            // The server does not receive this fragment, so it cannot silently substitute the public key.
            const link = `${window.location.origin}/list/${data.id}#${keyString}.${publicKeyFingerprint}`;

            setShareLink(link);
            setWishlist("");
            setPin("");
            setIsEphemeral(false);
        } catch (error) {
            console.error(error);
            setFormError(error instanceof Error ? error.message : "Secure link generation failed.");
        } finally {
            setLoading(false);
        }
    };

    const copyLink = async () => {
        if (!shareLink) return;
        await navigator.clipboard.writeText(shareLink);
    };

    return (
        <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-950">
            <div className="mx-auto max-w-4xl">
                <header className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">CipherWish</p>
                    <h1 className="mt-3 text-4xl font-extrabold">Zero-knowledge wishlist sharing</h1>
                    <p className="mt-3 text-slate-600">
                        The wishlist is encrypted in your browser. The backend stores only ciphertext, IV,
                        signature, and public-key metadata.
                    </p>
                </header>

                <section className="rounded-3xl bg-white p-6 shadow-sm">
                    <label className="block text-sm font-semibold">Wishlist content</label>
                    <textarea
                        className="mt-2 min-h-56 w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-blue-600"
                        placeholder={"Leather notebook\nSoundcore headphones\nBlack cat plushie"}
                        value={wishlist}
                        onChange={(e) => setWishlist(e.target.value)}
                    />

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-semibold">Vault PIN/passphrase</label>
                            <input
                                type="password"
                                className="mt-2 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-blue-600"
                                placeholder="Optional, minimum 6 characters"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                            />
                        </div>

                        <label className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <input
                                type="checkbox"
                                checked={isEphemeral}
                                onChange={(e) => setIsEphemeral(e.target.checked)}
                            />
                            <span>
                                <span className="block font-semibold">Burn after reading</span>
                                <span className="text-sm text-slate-600">Delete after the first successful view.</span>
                            </span>
                        </label>
                    </div>

                    {formError && (
                        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                            {formError}
                        </div>
                    )}

                    <button
                        onClick={handleCreateLink}
                        disabled={loading}
                        className="mt-6 w-full rounded-2xl bg-blue-700 px-5 py-4 font-bold text-white disabled:opacity-60"
                    >
                        {loading ? "Encrypting, signing, and generating link..." : "Generate secure share link"}
                    </button>
                </section>

                {shareLink && (
                    <section className="mt-6 rounded-3xl bg-emerald-50 p-6">
                        <h2 className="text-2xl font-bold">Secure link ready</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Anyone with the full link can decrypt the list. Share it only through a trusted channel.
                        </p>
                        <input
                            readOnly
                            value={shareLink}
                            onClick={(e) => e.currentTarget.select()}
                            className="mt-4 w-full rounded-2xl border border-emerald-200 p-3 font-mono text-xs"
                        />
                        <button
                            onClick={copyLink}
                            className="mt-3 rounded-2xl bg-emerald-700 px-5 py-3 font-semibold text-white"
                        >
                            Copy link
                        </button>
                    </section>
                )}
            </div>
        </main>
    );
}
