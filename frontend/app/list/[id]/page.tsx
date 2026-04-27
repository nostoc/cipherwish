"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { decryptData } from "../../../utils/crypto";

export default function ViewList() {
    const params = useParams();
    const id = params.id as string;

    const [wishlist, setWishlist] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchAndDecrypt = async () => {
            try {
                // 1. Get the decryption key from the URL fragment (the part after the #)
                const hash = window.location.hash;
                if (!hash || hash.length <= 1) {
                    throw new Error("No decryption key found in the URL.");
                }
                const keyString = hash.substring(1); // Remove the '#' character

                // 2. Fetch the scrambled data from the untrusted server
                const response = await fetch(`http://localhost:5000/api/wishlists/${id}`);
                if (!response.ok) {
                    throw new Error("Wishlist not found or has expired.");
                }
                const encryptedData = await response.json();

                // 3. Decrypt the data locally in the browser
                const decryptedText = await decryptData(encryptedData, keyString);
                setWishlist(decryptedText);

            } catch (err: any) {
                setError(err.message || "An error occurred.");
            } finally {
                setLoading(false);
            }
        };

        fetchAndDecrypt();
    }, [id]);

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-black">
            <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">

                {loading && (
                    <div className="text-center text-gray-500 animate-pulse">
                        <p>Decrypting wishlist locally...</p>
                    </div>
                )}

                {error && (
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
                        <p className="text-gray-600">{error}</p>
                    </div>
                )}

                {wishlist && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4 text-center text-blue-600">Secure Wishlist</h1>
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg whitespace-pre-wrap">
                            {wishlist}
                        </div>
                        <p className="text-xs text-gray-400 mt-6 text-center">
                            This data was decrypted on your device. The server only stored ciphertext.
                        </p>
                    </div>
                )}

            </div>
        </main>
    );
}