"use client";

import { useActiveWalletChain } from "@/context/ActiveWalletChainContext";
import { useStorageAccount } from "@shelby-protocol/solana-kit/react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useWalletConnection } from "@solana/react-hooks";
import { useCallback, useMemo, useEffect } from "react";
import { shelbyClient } from "@/utils/shelbyClient";
import type { WalletChain } from "@/context/ActiveWalletChainContext";

/** Signer used for Shelby useUploadBlobs / blob operations (Solana or Aptos). */
export type ShelbySigner = {
  account: unknown;
  signAndSubmitTransaction: (params: { data: unknown; options?: unknown }) => Promise<{ hash: string }>;
};

export type UnifiedWalletStatus =
  | "disconnected"
  | "connecting"
  | "connected";

export function useUnifiedWallet(): {
  chain: WalletChain | null;
  walletAddress: string | null;
  storageAccountAddress: string | null;
  status: UnifiedWalletStatus;
  isConnecting: boolean;
  solanaConnectors: { id: string; name: string }[];
  aptosWallets: { name: string; icon?: string; url?: string }[];
  connectSolana: (connectorId: string) => void;
  connectAptos: (walletName: string) => void;
  disconnect: () => void;
  /** Solana wallet ref for useStorageAccount when chain is solana */
  solanaWallet: unknown;
  /** Signer to use for Shelby blob upload / profile (Solana or Aptos). */
  shelbySigner: ShelbySigner | null;
  /** True when upload/profile sign is available (Solana or Aptos) */
  canSign: boolean;
} {
  const { chain, setChain } = useActiveWalletChain();
  const {
    connectors,
    connect: connectSolanaFn,
    disconnect: disconnectSolana,
    wallet: solanaWallet,
    status: solanaStatus,
  } = useWalletConnection();

  const {
    account: aptosAccount,
    connect: connectAptosFn,
    disconnect: disconnectAptos,
    connected: aptosConnected,
    wallets: aptosWalletsList,
    signAndSubmitTransaction: aptosSignAndSubmit,
  } = useWallet();

  const { storageAccountAddress: solanaStorageAddress, signAndSubmitTransaction: solanaSignAndSubmit } = useStorageAccount({
    client: shelbyClient as unknown as Parameters<typeof useStorageAccount>[0]["client"],
    wallet: solanaWallet,
  });

  const isSolanaConnected = solanaStatus === "connected";
  const isAptosConnected = aptosConnected && !!aptosAccount;

  const walletAddress = (() => {
    if (chain === "solana" && isSolanaConnected && solanaWallet?.account?.address) {
      return solanaWallet.account.address.toString();
    }
    if (chain === "aptos" && isAptosConnected && aptosAccount?.address) {
      return aptosAccount.address.toString();
    }
    return null;
  })();

  const storageAccountAddress = (() => {
    if (chain === "solana") {
      return solanaStorageAddress?.toString() ?? null;
    }
    if (chain === "aptos" && isAptosConnected && aptosAccount?.address) {
      return aptosAccount.address.toString();
    }
    return null;
  })();

  const shelbySigner = useMemo((): ShelbySigner | null => {
    if (isSolanaConnected && solanaStorageAddress && solanaSignAndSubmit) {
      const accountStr = solanaStorageAddress.toString();
      return {
        account: accountStr,
        signAndSubmitTransaction: solanaSignAndSubmit as ShelbySigner["signAndSubmitTransaction"],
      };
    }
    if (isAptosConnected && aptosAccount?.address && aptosSignAndSubmit) {
      return {
        account: aptosAccount.address as ShelbySigner["account"],
        signAndSubmitTransaction: (params: { data: unknown; options?: unknown }) =>
          aptosSignAndSubmit(params as Parameters<typeof aptosSignAndSubmit>[0]).then((out) => ({ hash: out.hash })),
      };
    }
    return null;
  }, [
    isSolanaConnected,
    solanaStorageAddress,
    solanaSignAndSubmit,
    isAptosConnected,
    aptosAccount?.address,
    aptosSignAndSubmit,
  ]);

  const status: UnifiedWalletStatus =
    isSolanaConnected || isAptosConnected
      ? "connected"
      : solanaStatus === "connecting"
        ? "connecting"
        : "disconnected";

  const isConnecting = solanaStatus === "connecting";

  const connectSolana = useCallback(
    (connectorId: string) => {
      setChain("solana");
      connectSolanaFn(connectorId);
    },
    [connectSolanaFn, setChain]
  );

  const connectAptos = useCallback(
    (walletName: string) => {
      setChain("aptos");
      connectAptosFn(walletName);
    },
    [connectAptosFn, setChain]
  );

  const disconnect = useCallback(() => {
    if (chain === "solana") {
      disconnectSolana();
    } else if (chain === "aptos") {
      disconnectAptos();
    }
    setChain(null);
  }, [chain, disconnectSolana, disconnectAptos, setChain]);

  useEffect(() => {
    if (isSolanaConnected && chain !== "solana") setChain("solana");
    if (isAptosConnected && !isSolanaConnected && chain !== "aptos") setChain("aptos");
  }, [isSolanaConnected, isAptosConnected, chain, setChain]);

  useEffect(() => {
    if (!isSolanaConnected && !isAptosConnected) setChain(null);
  }, [isSolanaConnected, isAptosConnected, setChain]);

  const solanaConnectors = connectors.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const aptosWallets = aptosWalletsList.map((w) => ({
    name: "name" in w && typeof w.name === "string" ? w.name : "Unknown",
    icon: "icon" in w ? (w as { icon?: string }).icon : undefined,
    url: "url" in w ? (w as { url?: string }).url : undefined,
  }));

  const canSign = !!shelbySigner;

  return {
    chain,
    walletAddress,
    storageAccountAddress,
    status,
    isConnecting,
    solanaConnectors,
    aptosWallets,
    connectSolana,
    connectAptos,
    disconnect,
    solanaWallet,
    shelbySigner,
    canSign,
  };
}
