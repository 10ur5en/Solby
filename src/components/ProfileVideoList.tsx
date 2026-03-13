"use client";

import { VideoCard } from "@/components/VideoCard";
import type { ProfileData } from "@/types/profile";
import {
  getStoredVideos,
  getViewCount,
  setVideoHidden,
  type VideoEntry,
} from "@/types/video";
import { memo, useCallback, useEffect, useState } from "react";

interface ProfileVideoListProps {
  storageAccount: string | null;
  onRefresh?: () => void;
  /** Uploader profile for all videos in this list */
  uploaderProfile?: ProfileData | null;
}

export const ProfileVideoList = memo(function ProfileVideoList({
  storageAccount,
  onRefresh,
  uploaderProfile,
}: ProfileVideoListProps) {
  const [videos, setVideos] = useState<VideoEntry[]>([]);

  const refresh = useCallback(() => {
    if (!storageAccount) return;
    setVideos(getStoredVideos(storageAccount));
  }, [storageAccount]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggleHidden = useCallback(
    (name: string, currentHidden: boolean) => {
      setVideoHidden(storageAccount!, name, !currentHidden);
      refresh();
      onRefresh?.();
    },
    [storageAccount, refresh, onRefresh]
  );

  if (!storageAccount) {
    return (
      <div className="rounded-xl border border-white/20 bg-white/5 p-6">
        <p className="text-sm text-white/60">
          Connect your wallet to see your videos.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/20 bg-white/5 p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">Your videos</h3>
      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <svg
              className="h-8 w-8 text-white/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-sm text-white/60">No videos yet</p>
          <p className="mt-1 text-xs text-white/40">
            Upload videos with the + button in the header
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => {
            const key = `${video.storageAccount}-${video.name}`;
            const isHidden = !!video.hidden;
            return (
              <div
                key={key}
                className="group flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3 transition hover:border-white/20"
              >
                <div className="min-w-0 flex-1">
                  <VideoCard
                    video={video}
                    compact
                    viewCount={getViewCount(video.storageAccount, video.name)}
                    uploaderProfile={uploaderProfile ?? null}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleHidden(video.name, isHidden)}
                  className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                  title={isHidden ? "Show video" : "Hide video"}
                >
                  {isHidden ? (
                    <span className="flex items-center gap-1">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                      Hidden
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      Hide
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
