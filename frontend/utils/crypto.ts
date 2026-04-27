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

// --- ASYMMETRIC CRYPTOGRAPHY (RSA Digital Signatures) ---

// 4. Generate an RSA Key Pair for signing
export async function generateSigningKeyPair() {
    return await window.crypto.subtle.generateKey(
        {
            name: "RSASSA-PKCS1-v1_5",
            modulusLength: 2048, // Standard secure length
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true, // Extractable
        ["sign", "verify"]
    );
}

// 5. Sign the ciphertext using the Private Key
export async function signData(ciphertextHex: string, privateKey: CryptoKey): Promise<string> {
    const dataBuffer = new TextEncoder().encode(ciphertextHex);
    const signatureBuffer = await window.crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        privateKey,
        dataBuffer
    );
    return buf2hex(signatureBuffer); // Export as Hex string
}

// 6. Verify the signature using the Public Key
export async function verifySignature(
    ciphertextHex: string,
    signatureHex: string,
    publicKeyHex: string
): Promise<boolean> {
    // Convert the hex strings back to buffers
    const signatureBuffer = hex2buf(signatureHex);
    const dataBuffer = new TextEncoder().encode(ciphertextHex);
    const publicKeySPKI = hex2buf(publicKeyHex); // SPKI is the standard format for exporting public keys

    // Import the public key back into the Crypto API
    const publicKey = await window.crypto.subtle.importKey(
        "spki",
        publicKeySPKI,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
    );

    // Perform the mathematical verification
    return await window.crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        publicKey,
        signatureBuffer,
        dataBuffer
    );
}

// Helper: Export the RSA Public Key so the server can store it
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    return buf2hex(exported);
}