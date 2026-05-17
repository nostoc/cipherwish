"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
    buildSignedPayload,
    decryptData,
    fingerprintPublicKey,
    parseShareFragment,
    verifySignature,
} from "../../../utils/crypto";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export default function ViewList() {
    const params = useParams();
    const id = params.id as string;

    const [wishlist, setWishlist] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [requiresPin, setRequiresPin] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [verified, setVerified] = useState(false);

    const fetchAndDecrypt = useCallback(
        async (providedPin?: string) => {
            setLoading(true);
            setError(null);

            try {
                const { keyString, publicKeyFingerprint } = parseShareFragment(window.location.hash);

                const headers: HeadersInit = {};
                if (providedPin) headers["x-vault-pin"] = providedPin;

                const response = await fetch(`${API_BASE_URL}/api/wishlists/${id}`, { headers });
                const data = await response.json();

                if (response.status === 401 && data.requiresPin) {
                    setRequiresPin(true);
                    setLoading(false);
                    return;
                }

                if (!response.ok) {
                    throw new Error(data.error || "Failed to fetch note.");
                }

                const calculatedFingerprint = await fingerprintPublicKey(data.publicKey);
                if (calculatedFingerprint !== publicKeyFingerprint) {
                    throw new Error("Public-key fingerprint mismatch. The server may have substituted the verification key.");
                }

                if (data.publicKeyFingerprint !== publicKeyFingerprint) {
                    throw new Error("Stored public-key fingerprint does not match the secure link.");
                }

                const signedPayload = buildSignedPayload(data.iv, data.ciphertext);
                const signatureIsValid = await verifySignature(
                    signedPayload,
                    data.signature,
                    data.publicKey
                );

                if (!signatureIsValid) {
                    throw new Error("Signature verification failed. The encrypted payload may have been altered.");
                }

                const decryptedText = await decryptData(
                    { iv: data.iv, ciphertext: data.ciphertext },
                    keyString
                );

                setRequiresPin(false);
                setVerified(true);
                setWishlist(decryptedText);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unexpected error occurred.");
            } finally {
                setLoading(false);
            }
        },
        [id]
    );

    useEffect(() => {
        void fetchAndDecrypt();
    }, [fetchAndDecrypt]);

    const submitPin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pinInput) return;
        void fetchAndDecrypt(pinInput);
    };

    return (
        <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-950">
            <div className="mx-auto max-w-4xl">
                <header className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
                    <Link href="/" className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">
                        CipherNote
                    </Link>
                    <h1 className="mt-3 text-4xl font-extrabold">Verify first, then decrypt</h1>
                    <p className="mt-3 text-slate-600">
                        The browser verifies the public-key fingerprint and RSA-PSS signature before AES-GCM decryption.
                    </p>
                </header>

                {loading && (
                    <section className="rounded-3xl bg-white p-6 shadow-sm">Opening secure note...</section>
                )}

                {requiresPin && !loading && !wishlist && (
                    <form onSubmit={submitPin} className="rounded-3xl bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-bold">Vault locked</h2>
                        <p className="mt-2 text-sm text-slate-600">Enter the PIN/passphrase shared by the sender.</p>
                        <input
                            type="password"
                            className="mt-5 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-blue-600"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            autoFocus
                        />
                        {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
                        <button className="mt-5 rounded-2xl bg-blue-700 px-5 py-3 font-bold text-white">
                            Unlock and decrypt
                        </button>
                    </form>
                )}

                {error && !requiresPin && !loading && (
                    <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
                        <h2 className="text-2xl font-bold">Access blocked</h2>
                        <p className="mt-3">{error}</p>
                    </section>
                )}

                {wishlist && (
                    <section className="rounded-3xl bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-2xl font-bold">Decrypted note</h2>
                            {verified && (
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                                    Fingerprint + signature verified
                                </span>
                            )}
                        </div>
                        <pre className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-slate-800">
                            {wishlist}
                        </pre>
                        <p className="mt-4 text-sm text-slate-600">
                            Integrity checks and decryption were performed locally in this browser.
                        </p>
                    </section>
                )}
            </div>
        </main>
    );
}
