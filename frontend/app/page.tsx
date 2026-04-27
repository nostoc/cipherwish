"use client";

import { useState } from "react";
import { generateKeyString, encryptData } from "../utils/crypto";

export default function Home() {
  const [wishlist, setWishlist] = useState<string>("");
  const [shareLink, setShareLink] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  // NEW: State for the Burn After Reading toggle
  const [isEphemeral, setIsEphemeral] = useState<boolean>(false);

  const handleCreateLink = async () => {
    if (!wishlist.trim()) return alert("Please enter some items first!");
    setLoading(true);

    try {
      const keyString = await generateKeyString();
      const { iv, ciphertext } = await encryptData(wishlist, keyString);

      const response = await fetch("http://localhost:5000/api/wishlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // NEW: Send the isEphemeral flag to the backend
        body: JSON.stringify({ iv, ciphertext, isEphemeral }),
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
          Your list is encrypted in the browser. The server never sees your data.
        </p>

        <textarea
          className="w-full h-32 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          placeholder="Enter your wishlist items here..."
          value={wishlist}
          onChange={(e) => setWishlist(e.target.value)}
        />

        {/* NEW: The Burn After Reading Toggle UI */}
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
          {loading ? "Encrypting..." : "Encrypt & Generate Link"}
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