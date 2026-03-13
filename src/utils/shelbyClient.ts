"use client";

import { Network } from "@aptos-labs/ts-sdk";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";

export const shelbyClient = new ShelbyClient({
  network: Network.TESTNET,
  apiKey: process.env.NEXT_PUBLIC_SHELBYNET_API_KEY || "",
});
