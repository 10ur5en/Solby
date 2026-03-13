"use client";

import { Button } from "@/components/ui/button";
import { useFundAccount } from "@/hooks/useFundAccount";
import { shelbyClient } from "@/utils/shelbyClient";
import { useStorageAccount } from "@shelby-protocol/solana-kit/react";
import { useWalletConnection } from "@solana/react-hooks";
import { memo, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface StorageAccountManagerProps {
  onStorageAccountReady?: (address: string) => void;
  onAccountFunded?: () => void;
}

export const StorageAccountManager = memo(function StorageAccountManager({
  onStorageAccountReady,
  onAccountFunded,
}: StorageAccountManagerProps) {
  const { wallet, status } = useWalletConnection();
  const { fundAccount, isFunding } = useFundAccount();
  const [isFunded, setIsFunded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { storageAccountAddress } = useStorageAccount({
    client: shelbyClient as unknown as Parameters<typeof useStorageAccount>[0]["client"],
    wallet,
  });

  const connected = status === "connected";
  const storageAddressStr = storageAccountAddress?.toString() ?? null;

  useEffect(() => {
    if (storageAddressStr && connected) onStorageAccountReady?.(storageAddressStr);
  }, [storageAddressStr, connected, onStorageAccountReady]);

  useEffect(() => {
    setIsFunded(false);
  }, [storageAddressStr]);

  const handleFundAccount = useCallback(async () => {
    if (!storageAddressStr) return;
    try {
      setStatusMessage("Loading ShelbyUSD and APT...");
      await fundAccount(storageAddressStr);
      setIsFunded(true);
      setStatusMessage(null);
      toast.success("Account funded!");
      onAccountFunded?.();
    } catch (error) {
      setStatusMessage(null);
      toast.error(
        error instanceof Error ? error.message : "Funding failed"
      );
    }
  }, [storageAddressStr, fundAccount, onAccountFunded]);

  if (!connected) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/5 p-6 glass">
        <h3 className="mb-2 text-lg font-semibold text-white">
          Storage account
        </h3>
        <p className="text-sm text-white/70">
          Connect your Solana wallet to see the storage account.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/5 p-6 glass">
      <h3 className="mb-2 text-lg font-semibold text-white">
        Storage account
      </h3>
      <p className="mb-4 text-sm text-white/70">
        Shelby account derived from your wallet. Fund it to upload videos.
      </p>
      {storageAddressStr && (
        <div className="mb-4">
          <p className="text-xs text-white/60">Account address</p>
          <p className="break-all font-mono text-sm text-white">
            {storageAddressStr}
          </p>
          {isFunded && (
            <span className="mt-2 inline-block rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
              Funded
            </span>
          )}
        </div>
      )}
      {statusMessage && (
        <p className="mb-3 text-sm text-white/80">{statusMessage}</p>
      )}
      <Button
        onClick={handleFundAccount}
        disabled={isFunding || isFunded}
        variant="outline"
        className="border-[var(--poline-accent-5)] bg-white/5 text-white hover:bg-[var(--poline-accent-5)] hover:text-[var(--poline-surface-1)]"
      >
        {isFunding ? "Funding..." : isFunded ? "Funded" : "Fund account"}
      </Button>
    </div>
  );
});
