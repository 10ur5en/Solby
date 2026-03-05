"use client";

import { AccountAddress } from "@aptos-labs/ts-sdk";

const SHELBY_USD_FAUCET =
  "https://faucet.shelbynet.shelby.xyz/fund?asset=shelbyusd";
const DEFAULT_TXN_TIMEOUT_SEC = 20;

type ShelbyClientWithAptos = {
  aptos: {
    waitForTransaction: (params: {
      transactionHash: string;
      options?: { timeoutSecs?: number; checkSuccess?: boolean };
    }) => Promise<{ type: string; hash: string }>;
  };
};

/**
 * Shelby USD faucet'i API anahtarı ile çağırır; SDK'daki eksik Authorization
 * ve hata gövdesi yüzünden oluşan "Failed to fund account" yerine sunucu
 * cevabını fırlatır.
 */
export async function fundWithShelbyUSD(
  shelbyClient: ShelbyClientWithAptos,
  address: string,
  amount: number,
  apiKey: string | undefined
): Promise<string> {
  let normalizedAddress: string;
  try {
    normalizedAddress = AccountAddress.from(address).toString();
  } catch {
    const s = address.trim();
    normalizedAddress = s.startsWith("0x") ? s : `0x${s}`;
  }

  // Tarayıcıdan doğrudan faucet CORS/429 verebiliyor; kendi API route üzerinden istek atıyoruz.
  const fundUrl =
    typeof window !== "undefined" ? "/api/fund" : SHELBY_USD_FAUCET;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window === "undefined" && apiKey?.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  const response = await fetch(fundUrl, {
    method: "POST",
    body: JSON.stringify({
      address: normalizedAddress,
      amount,
    }),
    headers,
  });

  let responseJson: { txn_hashes?: string[]; error?: string; message?: string };
  try {
    responseJson = (await response.json()) as typeof responseJson;
  } catch {
    if (!response.ok) {
      throw new Error(`Faucet ${response.status}: ${response.statusText}`);
    }
    throw new Error("Faucet geçersiz yanıt");
  }

  if (!response.ok) {
    const detail =
      responseJson.error ??
      responseJson.message ??
      response.statusText;
    throw new Error(`Faucet ${response.status}: ${detail}`.trim());
  }

  const hash = responseJson.txn_hashes?.[0];
  if (!hash) {
    throw new Error("Faucet yanıtında txn_hashes yok");
  }

  await shelbyClient.aptos.waitForTransaction({
    transactionHash: hash,
    options: {
      timeoutSecs: DEFAULT_TXN_TIMEOUT_SEC,
      checkSuccess: true,
    },
  });

  return hash;
}
