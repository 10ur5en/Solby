"use client";

import { Header } from "@/components/Header";
import { VideoCard } from "@/components/VideoCard";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/categories";
import { fetchProfile, type ProfileData } from "@/types/profile";
import { getViewCount, getVideosByCategory, VIDEO_CATEGORIES, type VideoCategory } from "@/types/video";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function Home() {
  const searchParams = useSearchParams();
  const category = (searchParams.get("category") as VideoCategory) || "trending";
  const searchQuery = searchParams.get("search")?.trim() ?? "";
  const validCategory = VIDEO_CATEGORIES.includes(category) ? category : "trending";

  const [videos, setVideos] = useState(
    typeof window !== "undefined" ? getVideosByCategory(validCategory) : []
  );

  const refreshVideos = useCallback(() => {
    let list = getVideosByCategory(validCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((v) => {
        const title = v.name.replace(/\.[^/.]+$/, "").toLowerCase();
        return title.includes(q);
      });
    }
    setVideos(list);
  }, [validCategory, searchQuery]);

  useEffect(() => {
    refreshVideos();
  }, [refreshVideos]);

  useEffect(() => {
    const handler = () => refreshVideos();
    window.addEventListener("shelby-upload-complete", handler);
    return () => window.removeEventListener("shelby-upload-complete", handler);
  }, [refreshVideos]);

  const uniqueAccounts = useMemo(
    () => [...new Set(videos.map((v) => v.storageAccount))],
    [videos]
  );
  const [profileMap, setProfileMap] = useState<Record<string, ProfileData | null>>({});
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next: Record<string, ProfileData | null> = {};
      for (const account of uniqueAccounts) {
        if (cancelled) return;
        try {
          next[account] = await fetchProfile(account);
        } catch {
          next[account] = null;
        }
      }
      if (!cancelled) setProfileMap(next);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [uniqueAccounts.join(",")]);

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Header />

      <div className="flex">
        <aside className="fixed left-0 top-14 z-40 hidden h-[calc(100vh-3.5rem)] w-52 flex-col gap-0.5 border-r border-white/10 bg-[#0f0f0f] py-3 md:flex">
          {VIDEO_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={cat === "trending" ? "/" : `/?category=${cat}`}
              className={`flex items-center gap-3 rounded-r-lg px-4 py-2.5 text-sm transition ${
                validCategory === cat
                  ? "bg-white/10 font-medium text-white"
                  : "text-white/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={CATEGORY_ICONS[cat]} />
              </svg>
              {CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </aside>

        <main className="min-h-[calc(100vh-3.5rem)] flex-1 md:pl-52">
          <div className="px-4 py-6">
            {videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-[#212121] p-16 text-center">
                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white/5">
                  <svg className="h-12 w-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="mb-1 text-lg font-medium text-white">No videos yet</p>
                <p className="max-w-sm text-sm text-white/60">
                  Connect your wallet, fund your storage account, and upload with the + button; or open a shared link to see videos here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
                {videos.map((video) => (
                  <VideoCard
                    key={`${video.storageAccount}-${video.name}`}
                    video={video}
                    viewCount={getViewCount(video.storageAccount, video.name)}
                    uploaderProfile={profileMap[video.storageAccount] ?? null}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
