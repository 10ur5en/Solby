"use client";

import { CategoryThemeProvider } from "@/components/CategoryThemeProvider";
import { FundedStorageProvider } from "@/context/FundedStorageContext";
import { UploadModalProvider } from "@/context/UploadModalContext";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const WalletProvider = dynamic(
  () =>
    import("@/components/WalletProvider").then((mod) => ({
      default: mod.WalletProvider,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    ),
  }
);

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <FundedStorageProvider>
        <UploadModalProvider>{children}</UploadModalProvider>
      </FundedStorageProvider>
    </WalletProvider>
  );
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <CategoryThemeProvider>
        <Providers>{children}</Providers>
      </CategoryThemeProvider>
    </Suspense>
  );
}
