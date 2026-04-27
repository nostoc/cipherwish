"use client";

import { useState } from "react";
import {
    encryptData,
    exportPublicKey,
    generateKeyString,
    generateSigningKeyPair,
    signData,
} from "../utils/crypto";

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

export default function Home() {
    const [wishlist, setWishlist] = useState<string>("");
    const [shareLink, setShareLink] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [isEphemeral, setIsEphemeral] = useState<boolean>(false);
    const [pin, setPin] = useState<string>("");
    const [formError, setFormError] = useState<string>("");
    const [copied, setCopied] = useState<boolean>(false);

    const wishCount = wishlist
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean).length;

    const handleCreateLink = async () => {
        if (!wishlist.trim()) {
            setFormError("Add at least one wishlist item before generating a secure link.");
            return;
        }

        setFormError("");
        setLoading(true);
        setCopied(false);

        try {
            const keyString = await generateKeyString();
            const { iv, ciphertext } = await encryptData(wishlist, keyString);

            const rsaKeyPair = await generateSigningKeyPair();
            const signature = await signData(ciphertext, rsaKeyPair.privateKey);
            const publicKey = await exportPublicKey(rsaKeyPair.publicKey);

            const response = await fetch("http://localhost:5000/api/wishlists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ iv, ciphertext, isEphemeral, pin, publicKey, signature }),
            });

            if (!response.ok) throw new Error("Server rejected the request");

            const data = await response.json();
            const link = `${window.location.origin}/list/${data.id}#${keyString}`;

            setShareLink(link);
            setWishlist("");
            setPin("");
            setIsEphemeral(false);
        } catch (error) {
            console.error("Encryption or network error:", error);
            setFormError("We couldn’t generate the secure link. Check that the backend is running and try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = async () => {
        if (!shareLink) return;

        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
        } catch (error) {
            console.error("Clipboard error:", error);
            setFormError("The link is ready, but clipboard access was blocked by the browser.");
        }
    };

    return (
        <main className="app-shell flex-1 px-4 py-6 text-slate-950 sm:px-6 lg:px-10">
            <div className="mx-auto flex max-w-6xl flex-col gap-10">
                <header className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1f4fd1,#0f9b8e)] text-base font-extrabold text-white shadow-[0_12px_30px_rgba(31,79,209,0.35)]">
                            CW
                        </div>
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">CipherWish</p>
                            <p className="text-sm text-slate-600">Secure zero-knowledge wishlist sharing</p>
                        </div>
                    </div>
                    <div className="hidden items-center gap-3 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm text-slate-600 shadow-[0_12px_28px_rgba(15,33,63,0.08)] backdrop-blur md:flex">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Client-side encryption active
                    </div>
                </header>

                <section className="grid gap-8 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-10">
                    <div className="space-y-6">
                        <div className="eyebrow">Information security project</div>
                        <h1 className="max-w-2xl text-balance text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                            CipherWish: Zero-Knowledge Wishlist Sharing
                        </h1>
                        <p className="max-w-2xl text-lg leading-8 text-slate-600">
                            CipherWish encrypts in the browser, verifies the payload, and keeps the decryption key in the link
                            fragment so the server only stores ciphertext.
                        </p>

                        <div className="space-y-3 rounded-4xl border border-slate-200 bg-white/75 p-5">
                            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Security essentials</p>
                            <div className="space-y-2 text-sm leading-7 text-slate-600">
                                <p>Client-side AES-GCM encryption.</p>
                                <p>RSA signature verification before decryption.</p>
                                <p>Optional Vault PIN and burn-after-reading.</p>
                            </div>
                        </div>
                    </div>

                    <div className="surface-panel rounded-4xl p-6 sm:p-8">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
                            <div>
                                <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Secure composer</p>
                                <h2 className="mt-2 text-2xl font-bold text-slate-950">Create a protected wishlist</h2>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Items</p>
                                <p className="mt-1 text-2xl font-extrabold text-slate-950">{wishCount}</p>
                            </div>
                        </div>

                        <form
                            className="mt-6 space-y-5"
                            onSubmit={(e) => {
                                e.preventDefault();
                                void handleCreateLink();
                            }}
                        >
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-800">Wishlist content</label>
                                <textarea
                                    className="min-h-56 w-full rounded-3xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-[15px] leading-7 text-slate-900 outline-none placeholder:text-slate-400 focus:border-(--primary) focus:bg-white focus:shadow-[0_0_0_4px_rgba(31,79,209,0.08)]"
                                    placeholder={"Leather Notebook\nSoundcore Headphones\nBlack cat\nMac mini M4 Pro\n..."}
                                    value={wishlist}
                                    onChange={(e) => setWishlist(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-800">Vault PIN</label>
                                    <input
                                        type="password"
                                        maxLength={10}
                                        placeholder="Optional extra protection"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-(--primary) focus:shadow-[0_0_0_4px_rgba(31,79,209,0.08)]"
                                    />
                                    <p className="mt-2 text-xs leading-5 text-slate-500">Leave blank for link-only access.</p>
                                </div>

                            </div>

                            <label className="flex cursor-pointer items-start gap-4 rounded-3xl border border-amber-200 bg-amber-50/80 p-4">
                                <input
                                    type="checkbox"
                                    checked={isEphemeral}
                                    onChange={(e) => setIsEphemeral(e.target.checked)}
                                    className="mt-1 h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-amber-900">Burn after reading</p>
                                    <p className="mt-1 text-sm leading-6 text-amber-800/80">
                                        Delete the encrypted record after the first successful view.
                                    </p>
                                </div>
                            </label>

                            {formError && (
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                    {formError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-2xl bg-[linear-gradient(135deg,#1f4fd1,#163a9a)] px-5 py-4 text-sm font-bold text-white shadow-[0_18px_40px_rgba(31,79,209,0.35)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(31,79,209,0.4)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? "Encrypting, signing, and generating link..." : "Generate secure share link"}
                            </button>
                        </form>
                    </div>
                </section>

                {shareLink && (
                    <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                        <div className="surface-panel rounded-4xl p-6 sm:p-8">
                            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Secure link ready</p>
                            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Share the link</h2>
                            <p className="mt-4 text-sm leading-7 text-slate-600">The decryption key stays in the URL fragment.</p>
                        </div>

                        <div className="glass-panel rounded-4xl p-6 sm:p-8">
                            <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-emerald-800">Share link</p>
                            <div className="mt-4 rounded-3xl border border-emerald-200 bg-white p-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                                    <input
                                        readOnly
                                        value={shareLink}
                                        className="min-w-0 flex-1 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 font-mono text-xs text-slate-700 outline-none"
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopyLink}
                                        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                                        aria-label={copied ? "Copied secure link" : "Copy secure link"}
                                        title={copied ? "Copied" : "Copy secure link"}
                                    >
                                        <CopyIcon copied={copied} />
                                    </button>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                                    <span aria-live="polite">{copied ? "Copied to clipboard." : "Click the icon to copy the link."}</span>
                                    <span className="font-semibold uppercase tracking-[0.12em] text-emerald-700">Secure share</span>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                <a
                                    href={shareLink}
                                    className="flex-1 rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-center text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
                                >
                                    Preview recipient view
                                </a>
                            </div>

                            <p className="mt-4 text-xs leading-6 text-slate-500">
                                The recipient can verify the signature and decrypt locally in the browser.
                            </p>
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}