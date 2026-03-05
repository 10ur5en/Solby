"use client";

import type { ProfileData } from "@/types/profile";
import type { VideoEntry } from "@/types/video";
import Link from "next/link";

const X_ICON = (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface VideoCardProps {
  video: VideoEntry;
  compact?: boolean;
  viewCount?: number;
  uploaderProfile?: ProfileData | null;
}

function displayTitle(name: string): string {
  if (!name) return "Video";
  const lastDot = name.lastIndexOf(".");
  return lastDot > 0 ? name.slice(0, lastDot) : name;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return n === 1 ? "1 view" : `${n} views`;
}

export function VideoCard({ video, compact, viewCount, uploaderProfile }: VideoCardProps) {
  const watchHref = `/v/${encodeURIComponent(video.storageAccount)}/${encodeURIComponent(video.name)}`;
  const date = new Date(video.uploadedAt);
  const dateStr = date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const views = viewCount ?? 0;
  const channelName = uploaderProfile?.channelName?.trim() || null;
  const xHandle = uploaderProfile?.xHandle?.trim() || null;
  const xUrl = xHandle ? `https://x.com/${encodeURIComponent(xHandle)}` : null;

  if (compact) {
    return (
      <Link
        href={watchHref}
        className="group flex gap-3 rounded-lg bg-transparent transition hover:bg-white/5"
      >
        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-[#272727]">
          <video
            src={video.url}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            muted
            playsInline
            preload="metadata"
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-xs font-medium text-[#f1f1f1] group-hover:text-white">
            {displayTitle(video.name)}
          </h3>
          <p className="mt-0.5 text-[10px] text-[#aaaaaa]">
            {views > 0 ? formatViews(views) : dateStr}
          </p>
          {(channelName || xUrl) && (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-white/60">
              {channelName && <span className="truncate">{channelName}</span>}
              {xUrl && (
                <span
                  role="link"
                  tabIndex={0}
                  className="inline-flex cursor-pointer items-center gap-0.5 text-[#1da1f2] hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(xUrl, "_blank", "noopener,noreferrer");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(xUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  {X_ICON}
                  <span>@{xHandle}</span>
                </span>
              )}
            </p>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={watchHref}
      className="group block overflow-hidden rounded-xl bg-transparent transition"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#272727]">
        <video
          src={video.url}
          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          muted
          playsInline
          preload="metadata"
          onMouseEnter={(e) => e.currentTarget.play()}
          onMouseLeave={(e) => {
            e.currentTarget.pause();
            e.currentTarget.currentTime = 0;
          }}
        />
      </div>
      <div className="mt-2 flex gap-3 px-0.5">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-medium text-[#f1f1f1] group-hover:text-white">
            {displayTitle(video.name)}
          </h3>
          <p className="mt-0.5 text-xs text-[#aaaaaa]">
            {views > 0 ? formatViews(views) : dateStr}
          </p>
          {(channelName || xUrl) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-white/70">
              {channelName && (
                <span className="font-medium text-white/90">{channelName}</span>
              )}
              {xUrl && (
                <span
                  role="link"
                  tabIndex={0}
                  className="inline-flex cursor-pointer items-center gap-1 text-[#1da1f2] hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(xUrl, "_blank", "noopener,noreferrer");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(xUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  {X_ICON}
                  @{xHandle}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
