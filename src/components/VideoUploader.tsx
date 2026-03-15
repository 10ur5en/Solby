"use client";

import { Button } from "@/components/ui/button";
import { useUnifiedWallet } from "@/hooks/useUnifiedWallet";
import { addStoredVideo, VIDEO_CATEGORIES, type VideoCategory } from "@/types/video";
import { shelbyClient } from "@/utils/shelbyClient";
import { encryptVideoBytes, saveVideoKey } from "@/utils/videoCrypto";
import { AccountAddress, Aptos, AptosConfig, Network as AptosNetwork, type InputEntryFunctionData } from "@aptos-labs/ts-sdk";
import type { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  createDefaultErasureCodingProvider,
  expectedTotalChunksets,
  generateCommitments,
  ShelbyBlobClient,
} from "@shelby-protocol/sdk/browser";
import { memo, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

const SHELBY_BLOB_BASE =
  "https://api.testnet.shelby.xyz/shelby/v1/blobs";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/ogg,video/quicktime";
const RECOMMENDED_MAX_SIZE = 15 * 1024 * 1024; // 15 MB

const CATEGORY_LABELS: Record<VideoCategory, string> = {
  trending: "Trending",
  music: "Music",
  education: "Education",
  gaming: "Gaming",
  tech: "Tech",
  blockchain: "Blockchain",
  entertainment: "Entertainment",
  other: "Other",
};

/** Produces a safe blob file name from video title (extension preserved). */
function sanitizeBlobName(displayName: string, originalFileName: string): string {
  const ext = originalFileName.includes(".")
    ? originalFileName.slice(originalFileName.lastIndexOf("."))
    : ".mp4";
  const base = displayName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u00C0-\u024F\u1E00-\u1EFF\-.]/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "video";
  return base + ext;
}

interface VideoUploaderProps {
  fundedStorageAddress: string | null;
  onUploadComplete?: () => void;
}

export const VideoUploader = memo(function VideoUploader({
  fundedStorageAddress,
  onUploadComplete,
}: VideoUploaderProps) {
  const { status, storageAccountAddress, shelbySigner, chain } = useUnifiedWallet();
  const { account, signAndSubmitTransaction } = useWallet();
  const [isUploading, setIsUploading] = useState(false);

  const aptosClient = useMemo(
    () =>
      new Aptos(
        new AptosConfig({
          network: AptosNetwork.TESTNET,
          ...(process.env.NEXT_PUBLIC_APTOS_API_KEY && {
            clientConfig: { API_KEY: process.env.NEXT_PUBLIC_APTOS_API_KEY },
          }),
        }),
      ),
    [],
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoName, setVideoName] = useState("");
  const [category, setCategory] = useState<VideoCategory>("music");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [encryptVideo, setEncryptVideo] = useState(false);

  const connected = status === "connected";
  const storageAddressStr =
    storageAccountAddress ??
    (shelbySigner?.account && typeof shelbySigner.account === "object" && "address" in shelbySigner.account
      ? shelbySigner.account.address?.toString?.()
      : typeof shelbySigner?.account === "string"
        ? shelbySigner.account
        : null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("video/")) {
        setStatusMessage("Please select a video file (MP4, WebM, OGG).");
        e.target.value = "";
        return;
      }
      setSelectedFile(file);
      setVideoName(file.name.replace(/\.[^/.]+$/, "") || "");
      setStatusMessage(
        file.size > RECOMMENDED_MAX_SIZE
          ? "File is large; upload may fail with 500. Try under 15 MB."
          : null
      );
    },
    []
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !shelbySigner || !storageAddressStr) return;

    const baseName = videoName.trim()
      ? sanitizeBlobName(videoName.trim(), selectedFile.name)
      : selectedFile.name;
    const lastDot = baseName.lastIndexOf(".");
    const nameWithoutExt = lastDot > 0 ? baseName.slice(0, lastDot) : baseName;
    const ext = lastDot > 0 ? baseName.slice(lastDot) : ".mp4";
    const blobName = `${nameWithoutExt}-${Date.now()}${ext}`;

    try {
      setIsUploading(true);
      setStatusMessage("Uploading...");
      const arrayBuffer = await selectedFile.arrayBuffer();
      const originalData = new Uint8Array(arrayBuffer);

      // Optional encryption before upload
      let blobData: Uint8Array = originalData as Uint8Array;
      if (encryptVideo) {
        try {
          const { cipher, keyB64, ivB64 } = await encryptVideoBytes(arrayBuffer);
          blobData = cipher as unknown as Uint8Array;
          saveVideoKey(storageAddressStr, blobName, keyB64, ivB64);
        } catch (e) {
          console.error("Video encryption failed", e);
          toast.error("Video encryption failed. Uploading unencrypted.");
          blobData = originalData;
        }
      }
      const expirationMicros = (Date.now() + 1000 * 60 * 60 * 24 * 30) * 1000; // 30 days
      // Shared commitments for all chains
      const provider = await createDefaultErasureCodingProvider();
      const commitments = await generateCommitments(provider, blobData);

      if (chain === "aptos") {
        if (!account?.address || !signAndSubmitTransaction) {
          toast.error("Aptos wallet not ready. Connect Petra/Pontem and try again.");
          return;
        }

        // 1) Build payload for Aptos wallet using SDK helper
        const sdkPayload = ShelbyBlobClient.createRegisterBlobPayload({
          account: AccountAddress.from(String(account.address)),
          blobName,
          blobMerkleRoot: commitments.blob_merkle_root,
          numChunksets: expectedTotalChunksets(commitments.raw_data_size),
          expirationMicros,
          blobSize: commitments.raw_data_size,
          encoding: 0,
        });

        // 2) SDK payload'ındaki bug'ı patch et: son argüman null gelirse "0" yap
        const patchedPayload: InputEntryFunctionData = {
          ...(sdkPayload as any),
          functionArguments: (sdkPayload as any).functionArguments?.map(
            (arg: unknown, idx: number) =>
              idx === 6 && (arg === null || typeof arg === "undefined") ? "0" : arg,
          ),
        };

        const tx: InputTransactionData = { data: patchedPayload };

        // 3) Sign & submit with wallet, then wait for confirmation
        const submitted = await signAndSubmitTransaction(tx);
        await aptosClient.waitForTransaction({ transactionHash: submitted.hash });

        // 4) Upload blob data to Shelby RPC
        await shelbyClient.rpc.putBlob({
          account: account.address,
          blobName,
          blobData,
        });
      } else if (chain === "solana") {
        if (!shelbySigner) {
          toast.error("Solana signer not ready. Connect your Solana wallet and try again.");
          return;
        }

        // 1) Build payload for Solana flow (uses same Aptos register_blob under the hood)
        const sdkPayload = ShelbyBlobClient.createRegisterBlobPayload({
          account: AccountAddress.from(storageAddressStr!),
          blobName,
          blobMerkleRoot: commitments.blob_merkle_root,
          numChunksets: expectedTotalChunksets(commitments.raw_data_size),
          expirationMicros,
          blobSize: commitments.raw_data_size,
          encoding: 0,
        });

        const patchedPayload: InputEntryFunctionData = {
          ...(sdkPayload as any),
          functionArguments: (sdkPayload as any).functionArguments?.map(
            (arg: unknown, idx: number) =>
              idx === 6 && (arg === null || typeof arg === "undefined") ? "0" : arg,
          ),
        };

        const tx: InputTransactionData = { data: patchedPayload };

        const submitted = await shelbySigner.signAndSubmitTransaction(tx as any);
        await aptosClient.waitForTransaction({ transactionHash: submitted.hash });

        // 2) Upload blob data to Shelby RPC under the storage account
        await shelbyClient.rpc.putBlob({
          account: storageAddressStr!,
          blobName,
          blobData,
        });
      } else {
        toast.error("Unsupported chain for upload.");
        return;
      }

      const blobUrl = `${SHELBY_BLOB_BASE}/${storageAddressStr}/${encodeURIComponent(blobName)}`;
      addStoredVideo(storageAddressStr, {
        name: blobName,
        url: blobUrl,
        storageAccount: storageAddressStr,
        uploadedAt: new Date(),
        category,
      });
      fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageAccount: storageAddressStr,
          name: blobName,
          url: blobUrl,
          uploadedAt: new Date().toISOString(),
        }),
      }).catch(() => {});

      setSelectedFile(null);
      setVideoName("");
      setStatusMessage("Uploaded!");
      setIsUploading(false);
      toast.success("Video uploaded to the network.");
      onUploadComplete?.();

      const input = document.getElementById(
        "video-file-upload"
      ) as HTMLInputElement;
      if (input) input.value = "";
    } catch (error) {
      setIsUploading(false);
      const msg =
        error instanceof Error ? error.message : String(error);
      const isUnauthorized =
        msg.includes("401") ||
        msg.includes("Unauthorized") ||
        msg.includes("API key not found") ||
        (msg.includes("Unauthoriz") && msg.includes("not valid JSON"));
      if (msg.includes("INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE")) {
        toast.error("Fund your account for transaction fees.");
      } else if (msg.includes("E_INSUFFICIENT_FUNDS")) {
        toast.error("ShelbyUSD required for storage. Fund your account.");
      } else if (isUnauthorized) {
        toast.error(
          "Shelby API rejected the request (401). Set NEXT_PUBLIC_SHELBYNET_API_KEY in Vercel env and add this site's URL to Geomi allowed origins (geomi.dev), then redeploy."
        );
        setStatusMessage("Error: API key missing or domain not allowed.");
      } else if (
        msg.includes("multipart") ||
        msg.includes("500") ||
        msg.includes("Internal Server Error")
      ) {
        toast.error(
          "Server error (500). Try a smaller video (e.g. under 10–15 MB) or try again later."
        );
        setStatusMessage(
          "Error: Server returned 500. Try a smaller file."
        );
      } else if (
        msg.includes("Failed to fetch") ||
        msg.includes("fetch") ||
        msg.includes("NetworkError")
      ) {
        const hint =
          typeof process.env.NEXT_PUBLIC_SHELBYNET_API_KEY !== "string" ||
          !process.env.NEXT_PUBLIC_SHELBYNET_API_KEY.trim()
            ? " Optional: add NEXT_PUBLIC_SHELBYNET_API_KEY to .env.local (client key from geomi.dev)."
            : " Make sure this site is added as an approved URL in Geomi (e.g. http://localhost:3000).";
        toast.error("Network request failed. " + hint);
        setStatusMessage("Error: Network request failed. Add API key (geomi.dev) or check CORS.");
      } else {
        toast.error(msg);
        setStatusMessage(`Error: ${msg}`);
      }
    }
  }, [
    selectedFile,
    videoName,
    category,
    encryptVideo,
    chain,
    shelbySigner,
    storageAddressStr,
    account?.address,
    signAndSubmitTransaction,
    aptosClient,
    onUploadComplete,
  ]);

  const hasApiKey =
    typeof process.env.NEXT_PUBLIC_SHELBYNET_API_KEY === "string" &&
    process.env.NEXT_PUBLIC_SHELBYNET_API_KEY.trim().length > 0;
  const isDisabled = !connected || !fundedStorageAddress || !shelbySigner;

  return (
    <div className="rounded-2xl border border-white/20 bg-white/5 p-6">
      {!hasApiKey && (
        <div className="mb-4 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/70">
          Optional: For higher limits and indexer access, add <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_SHELBYNET_API_KEY</code> to your <code className="rounded bg-white/10 px-1">.env.local</code>. The key is issued via Geomi (geomi.dev) and shared between CLI and dApps.
        </div>
      )}
      {isDisabled ? (
        <p className="text-sm text-white/60">
          {!connected
            ? "Connect your wallet first."
            : "Fund your storage account to upload videos."}
        </p>
      ) : (
        <>
          <input
            id="video-file-upload"
            type="file"
            accept={VIDEO_ACCEPT}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="space-y-4">
            <div>
              <label htmlFor="video-name-input" className="mb-1 block text-sm font-medium text-white/80">
                Video title
              </label>
              <input
                id="video-name-input"
                type="text"
                value={videoName}
                onChange={(e) => setVideoName(e.target.value)}
                placeholder="Give your video a name"
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                disabled={!selectedFile}
              />
            </div>
            <div>
              <label htmlFor="video-category-select" className="mb-1 block text-sm font-medium text-white/80">
                Category
              </label>
              <select
                id="video-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as VideoCategory)}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {VIDEO_CATEGORIES.filter((c) => c !== "trending").map((c) => (
                  <option key={c} value={c} className="bg-[#212121] text-white">
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="encrypt-video-toggle"
                type="checkbox"
                checked={encryptVideo}
                onChange={(e) => setEncryptVideo(e.target.checked)}
                className="h-4 w-4 rounded border-white/40 bg-transparent text-red-500 focus:ring-red-500"
              />
              <label
                htmlFor="encrypt-video-toggle"
                className="text-sm text-white/80"
              >
                Store video in encrypted form (raw file not playable from Explorer)
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  document.getElementById("video-file-upload")?.click()
                }
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                Choose video
              </Button>
              {selectedFile && (
                <>
                  <span
                    className={
                      selectedFile.size > RECOMMENDED_MAX_SIZE
                        ? "text-sm text-amber-300"
                        : "text-sm text-white/80"
                    }
                  >
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    {selectedFile.size > RECOMMENDED_MAX_SIZE && " — large file"}
                  </span>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </>
              )}
            </div>
          </div>
          {statusMessage && (
            <p className="mt-3 text-sm text-white/80">{statusMessage}</p>
          )}
        </>
      )}
    </div>
  );
});
