"use client";

import { Header } from "@/components/Header";
import { ProfileEditor } from "@/components/ProfileEditor";
import { ProfileVideoList } from "@/components/ProfileVideoList";
import { useUnifiedWallet } from "@/hooks/useUnifiedWallet";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/categories";
import {
  fetchProfile,
  getAvatarUrl,
  type ProfileData,
} from "@/types/profile";
import { VIDEO_CATEGORIES } from "@/types/video";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function ProfilePage() {
  const { storageAccountAddress: storageAccount, status } = useUnifiedWallet();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadProfile = useCallback(async () => {
    if (!storageAccount) return;
    try {
      const p = await fetchProfile(storageAccount);
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, [storageAccount]);

  const handleProfileUpdate = useCallback(() => {
    loadProfile();
  }, [loadProfile]);

  const handleVideoRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const handler = () => handleVideoRefresh();
    window.addEventListener("shelby-upload-complete", handler);
    return () => window.removeEventListener("shelby-upload-complete", handler);
  }, [handleVideoRefresh]);

  const channelName = profile?.channelName ?? "Channel";
  const avatarUrl =
    profile?.avatarBlobName && storageAccount
      ? getAvatarUrl(storageAccount, profile.avatarBlobName)
      : null;
  const connected = status === "connected";

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Header />

      <div className="flex">
        <aside className="fixed left-0 top-14 z-40 hidden h-[calc(100vh-3.5rem)] w-52 flex-col gap-0.5 border-r border-white/10 bg-[#0f0f0f] py-3 md:flex">
          {VIDEO_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={cat === "trending" ? "/" : `/?category=${cat}`}
              className="flex items-center gap-3 rounded-r-lg px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
            >
              <svg
                className="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={CATEGORY_ICONS[cat]}
                />
              </svg>
              {CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </aside>

        <main className="min-h-[calc(100vh-3.5rem)] flex-1 md:pl-52">
          <div className="px-4 py-6">
            {!connected ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-[#212121] p-16 text-center">
                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white/5">
                  <svg
                    className="h-12 w-12 text-white/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <p className="mb-1 text-lg font-medium text-white">
                  Connect your wallet
                </p>
                <p className="max-w-sm text-sm text-white/60">
                  Connect your wallet to view and manage your profile and
                  uploaded videos.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                  <div className="flex h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[#272727] ring-2 ring-white/20">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={channelName}
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
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold text-white">
                      {channelName}
                    </h1>
                    <p className="mt-0.5 text-sm text-white/60">
                      {storageAccount
                        ? `${storageAccount.slice(0, 6)}…${storageAccount.slice(-6)}`
                        : ""}
                    </p>
                    {profile?.xHandle && (
                      <a
                        href={`https://x.com/${encodeURIComponent(profile.xHandle)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#1da1f2] hover:underline"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        @{profile.xHandle}
                      </a>
                    )}
                  </div>
                </div>

                <ProfileEditor
                  storageAccount={storageAccount!}
                  onProfileUpdate={handleProfileUpdate}
                />

                <ProfileVideoList
                  key={refreshKey}
                  storageAccount={storageAccount}
                  onRefresh={handleVideoRefresh}
                  uploaderProfile={profile}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
