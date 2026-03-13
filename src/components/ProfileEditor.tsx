"use client";

import { Button } from "@/components/ui/button";
import { useUnifiedWallet } from "@/hooks/useUnifiedWallet";
import {
  fetchProfile,
  setLatestProfileBlobName,
  setLocalProfileData,
  type ProfileData,
} from "@/types/profile";
import { shelbyClient } from "@/utils/shelbyClient";
import {
  createDefaultErasureCodingProvider,
  expectedTotalChunksets,
  generateCommitments,
  ShelbyBlobClient,
} from "@shelby-protocol/sdk/browser";
import {
  AccountAddress,
  Aptos,
  AptosConfig,
  Network as AptosNetwork,
  type InputEntryFunctionData,
} from "@aptos-labs/ts-sdk";
import { useWallet, type InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface ProfileEditorProps {
  storageAccount: string;
  onProfileUpdate?: (profile: ProfileData) => void;
}

export const ProfileEditor = memo(function ProfileEditor({
  storageAccount,
  onProfileUpdate,
}: ProfileEditorProps) {
  const { status, canSign, shelbySigner, chain } = useUnifiedWallet();
  const { account, signAndSubmitTransaction } = useWallet();
  const aptosClient = useMemo(
    () =>
      new Aptos(
        new AptosConfig({
          network: AptosNetwork.TESTNET,
          ...(process.env.NEXT_PUBLIC_APTOS_API_KEY && {
            clientConfig: { API_KEY: process.env.NEXT_PUBLIC_APTOS_API_KEY },
          }),
        })
      ),
    []
  );

  const [isUploading, setIsUploading] = useState(false);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [channelName, setChannelName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const connected = status === "connected";
  const canEdit = canSign && !!shelbySigner;

  const loadProfile = useCallback(async () => {
    if (!storageAccount) return;
    setIsLoading(true);
    try {
      const p = await fetchProfile(storageAccount);
      setProfile(p);
      setChannelName(p?.channelName ?? "");
    } catch {
      setProfile(null);
      setChannelName("");
    } finally {
      setIsLoading(false);
    }
  }, [storageAccount]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = useCallback(async () => {
    if (!shelbySigner) {
      toast.error(
        "Wallet signing not ready. Connect your wallet and try again."
      );
      return;
    }
    if (!channelName.trim()) {
      toast.error("Channel name cannot be empty.");
      return;
    }

    try {
      setIsUploading(true);
      const blobs: { blobName: string; blobData: Uint8Array }[] = [];
      const timestamp = Date.now();
      const profileBlobName = `profile-${timestamp}.json`;

      const profileData: ProfileData = {
        channelName: channelName.trim(),
      };
      const profileJson = JSON.stringify(profileData);
      const profileBytes = new TextEncoder().encode(profileJson);
      blobs.push({ blobName: profileBlobName, blobData: profileBytes });

      const expirationMicros =
        (Date.now() + 1000 * 60 * 60 * 24 * 365) * 1000;

      const accountAddress =
        chain === "aptos" && account?.address
          ? account.address
          : storageAccount;
      const signAndSubmit =
        chain === "aptos" && signAndSubmitTransaction
          ? (tx: { data: unknown }) =>
              signAndSubmitTransaction(
                tx as Parameters<typeof signAndSubmitTransaction>[0]
              ).then((r) => ({ hash: r.hash }))
          : shelbySigner?.signAndSubmitTransaction;

      if (!signAndSubmit || !accountAddress) {
        toast.error(
          "Wallet not ready. Connect your wallet and try again."
        );
        return;
      }

      const provider = await createDefaultErasureCodingProvider();
      const accountAddr = AccountAddress.from(String(accountAddress));
      for (const { blobName, blobData } of blobs) {
        const commitments = await generateCommitments(provider, blobData);
        const sdkPayload = ShelbyBlobClient.createRegisterBlobPayload({
          account: accountAddr,
          blobName,
          blobMerkleRoot: commitments.blob_merkle_root,
          numChunksets: expectedTotalChunksets(commitments.raw_data_size),
          expirationMicros,
          blobSize: commitments.raw_data_size,
          encoding: 0,
        });
        const patchedPayload = {
          ...(sdkPayload as object),
          functionArguments: (
            (sdkPayload as { functionArguments?: unknown[] }).functionArguments ?? []
          ).map((arg: unknown, idx: number) =>
            idx === 6 && (arg === null || arg === undefined) ? "0" : arg
          ),
        } as InputEntryFunctionData;
        const tx: InputTransactionData = { data: patchedPayload };
        const submitted = await signAndSubmit(tx);
        await aptosClient.waitForTransaction({
          transactionHash: submitted.hash,
        });
        await shelbyClient.rpc.putBlob({
          account: accountAddress,
          blobName,
          blobData,
        });
      }

      setLatestProfileBlobName(storageAccount, profileBlobName);
      setProfile(profileData);
      setLocalProfileData(storageAccount, profileData);
      toast.success("Profile saved to Shelby network.");
      onProfileUpdate?.(profileData);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(msg || "Failed to save profile.");
    } finally {
      setIsUploading(false);
    }
  }, [
    shelbySigner,
    chain,
    account?.address,
    signAndSubmitTransaction,
    storageAccount,
    channelName,
    profile,
    onProfileUpdate,
  ]);

  if (!connected) {
    return (
      <div className="rounded-xl border border-white/20 bg-white/5 p-6">
        <p className="text-sm text-white/60">
          Connect your wallet to edit your profile.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/20 bg-white/5 p-6">
        <div className="animate-pulse text-sm text-white/60">
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/20 bg-white/5 p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">
        Edit profile (saved to Shelby)
      </h3>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="channel-name"
            className="mb-1 block text-sm font-medium text-white/80"
          >
            Channel name
          </label>
          <input
            id="channel-name"
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="Your channel name"
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={!canEdit || isUploading || !channelName.trim()}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          {isUploading ? "Saving..." : "Save to Shelby"}
        </Button>
      </div>
    </div>
  );
});
