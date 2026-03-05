"use client";

import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { Network } from "@shelby-protocol/solana-kit/react";

// Cast for compatibility between @shelby-protocol/sdk and @shelby-protocol/solana-kit peer types
export const shelbyClient = new ShelbyClient({
  network: Network.SHELBYNET,
  apiKey: process.env.NEXT_PUBLIC_SHELBYNET_API_KEY || "",
});
