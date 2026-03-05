"use client";

import { ActiveWalletChainProvider } from "@/context/ActiveWalletChainContext";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { autoDiscover, createClient } from "@solana/client";
import { SolanaProvider } from "@solana/react-hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const isSolanaWallet = (wallet: { features: Record<string, unknown> }) =>
  Object.keys(wallet.features).some((f) => f.startsWith("solana:"));

const client = createClient({
  endpoint:
    process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com",
  walletConnectors: autoDiscover({ filter: isSolanaWallet }),
});

const queryClient = new QueryClient();

const aptosNetwork =
  process.env.NEXT_PUBLIC_APTOS_NETWORK === "mainnet"
    ? Network.MAINNET
    : Network.TESTNET;

export function WalletProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <QueryClientProvider client={queryClient}>
      <SolanaProvider client={client}>
        <AptosWalletAdapterProvider
          autoConnect={false}
          dappConfig={{
            network: aptosNetwork,
            ...(process.env.NEXT_PUBLIC_APTOS_API_KEY && {
              aptosApiKeys: { [aptosNetwork]: process.env.NEXT_PUBLIC_APTOS_API_KEY },
            }),
          }}
          optInWallets={["Petra", "Pontem Wallet", "Nightly"]}
          onError={(err) => console.error("[Aptos wallet]", err)}
        >
          <ActiveWalletChainProvider>{children}</ActiveWalletChainProvider>
        </AptosWalletAdapterProvider>
      </SolanaProvider>
    </QueryClientProvider>
  );
}
