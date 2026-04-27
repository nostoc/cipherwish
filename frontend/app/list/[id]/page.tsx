"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { decryptData, verifySignature } from "../../../utils/crypto";

export default function ViewList() {
    const params = useParams();
    const id = params.id as string;

    const [wishlist, setWishlist] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const [requiresPin, setRequiresPin] = useState<boolean>(false);
    const [pinInput, setPinInput] = useState<string>("");
    const [isVerified, setIsVerified] = useState<boolean>(false); // NEW: State for Signature Verification

    const fetchAndDecrypt = useCallback(async (providedPin?: string) => {
        setLoading(true);
        setError(null);
        try {
            const hash = window.location.hash;
            if (!hash || hash.length <= 1) {
                throw new Error("No decryption key found in the URL.");
            }
            const keyString = hash.substring(1);

            const headers: HeadersInit = {};
            if (providedPin) {
                headers["x-vault-pin"] = providedPin;
            }

            const response = await fetch(`http://localhost:5000/api/wishlists/${id}`, { headers });

            if (response.status === 401) {
                setRequiresPin(true);
                setLoading(false);
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch wishlist.");
            }

            setRequiresPin(false);

            // NEW: 1. Verify the RSA Digital Signature FIRST
            const signatureIsValid = await verifySignature(data.ciphertext, data.signature, data.publicKey);

            if (!signatureIsValid) {
                throw new Error("CRITICAL SECURITY ALERT: Digital Signature verification failed. The data may have been forged or altered by an attacker.");
            }

            // If it passes, we show the badge
            setIsVerified(true);

            // 2. Decrypt the AES Ciphertext SECOND
            const decryptedText = await decryptData(data, keyString);
            setWishlist(decryptedText);

        } catch (err: any) {
            setError(err.message || "An error occurred.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchAndDecrypt();
    }, [fetchAndDecrypt]);

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pinInput) return;
        fetchAndDecrypt(pinInput);
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-black">
            <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">

                {loading && (
                    <div className="text-center text-gray-500 animate-pulse">
                        <p>Verifying cryptographic signatures...</p>
                    </div>
                )}

                {requiresPin && !loading && !wishlist && (
                    <form onSubmit={handlePinSubmit} className="text-center">
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Vault Locked 🔒</h1>
                        <p className="text-sm text-gray-500 mb-6">The creator of this list has protected it with a Vault PIN.</p>

                        <input
                            type="password"
                            placeholder="Enter PIN"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-center text-lg tracking-widest"
                            autoFocus
                        />

                        <button
                            type="submit"
                            className="w-full bg-gray-800 text-white font-semibold py-2 px-4 rounded hover:bg-gray-900 transition duration-200"
                        >
                            Unlock Vault
                        </button>
                        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                    </form>
                )}

                {error && !requiresPin && (
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
                        <p className="text-gray-600">{error}</p>
                    </div>
                )}

                {wishlist && (
                    <div>
                        <div className="flex justify-center items-center gap-2 mb-4">
                            <h1 className="text-2xl font-bold text-blue-600">Secure Wishlist</h1>
                            {isVerified && (
                                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-400">
                                    ✓ RSA Verified
                                </span>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg whitespace-pre-wrap">
                            {wishlist}
                        </div>
                        <p className="text-xs text-gray-400 mt-6 text-center">
                            This data was decrypted and mathematically verified on your device.
                        </p>
                    </div>
                )}

            </div>
        </main>
    );
}