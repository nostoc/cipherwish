"use client";

import { useState } from "react";
import {
  generateKeyString,
  encryptData,
  generateSigningKeyPair,
  signData,
  exportPublicKey
} from "../utils/crypto";

export default function Home() {
  const [wishlist, setWishlist] = useState<string>("");
  const [shareLink, setShareLink] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isEphemeral, setIsEphemeral] = useState<boolean>(false);
  const [pin, setPin] = useState<string>("");

  const handleCreateLink = async () => {
    if (!wishlist.trim()) return alert("Please enter some items first!");
    setLoading(true);

    try {
      // 1. Symmetric Encryption (AES)
      const keyString = await generateKeyString();
      const { iv, ciphertext } = await encryptData(wishlist, keyString);

      // 2. Asymmetric Digital Signatures (RSA)
      const rsaKeyPair = await generateSigningKeyPair();
      const signature = await signData(ciphertext, rsaKeyPair.privateKey);
      const publicKey = await exportPublicKey(rsaKeyPair.publicKey);

      // 3. Send to Untrusted Server
      const response = await fetch("http://localhost:5000/api/wishlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iv, ciphertext, isEphemeral, pin, publicKey, signature }),
      });

      if (!response.ok) throw new Error("Server rejected the request");

      const data = await response.json();
      const link = `${window.location.origin}/list/${data.id}#${keyString}`;
      setShareLink(link);

    } catch (error) {
      console.error("Encryption or network error:", error);
      alert("Failed to create secure link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-black">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold mb-2 text-center">Create Secure Wishlist</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Secured with AES-256 and RSA Digital Signatures.
        </p>

        <textarea
          className="w-full h-32 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          placeholder="Enter your wishlist items here..."
          value={wishlist}
          onChange={(e) => setWishlist(e.target.value)}
        />

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Vault PIN (Optional) 🔒
          </label>
          <input
            type="password"
            maxLength={10}
            placeholder="e.g., 1234"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <label className="flex items-center space-x-3 mb-6 cursor-pointer bg-red-50 p-3 rounded border border-red-100 hover:bg-red-100 transition">
          <input
            type="checkbox"
            checked={isEphemeral}
            onChange={(e) => setIsEphemeral(e.target.checked)}
            className="w-5 h-5 text-red-600 rounded border-red-300 focus:ring-red-500 cursor-pointer"
          />
          <div>
            <p className="text-sm font-semibold text-red-800">Burn After Reading 🧨</p>
            <p className="text-xs text-red-600">The list will self-destruct after being viewed once.</p>
          </div>
        </label>

        <button
          onClick={handleCreateLink}
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
        >
          {loading ? "Securing & Signing..." : "Encrypt, Sign & Generate Link"}
        </button>

        {shareLink && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800 font-medium mb-2">Success! Share this private link:</p>
            <input
              readOnly
              value={shareLink}
              className="w-full p-2 text-sm bg-white border border-green-300 rounded mb-2 outline-none"
              onClick={(e) => e.currentTarget.select()}
            />
          </div>
        )}
      </div>
    </main>
  );
}