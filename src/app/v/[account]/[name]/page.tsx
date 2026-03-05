"use client";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { VideoCard } from "@/components/VideoCard";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/categories";
import { fetchProfile, type ProfileData } from "@/types/profile";
import {
  addStoredVideo,
  getAllStoredVideos,
  getViewCount,
  hasStoredVideo,
  incrementViewCount,
  VIDEO_CATEGORIES,
  type VideoCategory,
} from "@/types/video";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const SHELBY_BLOB_BASE =
  "https://api.shelbynet.shelby.xyz/shelby/v1/blobs";
const SHELBY_EXPLORER_BASE = "https://explorer.shelby.xyz/shelbynet/account";

export default function WatchPage() {
  const params = useParams();
  const account = params.account as string;
  const name = params.name as string;

  const [addedToGallery, setAddedToGallery] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const decodedAccount = account ? decodeURIComponent(account) : "";
  const decodedName = name ? decodeURIComponent(name) : "";
  const videoUrl =
    decodedAccount && decodedName
      ? `${SHELBY_BLOB_BASE}/${encodeURIComponent(decodedAccount)}/${encodeURIComponent(decodedName)}`
      : "";
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/v/${encodeURIComponent(account)}/${encodeURIComponent(name)}`
      : "";
  const explorerUrl =
    decodedAccount && decodedName
      ? `${SHELBY_EXPLORER_BASE}/${encodeURIComponent(decodedAccount)}/blobs?name=${encodeURIComponent(decodedName)}`
      : "";

  const [viewCount, setViewCount] = useState(0);

  const otherVideos = useMemo(() => {
    const all = getAllStoredVideos();
    return all.filter(
      (v) => v.storageAccount !== decodedAccount || v.name !== decodedName
    );
  }, [decodedAccount, decodedName]);

  const otherVideoAccounts = useMemo(
    () => [...new Set(otherVideos.slice(0, 10).map((v) => v.storageAccount))],
    [otherVideos]
  );
  const [otherProfileMap, setOtherProfileMap] = useState<
    Record<string, ProfileData | null>
  >({});
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next: Record<string, ProfileData | null> = {};
      for (const acc of otherVideoAccounts) {
        if (cancelled) return;
        try {
          next[acc] = await fetchProfile(acc);
        } catch {
          next[acc] = null;
        }
      }
      if (!cancelled) setOtherProfileMap(next);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [otherVideoAccounts.join(",")]);

  useEffect(() => {
    if (!decodedAccount || !decodedName) return;
    incrementViewCount(decodedAccount, decodedName);
    setViewCount(getViewCount(decodedAccount, decodedName));
  }, [decodedAccount, decodedName]);

  useEffect(() => {
    if (!decodedAccount || !decodedName || addedToGallery) return;
    if (hasStoredVideo(decodedAccount, decodedName)) {
      setAddedToGallery(true);
      return;
    }
    addStoredVideo(decodedAccount, {
      name: decodedName,
      url: videoUrl,
      storageAccount: decodedAccount,
      uploadedAt: new Date(),
    });
    setAddedToGallery(true);
  }, [decodedAccount, decodedName, videoUrl, addedToGallery]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied!");
  }, [shareUrl]);

  const handleShareNative = useCallback(() => {
    if (navigator.share) {
      navigator
        .share({
          title: decodedName,
          url: shareUrl,
          text: `Watch on Solby: ${decodedName}`,
        })
        .then(() => toast.success("Shared!"))
        .catch(() => {});
    } else {
      handleCopyLink();
    }
  }, [shareUrl, decodedName, handleCopyLink]);

  const displayTitle = decodedName.includes(".")
    ? decodedName.slice(0, decodedName.lastIndexOf("."))
    : decodedName;

  const formatViews = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M views`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(1)}K views`
        : n === 1
          ? "1 view"
          : `${n} views`;

  if (!account || !name) {
    return (
      <div className="min-h-screen bg-[#0f0f0f]">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-12 text-center text-[#aaaaaa]">
          Video not found.
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Header />

      <main className="flex gap-0 px-0 py-6 md:gap-4 md:px-4">
        <aside
          className={`fixed left-0 top-14 z-30 flex h-[calc(100vh-3.5rem)] flex-col border-r border-white/10 bg-[#0f0f0f] transition-[width] md:static md:z-auto ${
            categoriesOpen ? "w-52" : "w-14"
          }`}
        >
          <button
            type="button"
            onClick={() => setCategoriesOpen((o) => !o)}
            className="flex h-12 w-full items-center gap-3 border-b border-white/10 px-3 text-white/80 hover:bg-white/5 hover:text-white md:px-4"
            aria-label={categoriesOpen ? "Close categories" : "Open categories"}
          >
            <svg
              className="h-5 w-5 shrink-0 transition-transform"
              style={{ transform: categoriesOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {categoriesOpen && <span className="text-sm font-medium">Categories</span>}
          </button>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto py-2">
            {VIDEO_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={cat === "trending" ? "/" : `/?category=${cat}`}
                className="flex items-center gap-3 rounded-r-lg px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/5 hover:text-white md:px-4"
              >
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={CATEGORY_ICONS[cat]} />
                </svg>
                {categoriesOpen && <span>{CATEGORY_LABELS[cat]}</span>}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 pl-14 md:pl-0">
          <div className="overflow-hidden rounded-xl bg-black">
            <video
              src={videoUrl}
              controls
              className="aspect-video w-full"
              preload="metadata"
              controlsList="nodownload"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h1 className="text-xl font-semibold text-[#f1f1f1]">
                {displayTitle}
              </h1>
              <p className="mt-1 text-sm text-[#aaaaaa]">
                {viewCount > 0 ? formatViews(viewCount) : "0 views"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="border-white/20 bg-[#272727] text-white hover:bg-[#3f3f3f]"
              >
                Copy link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareNative}
                className="border-white/20 bg-[#272727] text-white hover:bg-[#3f3f3f]"
              >
                Share
              </Button>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center rounded-md border border-white/20 bg-[#272727] px-3 text-sm text-white hover:bg-[#3f3f3f]"
                >
                  View on Shelby Explorer
                </a>
              )}
            </div>
          </div>

          <p className="mt-3 text-sm text-[#aaaaaa]">
            This video is stored on the network. Share the link to let others watch.
          </p>
        </div>

        <aside className="hidden w-80 shrink-0 lg:block">
          <h2 className="mb-3 text-sm font-semibold text-[#f1f1f1]">Other videos</h2>
          <div className="flex flex-col gap-3">
            {otherVideos.length === 0 ? (
              <p className="text-xs text-[#aaaaaa]">No other videos yet.</p>
            ) : (
              otherVideos.slice(0, 10).map((video) => (
                <VideoCard
                  key={`${video.storageAccount}-${video.name}`}
                  video={video}
                  compact
                  viewCount={getViewCount(video.storageAccount, video.name)}
                  uploaderProfile={otherProfileMap[video.storageAccount] ?? null}
                />
              ))
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
