// frontend/utils/crypto.ts

const buf2hex = (buffer: ArrayBuffer): string =>
    Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

const hex2buf = (hexString: string): Uint8Array => {
    if (!/^[0-9a-f]+$/i.test(hexString) || hexString.length % 2 !== 0) {
        throw new Error("Invalid hex string");
    }

    const match = hexString.match(/.{1,2}/g);
    if (!match) throw new Error("Invalid hex string");

    return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

export type EncryptedPayload = {
    iv: string;
    ciphertext: string;
};

export type ShareFragment = {
    keyString: string;
    publicKeyFingerprint: string;
};

export function parseShareFragment(fragment: string): ShareFragment {
    const cleaned = fragment.startsWith("#") ? fragment.substring(1) : fragment;
    const [keyString, publicKeyFingerprint] = cleaned.split(".");

    if (!keyString || !publicKeyFingerprint) {
        throw new Error("Invalid secure link. Missing key or public-key fingerprint.");
    }

    if (!/^[0-9a-f]{64}$/i.test(keyString)) {
        throw new Error("Invalid secure link. The decryption key is malformed.");
    }

    if (!/^[0-9a-f]{64}$/i.test(publicKeyFingerprint)) {
        throw new Error("Invalid secure link. The public-key fingerprint is malformed.");
    }

    return { keyString, publicKeyFingerprint };
}

export function buildSignedPayload(iv: string, ciphertext: string): string {
    // Stable canonical payload. The signature covers IV and ciphertext together.
    return JSON.stringify({ version: 1, iv, ciphertext });
}

export async function sha256Hex(input: ArrayBuffer | string): Promise<string> {
    const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    return buf2hex(digest);
}

export async function fingerprintPublicKey(publicKeyHex: string): Promise<string> {
    return sha256Hex(toArrayBuffer(hex2buf(publicKeyHex)));
}

export async function generateKeyString(): Promise<string> {
    const key = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    const exported = await window.crypto.subtle.exportKey("raw", key);
    return buf2hex(exported);
}

export async function encryptData(
    text: string,
    keyString: string
): Promise<EncryptedPayload> {
    const keyBuffer = toArrayBuffer(hex2buf(keyString));

    const key = await window.crypto.subtle.importKey(
        "raw",
        keyBuffer,
        "AES-GCM",
        false,
        ["encrypt"]
    );

    const encodedText = new TextEncoder().encode(text);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encodedText
    );

    return {
        iv: buf2hex(iv.buffer),
        ciphertext: buf2hex(encryptedBuffer),
    };
}

export async function decryptData(
    encryptedObj: EncryptedPayload,
    keyString: string
): Promise<string> {
    const keyBuffer = toArrayBuffer(hex2buf(keyString));
    const ivBuffer = toArrayBuffer(hex2buf(encryptedObj.iv));
    const ciphertextBuffer = toArrayBuffer(hex2buf(encryptedObj.ciphertext));

    const key = await window.crypto.subtle.importKey(
        "raw",
        keyBuffer,
        "AES-GCM",
        false,
        ["decrypt"]
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBuffer },
        key,
        ciphertextBuffer
    );

    return new TextDecoder().decode(decryptedBuffer);
}

export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
    return window.crypto.subtle.generateKey(
        {
            name: "RSA-PSS",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["sign", "verify"]
    ) as Promise<CryptoKeyPair>;
}

export async function signPayload(payload: string, privateKey: CryptoKey): Promise<string> {
    const dataBuffer = new TextEncoder().encode(payload);

    const signatureBuffer = await window.crypto.subtle.sign(
        { name: "RSA-PSS", saltLength: 32 },
        privateKey,
        dataBuffer
    );

    return buf2hex(signatureBuffer);
}

export async function verifySignature(
    payload: string,
    signatureHex: string,
    publicKeyHex: string
): Promise<boolean> {
    const signatureBuffer = toArrayBuffer(hex2buf(signatureHex));
    const dataBuffer = new TextEncoder().encode(payload);
    const publicKeySPKI = toArrayBuffer(hex2buf(publicKeyHex));

    const publicKey = await window.crypto.subtle.importKey(
        "spki",
        publicKeySPKI,
        { name: "RSA-PSS", hash: "SHA-256" },
        false,
        ["verify"]
    );

    return window.crypto.subtle.verify(
        { name: "RSA-PSS", saltLength: 32 },
        publicKey,
        signatureBuffer,
        dataBuffer
    );
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    return buf2hex(exported);
}
