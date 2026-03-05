"use client";

import { useFundedStorage } from "@/context/FundedStorageContext";
import { useUploadModal } from "@/context/UploadModalContext";
import { useFundAccount } from "@/hooks/useFundAccount";
import { formatBalanceRaw, useStorageBalance } from "@/hooks/useStorageBalance";
import { useUnifiedWallet } from "@/hooks/useUnifiedWallet";
import { Button } from "@/components/ui/button";
import { VideoUploader } from "@/components/VideoUploader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { WalletChain } from "@/context/ActiveWalletChainContext";

function formatAddress(address?: string) {
  if (!address) return "Not connected";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export const Header = memo(function Header() {
  const {
    chain,
    walletAddress,
    storageAccountAddress: storageAddressStr,
    status,
    isConnecting,
    solanaConnectors,
    aptosWallets,
    connectSolana,
    connectAptos,
    disconnect,
  } = useUnifiedWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalChainChoice, setModalChainChoice] = useState<WalletChain | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { fundAccount, isFunding, error: fundError } = useFundAccount();
  const { isFunded, markFunded } = useFundedStorage();
  const {
    balance: balanceStr,
    apt: aptRaw,
    shelbyUsd: shelbyUsdRaw,
    error: balanceError,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useStorageBalance(storageAddressStr);
  const hasBalance =
    balanceStr != null && balanceStr !== "" && BigInt(balanceStr) > 0n;
  const aptFormatted = aptRaw != null ? formatBalanceRaw(aptRaw) : null;
  const shelbyUsdFormatted = shelbyUsdRaw != null ? formatBalanceRaw(shelbyUsdRaw) : null;
  const storageIsFunded = isFunded(storageAddressStr) || hasBalance;
  const fundedStorageAddress = storageIsFunded ? storageAddressStr : null;
  const { isOpen: isUploadOpen, openUpload, closeUpload } = useUploadModal();

  const handleUploadComplete = useCallback(() => {
    closeUpload();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("shelby-upload-complete"));
    }
  }, [closeUpload]);

  useEffect(() => {
    if (hasBalance && storageAddressStr) markFunded(storageAddressStr);
  }, [hasBalance, storageAddressStr, markFunded]);

  const handleFundAccount = useCallback(async () => {
    if (!storageAddressStr) return;
    try {
      await fundAccount(storageAddressStr);
      markFunded(storageAddressStr);
      toast.success("Account funded!");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : String(error);
      toast.error(msg || "Funding failed");
    }
  }, [storageAddressStr, fundAccount, markFunded]);

  useEffect(() => {
    if (status === "connected") {
      setIsModalOpen(false);
      setModalChainChoice(null);
    }
  }, [status]);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setIsMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const buttonLabel =
    status === "connected"
      ? `${chain === "aptos" ? "Aptos" : "Solana"}: ${formatAddress(walletAddress ?? undefined)}`
      : isConnecting
        ? "Connecting..."
        : "Connect wallet";

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (q) router.push(`/?search=${encodeURIComponent(q)}`);
      else router.push("/");
    },
    [searchQuery, router]
  );

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur-sm">
      <div className="grid h-14 w-full grid-cols-3 items-center gap-4 px-4">
        <div className="flex min-w-0 justify-start">
          <Link
            href="/"
            className="flex shrink-0 items-center bg-transparent text-white hover:opacity-90"
          >
            <img
              src="/logo.png"
              alt="Solby"
              className="h-11 w-auto max-w-[180px] object-contain bg-transparent sm:h-12 sm:max-w-[200px]"
            />
          </Link>
        </div>

        <div className="flex min-w-0 justify-center">
          <form
            onSubmit={handleSearchSubmit}
            className="hidden w-full max-w-xl md:block"
          >
            <div className="flex w-full items-center rounded-full border border-white/20 bg-[#272727] px-4 py-1.5">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
                aria-label="Search videos"
              />
              <button
                type="submit"
                className="shrink-0 text-white/60 hover:text-white"
                aria-label="Search"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => {
              if (status !== "connected") {
                setIsModalOpen(true);
                return;
              }
              if (fundedStorageAddress) openUpload();
              else toast.error("Fund your storage account first.");
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white"
            title="Upload video"
            aria-label="Upload video"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {status === "connected" && (
            <Link
              href="/profile"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white"
              title="Profile"
              aria-label="Profile"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          )}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() =>
                status === "connected"
                  ? setIsMenuOpen((v) => !v)
                  : setIsModalOpen(true)
              }
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#272727] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#3f3f3f]"
            >
              {buttonLabel}
            </button>

          {isMenuOpen && status === "connected" && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/20 bg-[var(--poline-surface-2)] py-2 shadow-xl">
              <div className="border-b border-white/10 px-4 py-2">
                <p className="text-xs text-white/60">Wallet</p>
                <p className="truncate font-mono text-sm">
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-5)}
                </p>
                <button
                  type="button"
                  onClick={() => walletAddress && navigator.clipboard.writeText(walletAddress)}
                  className="mt-1 text-xs text-white/60 hover:text-white"
                >
                  Copy
                </button>
              </div>
              <div className="border-b border-white/10 px-4 py-2">
                <p className="text-xs text-white/60">Storage account (Shelbynet)</p>
                {storageAddressStr && (
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(storageAddressStr)}
                    className="mt-0.5 text-left text-[10px] text-white/50 hover:text-white/80"
                    title="Copy address"
                  >
                    {storageAddressStr.slice(0, 6)}…{storageAddressStr.slice(-6)}
                  </button>
                )}
                <p className="mt-1 text-xs text-white/70">
                  {balanceLoading ? (
                    "Balance: …"
                  ) : storageIsFunded && (aptFormatted != null || shelbyUsdFormatted != null) ? (
                    <>
                      {aptFormatted != null && (
                        <span className="block">APT: {aptFormatted}</span>
                      )}
                      {shelbyUsdFormatted != null && (
                        <span className="block">ShelbyUSD: {shelbyUsdFormatted}</span>
                      )}
                    </>
                  ) : storageIsFunded ? (
                    "Funded"
                  ) : (
                    "Balance: None"
                  )}
                </p>
                {balanceError && (
                  <p className="mt-0.5 max-w-[200px] truncate text-[10px] text-amber-400" title={balanceError}>
                    {balanceError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => refetchBalance()}
                  className="mt-0.5 text-xs text-white/50 hover:text-white/80"
                >
                  Refresh balance
                </button>
                <div className="mt-2 flex flex-col gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleFundAccount}
                    disabled={isFunding || storageIsFunded}
                    className="h-8 border-white/20 bg-white/5 text-xs text-white hover:bg-white/10"
                  >
                    {isFunding ? "Funding..." : storageIsFunded ? "Funded" : "Fund account"}
                  </Button>
                  {fundError && (
                    <p className="text-xs text-red-400" title={fundError}>
                      {fundError.length > 60 ? `${fundError.slice(0, 60)}…` : fundError}
                      {fundError.includes("fetch") && (
                        <span className="block mt-1 text-white/60">
                          Check API key and Geomi approved URL.
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  disconnect();
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5 hover:text-red-300"
              >
                Disconnect
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </header>

      {isUploadOpen && (
        <div
          className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-y-auto bg-black/80 p-4"
          onClick={closeUpload}
          onKeyDown={(e) => e.key === "Escape" && closeUpload()}
          role="dialog"
          aria-label="Upload video"
        >
          <div
            className="my-8 w-full max-w-lg shrink-0 rounded-2xl border border-white/20 bg-[#212121] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Upload video</h2>
              <button
                type="button"
                onClick={closeUpload}
                className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <VideoUploader
              fundedStorageAddress={fundedStorageAddress}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </div>
      )}

      {isModalOpen && status !== "connected" && (
        <div
          className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto bg-black/60 p-4"
          onClick={() => {
            setIsModalOpen(false);
            setModalChainChoice(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsModalOpen(false);
              setModalChainChoice(null);
            }
          }}
          role="dialog"
          aria-label="Choose wallet"
        >
          <div
            className="glass my-8 w-full max-w-md shrink-0 rounded-2xl border border-white/20 p-6"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {modalChainChoice ? "Choose wallet" : "Connect wallet"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setModalChainChoice(null);
                }}
                className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {!modalChainChoice ? (
              <>
                <p className="mb-4 text-sm text-white/70">
                  Connect with Solana or Aptos to use Shelbynet. Video upload and profile work with both.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setModalChainChoice("solana")}
                    className="flex items-center justify-between rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-6 w-6 rounded-full bg-[#9945FF]/20" title="Solana" />
                      Solana
                    </span>
                    <span className="text-white/60">Phantom, Solflare, etc.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalChainChoice("aptos")}
                    className="flex items-center justify-between rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-6 w-6 rounded-full bg-[#3FB8AF]/20" title="Aptos" />
                      Aptos
                    </span>
                    <span className="text-white/60">Petra, Martian, etc.</span>
                  </button>
                </div>
              </>
            ) : modalChainChoice === "solana" ? (
              <>
                <p className="mb-4 text-sm text-white/70">
                  Connect your Solana wallet to upload videos and use all features.
                </p>
                <button
                  type="button"
                  onClick={() => setModalChainChoice(null)}
                  className="mb-2 text-xs text-white/50 hover:text-white/80"
                >
                  ← Back
                </button>
                <div className="flex flex-col gap-2">
                  {solanaConnectors.map((connector) => (
                    <button
                      key={connector.id}
                      type="button"
                      onClick={() => connectSolana(connector.id)}
                      disabled={isConnecting}
                      className="flex items-center justify-between rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
                    >
                      <span>{connector.name}</span>
                      <span className="text-white/60">
                        {isConnecting ? "Connecting..." : "Connect"}
                      </span>
                    </button>
                  ))}
                </div>
                {solanaConnectors.length === 0 && (
                  <p className="mt-4 text-sm text-white/60">
                    No wallet found. Install a Solana wallet extension (Phantom, Solflare, etc.).
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mb-4 text-sm text-white/70">
                  Connect your Aptos wallet to upload videos and edit profile.
                </p>
                <button
                  type="button"
                  onClick={() => setModalChainChoice(null)}
                  className="mb-2 text-xs text-white/50 hover:text-white/80"
                >
                  ← Back
                </button>
                <div className="flex flex-col gap-2">
                  {aptosWallets.map((w) => (
                    <button
                      key={w.name}
                      type="button"
                      onClick={() => connectAptos(w.name)}
                      className="flex items-center justify-between rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      <span>{w.name}</span>
                      <span className="text-white/60">Connect</span>
                    </button>
                  ))}
                </div>
                {aptosWallets.length === 0 && (
                  <p className="mt-4 text-sm text-white/60">
                    No Aptos wallet found. Install Petra, Martian, or Fewcha.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
});
