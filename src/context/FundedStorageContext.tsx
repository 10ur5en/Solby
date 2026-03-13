"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "shelby-player-funded-accounts";

/** Normalize address for matching same account across 0x/hex variants. */
export function normalizeStorageAddress(addr: string | null): string {
  if (!addr || typeof addr !== "string") return "";
  const s = addr.trim().toLowerCase();
  const hex = s.startsWith("0x") ? s.slice(2) : s;
  return hex ? `0x${hex}` : "";
}

function loadFundedAddresses(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    if (!Array.isArray(arr)) return new Set();
    const normalized = arr
      .filter((a): a is string => typeof a === "string")
      .map((a) => normalizeStorageAddress(a))
      .filter(Boolean);
    return new Set(normalized);
  } catch {
    return new Set();
  }
}

function saveFundedAddresses(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

type ContextValue = {
  fundedAddresses: Set<string>;
  isFunded: (address: string | null) => boolean;
  markFunded: (address: string) => void;
};

const FundedStorageContext = createContext<ContextValue | null>(null);

export function FundedStorageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [fundedAddresses, setFundedAddresses] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    setFundedAddresses(loadFundedAddresses());
  }, []);

  const markFunded = useCallback((address: string) => {
    const key = normalizeStorageAddress(address);
    if (!key) return;
    setFundedAddresses((prev) => {
      const next = new Set(prev);
      next.add(key);
      saveFundedAddresses(next);
      return next;
    });
  }, []);

  const isFunded = useCallback(
    (address: string | null) => {
      const key = normalizeStorageAddress(address);
      return key !== "" && fundedAddresses.has(key);
    },
    [fundedAddresses]
  );

  const value = useMemo<ContextValue>(
    () => ({ fundedAddresses, isFunded, markFunded }),
    [fundedAddresses, isFunded, markFunded]
  );

  return (
    <FundedStorageContext.Provider value={value}>
      {children}
    </FundedStorageContext.Provider>
  );
}

export function useFundedStorage(): ContextValue {
  const ctx = useContext(FundedStorageContext);
  if (!ctx) throw new Error("useFundedStorage must be used within FundedStorageProvider");
  return ctx;
}
