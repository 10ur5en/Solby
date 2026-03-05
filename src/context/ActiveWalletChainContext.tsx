"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type WalletChain = "solana" | "aptos";

type ActiveWalletChainContextValue = {
  chain: WalletChain | null;
  setChain: (chain: WalletChain | null) => void;
};

const ActiveWalletChainContext = createContext<ActiveWalletChainContextValue | null>(
  null
);

export function ActiveWalletChainProvider({ children }: { children: ReactNode }) {
  const [chain, setChainState] = useState<WalletChain | null>(null);
  const setChain = useCallback((value: WalletChain | null) => {
    setChainState(value);
  }, []);
  const value = useMemo(
    () => ({ chain, setChain }),
    [chain, setChain]
  );
  return (
    <ActiveWalletChainContext.Provider value={value}>
      {children}
    </ActiveWalletChainContext.Provider>
  );
}

export function useActiveWalletChain() {
  const ctx = useContext(ActiveWalletChainContext);
  if (!ctx) {
    throw new Error(
      "useActiveWalletChain must be used within ActiveWalletChainProvider"
    );
  }
  return ctx;
}
