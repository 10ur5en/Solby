import { fundWithShelbyUSD } from "@/utils/fundShelbyFaucet";
import { shelbyClient } from "@/utils/shelbyClient";
import { useCallback, useState } from "react";

const DEFAULT_FUNDING_AMOUNT = 1_000_000_000;

const apiKey =
  typeof process.env.NEXT_PUBLIC_SHELBYNET_API_KEY === "string"
    ? process.env.NEXT_PUBLIC_SHELBYNET_API_KEY.trim()
    : undefined;

async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    maxDelayMs?: number;
    initialDelayMs?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, maxDelayMs = 15000, initialDelayMs = 1000 } = options;
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) break;
      const baseDelay = initialDelayMs * 2 ** attempt;
      const jitter = Math.random() * 0.3 * baseDelay;
      await new Promise((r) =>
        setTimeout(r, Math.min(baseDelay + jitter, maxDelayMs))
      );
    }
  }
  throw lastError;
}

export function useFundAccount(): {
  fundAccount: (storageAccountAddress: string) => Promise<void>;
  isFunding: boolean;
  error: string | null;
} {
  const [isFunding, setIsFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fundAccount = useCallback(
    async (storageAccountAddress: string) => {
      setIsFunding(true);
      setError(null);
      const addr =
        storageAccountAddress.startsWith("0x")
          ? storageAccountAddress
          : `0x${storageAccountAddress}`;
      try {
        await withRetry(() =>
          fundWithShelbyUSD(
            shelbyClient as { aptos: { waitForTransaction: (p: unknown) => Promise<{ type: string; hash: string }> } },
            addr,
            DEFAULT_FUNDING_AMOUNT,
            apiKey
          )
        );
        await withRetry(() =>
          shelbyClient.fundAccountWithAPT({
            address: addr,
            amount: DEFAULT_FUNDING_AMOUNT,
          })
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      } finally {
        setIsFunding(false);
      }
    },
    []
  );

  return { fundAccount, isFunding, error };
}
