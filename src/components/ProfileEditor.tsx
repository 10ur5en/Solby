"use client";

import { Button } from "@/components/ui/button";
import { useUnifiedWallet } from "@/hooks/useUnifiedWallet";
import {
  fetchProfile,
  getAvatarUrl,
  setLatestProfileBlobName,
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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [xHandle, setXHandle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarPreview = avatarFile ? URL.createObjectURL(avatarFile) : null;
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const connected = status === "connected";
  const canEdit = canSign && !!shelbySigner;

  const loadProfile = useCallback(async () => {
    if (!storageAccount) return;
    setIsLoading(true);
    try {
      const p = await fetchProfile(storageAccount);
      setProfile(p);
      setChannelName(p?.channelName ?? "");
      setXHandle(p?.xHandle ?? "");
    } catch {
      setProfile(null);
      setChannelName("");
      setXHandle("");
    } finally {
      setIsLoading(false);
    }
  }, [storageAccount]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image (PNG, JPEG, WebP).");
        e.target.value = "";
        return;
      }
      setAvatarFile(file);
      e.target.value = "";
    },
    []
  );

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
      const nextAvatarBlobName =
        avatarFile != null
          ? `avatar-${timestamp}.png`
          : profile?.avatarBlobName;
      const profileBlobName = `profile-${timestamp}.json`;

      if (avatarFile) {
        const buf = await avatarFile.arrayBuffer();
        blobs.push({
          blobName: nextAvatarBlobName!,
          blobData: new Uint8Array(buf),
        });
      }

      const xHandleTrimmed = xHandle.trim().replace(/^@/, "") || undefined;
      const profileData: ProfileData = {
        channelName: channelName.trim(),
        avatarBlobName: nextAvatarBlobName ?? profile?.avatarBlobName,
        xHandle: xHandleTrimmed,
      };
      const profileJson = JSON.stringify(profileData);
      const profileBytes = new TextEncoder().encode(profileJson);
      blobs.push({ blobName: profileBlobName, blobData: profileBytes });
      if (!profile) {
        blobs.push({
          blobName: "profile.json",
          blobData: profileBytes,
        });
      }

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
      setAvatarFile(null);
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
    xHandle,
    avatarFile,
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

  const avatarUrl = profile?.avatarBlobName
    ? getAvatarUrl(storageAccount, profile.avatarBlobName)
    : null;
  const displayAvatar = avatarPreview ?? avatarUrl;

  return (
    <div className="rounded-xl border border-white/20 bg-white/5 p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">
        Edit profile (saved to Shelby)
      </h3>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <div
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-[#272727] ring-2 ring-white/20"
            onClick={() => avatarInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              e.key === "Enter" && avatarInputRef.current?.click()
            }
          >
            {displayAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayAvatar}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/40">
                <svg
                  className="h-10 w-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition hover:opacity-100">
              <span className="text-xs font-medium text-white">
                Change photo
              </span>
            </div>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
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
          <div>
            <label
              htmlFor="x-handle"
              className="mb-1 block text-sm font-medium text-white/80"
            >
              X account (optional)
            </label>
            <input
              id="x-handle"
              type="text"
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value)}
              placeholder="@username or username"
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
    </div>
  );
});
