"use client";

import { useCallback, useEffect, useState } from "react";

const DECIMALS = 8;

export function formatBalanceRaw(raw: string): string {
  if (!raw || raw === "0") return "0";
  try {
    const n = BigInt(raw);
    if (n === 0n) return "0";
    const div = 10n ** BigInt(DECIMALS);
    const int = n / div;
    const frac = n % div;
    const fracStr = frac.toString().padStart(DECIMALS, "0").replace(/0+$/, "") || "0";
    return fracStr ? `${int}.${fracStr}` : int.toString();
  } catch {
    return raw;
  }
}

export function useStorageBalance(
  storageAccountAddress: string | null
): {
  balance: string | null;
  apt: string | null;
  shelbyUsd: string | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => void;
} {
  const [balance, setBalance] = useState<string | null>(null);
  const [apt, setApt] = useState<string | null>(null);
  const [shelbyUsd, setShelbyUsd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!storageAccountAddress?.trim()) {
      setBalance(null);
      setApt(null);
      setShelbyUsd(null);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const addr = encodeURIComponent(storageAccountAddress.trim());
      const res = await fetch(`/api/balance?address=${addr}`);
      const data = (await res.json()) as {
        balance?: string;
        apt?: string;
        shelbyUsd?: string;
        error?: string;
      };
      if (data.error) setError(data.error);
      else setError(null);
      if (data.balance != null) setBalance(String(data.balance));
      else setBalance(null);
      if (data.apt != null) setApt(String(data.apt));
      else setApt(null);
      if (data.shelbyUsd != null) setShelbyUsd(String(data.shelbyUsd));
      else setShelbyUsd(null);
    } catch (e) {
      setBalance(null);
      setApt(null);
      setShelbyUsd(null);
      setError(e instanceof Error ? e.message : "Failed to load balance");
    } finally {
      setIsLoading(false);
    }
  }, [storageAccountAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, apt, shelbyUsd, error, isLoading, refetch: fetchBalance };
}
