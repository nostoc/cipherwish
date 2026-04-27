import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CipherWish | Secure Zero-Knowledge Wishlist Sharing",
  description:
    "Create encrypted wishlists, protect them with an optional PIN, and share them through zero-knowledge links.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex min-h-screen flex-col">
          {children}
          <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 text-slate-100">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
              <p className="text-sm font-semibold text-slate-100">© 2026 CipherWish. All rights reserved.</p>

              <nav aria-label="Footer" className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-300">
                <a
                  href="https://github.com/nostoc/cipherwish.git"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 hover:text-white"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-white">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                      <path d="M12 .5A12 12 0 0 0 8.2 23.9c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.5-1.2-1.2-1.6-1.2-1.6-1-.8.1-.8.1-.8 1.1.1 1.7 1.2 1.7 1.2 1 .1 1.6.8 1.6.8.9 1.6 2.4 1.1 3 .8.1-.7.4-1.1.7-1.4-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.9 1.2 2 1.2 3.2 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
                    </svg>
                  </span>
                  <span>Source on GitHub</span>
                </a>

                <span aria-hidden="true" className="text-slate-600">|</span>

                <a
                  href="https://github.com/nostoc/cipherwish/blob/main/README.md"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full px-2 py-1.5 hover:text-white"
                >
                  README
                </a>

                <span aria-hidden="true" className="text-slate-600">|</span>

                <a
                  href="https://github.com/nostoc/cipherwish/blob/main/LICENSE"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full px-2 py-1.5 hover:text-white"
                >
                  License
                </a>

                <span aria-hidden="true" className="text-slate-600">|</span>

                <a
                  href="https://github.com/nostoc/cipherwish/wiki"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full px-2 py-1.5 hover:text-white"
                >
                  Wiki
                </a>
              </nav>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
