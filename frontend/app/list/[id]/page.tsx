"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { decryptData, verifySignature } from "../../../utils/crypto";

function CopyIcon({ copied }: { copied: boolean }) {
    if (copied) {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <path fill="currentColor" d="M9 16.2 4.8 12l-1.8 1.8L9 19.8 21 7.8 19.2 6 9 16.2Z" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
            <path
                fill="currentColor"
                d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z"
            />
        </svg>
    );
}

export default function ViewList() {
    const params = useParams();
    const id = params.id as string;

    const [wishlist, setWishlist] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [requiresPin, setRequiresPin] = useState<boolean>(false);
    const [pinInput, setPinInput] = useState<string>("");
    const [isVerified, setIsVerified] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);

    const fetchAndDecrypt = useCallback(
        async (providedPin?: string) => {
            setLoading(true);
            setError(null);
            setCopied(false);

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

                const signatureIsValid = await verifySignature(data.ciphertext, data.signature, data.publicKey);
                if (!signatureIsValid) {
                    throw new Error("Signature verification failed. The data may have been altered.");
                }

                setIsVerified(true);

                const decryptedText = await decryptData(data, keyString);
                setWishlist(decryptedText);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError("An unexpected error occurred.");
                }
            } finally {
                setLoading(false);
            }
        },
        [id]
    );

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchAndDecrypt();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [fetchAndDecrypt]);

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pinInput) return;
        fetchAndDecrypt(pinInput);
    };

    const handleCopyWishlist = async () => {
        if (!wishlist) return;

        try {
            await navigator.clipboard.writeText(wishlist);
            setCopied(true);
        } catch (clipboardError) {
            console.error("Clipboard error:", clipboardError);
            setError("The wishlist was decrypted successfully, but clipboard access was blocked.");
        }
    };

    return (
        <main className="app-shell flex-1 px-4 py-6 text-slate-950 sm:px-6 lg:px-10">
            <div className="mx-auto flex max-w-6xl flex-col gap-10">
                <header className="flex items-center justify-between py-4">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1f4fd1,#0f9b8e)] text-base font-extrabold text-white shadow-[0_12px_30px_rgba(31,79,209,0.35)]">
                            CW
                        </div>
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">CipherWish</p>
                            <p className="text-sm text-slate-600">Recipient access workspace</p>
                        </div>
                    </Link>
                    <div className="hidden rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm text-slate-600 shadow-[0_12px_28px_rgba(15,33,63,0.08)] backdrop-blur md:block">
                        Secure link ID: <span className="font-mono text-slate-800">{id.slice(0, 8)}...</span>
                    </div>
                </header>

                <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
                    <div className="surface-panel rounded-4xl p-6 sm:p-8">
                        <div className="eyebrow">Recipient view</div>
                        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                            Verify first, then decrypt.
                        </h1>
                        <p className="mt-4 text-sm leading-7 text-slate-600">
                            The page keeps the security flow simple: verify the signature, handle the PIN if needed, and decrypt in
                            the browser.
                        </p>

                        <div className="mt-6 space-y-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
                            <p>RSA signature verification before decryption.</p>
                            <p>AES-GCM decrypts the content locally.</p>
                            <p>Optional Vault PIN if the sender enabled one.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {loading && (
                            <div className="surface-panel rounded-4xl p-6 sm:p-8">
                                <div className="eyebrow">Verification in progress</div>
                                <h2 className="mt-5 text-3xl font-bold text-slate-950">Opening the secure wishlist</h2>
                                <div className="mt-6 space-y-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
                                    <p>Loading encrypted payload.</p>
                                    <p>Checking signature integrity.</p>
                                    <p>Preparing local decryption.</p>
                                </div>
                            </div>
                        )}

                        {requiresPin && !loading && !wishlist && (
                            <form onSubmit={handlePinSubmit} className="surface-panel rounded-4xl p-6 sm:p-8">
                                <div className="eyebrow">Protected access</div>
                                <h2 className="mt-5 text-3xl font-bold text-slate-950">Vault locked</h2>
                                <p className="mt-4 text-sm leading-7 text-slate-600">Enter the Vault PIN to continue.</p>

                                <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                                    <label className="mb-3 block text-sm font-semibold text-slate-800">Vault PIN</label>
                                    <input
                                        type="password"
                                        placeholder="Enter PIN"
                                        value={pinInput}
                                        onChange={(e) => setPinInput(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center text-lg tracking-[0.35em] text-slate-900 outline-none placeholder:tracking-normal placeholder:text-slate-400 focus:border-(--primary) focus:shadow-[0_0_0_4px_rgba(31,79,209,0.08)]"
                                        autoFocus
                                    />
                                    {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
                                </div>

                                <button
                                    type="submit"
                                    className="mt-5 w-full rounded-2xl bg-[linear-gradient(135deg,#122033,#1f4fd1)] px-5 py-4 text-sm font-bold text-white shadow-[0_18px_40px_rgba(18,32,51,0.26)] hover:-translate-y-0.5"
                                >
                                    Unlock and decrypt
                                </button>
                            </form>
                        )}

                        {error && !requiresPin && !loading && (
                            <div className="surface-panel rounded-4xl p-6 sm:p-8 text-center">
                                <div className="eyebrow">Access blocked</div>
                                <h2 className="mt-5 text-3xl font-bold text-rose-700">Unable to open this secure wishlist</h2>
                                <p className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-7 text-rose-700">
                                    {error}
                                </p>
                                <Link
                                    href="/"
                                    className="mt-6 inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                                >
                                    Return to CipherWish home
                                </Link>
                            </div>
                        )}

                        {wishlist && (
                            <div className="glass-panel rounded-4xl p-6 sm:p-8">
                                <div className="flex flex-col gap-4 border-b border-white/60 pb-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Decrypted content</p>
                                        <h2 className="mt-2 text-2xl font-bold text-slate-950">Recipient view</h2>
                                    </div>
                                    {isVerified && (
                                        <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                                            RSA verified
                                        </span>
                                    )}
                                </div>

                                <div className="mt-5 rounded-3xl border border-slate-200 bg-white px-4 py-4">
                                    <div className="max-h-96 overflow-auto whitespace-pre-wrap text-[15px] leading-7 text-slate-800">
                                        {wishlist}
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        onClick={handleCopyWishlist}
                                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1f4fd1,#163a9a)] px-4 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 sm:w-12 sm:px-0"
                                        aria-label={copied ? "Copied wishlist" : "Copy wishlist"}
                                        title={copied ? "Copied" : "Copy wishlist"}
                                    >
                                        <CopyIcon copied={copied} />
                                        <span className="sm:hidden">{copied ? "Copied" : "Copy"}</span>
                                    </button>
                                    <Link
                                        href="/"
                                        className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800 hover:bg-slate-50"
                                    >
                                        Create another secure list
                                    </Link>
                                </div>

                                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-600">
                                    Integrity checks and decryption ran on this device using the link fragment key.
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}