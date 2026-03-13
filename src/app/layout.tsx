import { ClientProviders } from "@/components/ClientProviders";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Solby — Decentralized Video",
  description: "Upload and watch videos with your Solana wallet",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="blob-container">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>
        <ClientProviders>
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </div>
            }
          >
            {children}
          </Suspense>
        </ClientProviders>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
