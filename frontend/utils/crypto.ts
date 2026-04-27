// Helper: Convert raw bytes (ArrayBuffer) to a Hexadecimal string (URL safe)
const buf2hex = (buffer: ArrayBuffer): string => {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

// Helper: Convert a Hexadecimal string back to raw bytes (Uint8Array)
const hex2buf = (hexString: string): Uint8Array => {
    const match = hexString.match(/.{1,2}/g);
    if (!match) throw new Error("Invalid hex string");
    return new Uint8Array(match.map(byte => parseInt(byte, 16)));
};

// 1. Generate a Key and Export it as a Hex string for the URL
export async function generateKeyString(): Promise<string> {
    const key = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    const exported = await window.crypto.subtle.exportKey("raw", key);
    return buf2hex(exported);
}

// 2. Encrypt the Wishlist Data
export async function encryptData(text: string, keyString: string): Promise<{ iv: string, ciphertext: string }> {
    const keyBuffer = hex2buf(keyString);
    const key = await window.crypto.subtle.importKey(
        "raw", keyBuffer, "AES-GCM", false, ["encrypt"]
    );

    const encodedText = new TextEncoder().encode(text);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encodedText
    );

    return {
        iv: buf2hex(iv.buffer),
        ciphertext: buf2hex(encryptedBuffer)
    };
}

// 3. Decrypt the Wishlist Data
export async function decryptData(
    encryptedObj: { iv: string; ciphertext: string },
    keyString: string
): Promise<string> {
    try {
        // Convert the Hex strings back to raw bytes
        const keyBuffer = hex2buf(keyString);
        const ivBuffer = hex2buf(encryptedObj.iv);
        const ciphertextBuffer = hex2buf(encryptedObj.ciphertext);

        // Import the key back into the Web Crypto API
        const key = await window.crypto.subtle.importKey(
            "raw", keyBuffer, "AES-GCM", false, ["decrypt"]
        );

        // Perform the decryption
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivBuffer },
            key,
            ciphertextBuffer
        );

        // Convert the raw bytes back into readable text
        return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
        console.error("Decryption failed:", error);
        throw new Error("Decryption failed. The link might be invalid or the data was tampered with.");
    }
}