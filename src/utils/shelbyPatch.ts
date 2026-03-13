"use client";

// Global patch for Shelby SDK's createRegisterBlobPayload helper.
// In some SDK versions, the 7th argument (index 6) of the generated
// Aptos entry function payload can be `null`, which causes wallet
// simulation errors ("Type mismatch for argument 6").
//
// This patch wraps the original helper and replaces a `null`/`undefined`
// value at index 6 with the string "0", which satisfies the expected
// `number | string` type without changing any other arguments.

import { ShelbyBlobClient } from "@shelby-protocol/sdk/browser";

type AnyPayload = {
  functionArguments?: unknown[];
  [key: string]: unknown;
};

const originalCreateRegisterBlobPayload =
  (ShelbyBlobClient as any).createRegisterBlobPayload?.bind(ShelbyBlobClient);

if (typeof originalCreateRegisterBlobPayload === "function") {
  (ShelbyBlobClient as any).createRegisterBlobPayload = (args: unknown) => {
    const payload = originalCreateRegisterBlobPayload(args) as AnyPayload;
    if (Array.isArray(payload.functionArguments)) {
      payload.functionArguments = payload.functionArguments.map((arg, idx) =>
        idx === 6 && (arg === null || typeof arg === "undefined") ? "0" : arg,
      );
    }
    return payload;
  };
}

