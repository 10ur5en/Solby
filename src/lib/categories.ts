import type { VideoCategory } from "@/types/video";

/** Renk paleti: #c53bf4, #2ad9b0, #8188e5, #ff77c9 */
export const CATEGORY_GRADIENTS: Record<VideoCategory, { blob1: string; blob2: string; blob3: string }> = {
  trending: {
    blob1: "radial-gradient(ellipse, #8188e580, transparent 70%)",
    blob2: "radial-gradient(ellipse, #c53bf480, transparent 70%)",
    blob3: "radial-gradient(ellipse, #2ad9b080, transparent 70%)",
  },
  music: {
    blob1: "radial-gradient(ellipse, #ff77c980, transparent 70%)",
    blob2: "radial-gradient(ellipse, #c53bf480, transparent 70%)",
    blob3: "radial-gradient(ellipse, #ff77c960, transparent 70%)",
  },
  education: {
    blob1: "radial-gradient(ellipse, #2ad9b080, transparent 70%)",
    blob2: "radial-gradient(ellipse, #8188e580, transparent 70%)",
    blob3: "radial-gradient(ellipse, #2ad9b060, transparent 70%)",
  },
  gaming: {
    blob1: "radial-gradient(ellipse, #c53bf480, transparent 70%)",
    blob2: "radial-gradient(ellipse, #ff77c980, transparent 70%)",
    blob3: "radial-gradient(ellipse, #8188e560, transparent 70%)",
  },
  tech: {
    blob1: "radial-gradient(ellipse, #8188e580, transparent 70%)",
    blob2: "radial-gradient(ellipse, #2ad9b080, transparent 70%)",
    blob3: "radial-gradient(ellipse, #c53bf460, transparent 70%)",
  },
  blockchain: {
    blob1: "radial-gradient(ellipse, #2ad9b080, transparent 70%)",
    blob2: "radial-gradient(ellipse, #8188e580, transparent 70%)",
    blob3: "radial-gradient(ellipse, #ff77c960, transparent 70%)",
  },
  entertainment: {
    blob1: "radial-gradient(ellipse, #ff77c980, transparent 70%)",
    blob2: "radial-gradient(ellipse, #8188e580, transparent 70%)",
    blob3: "radial-gradient(ellipse, #c53bf460, transparent 70%)",
  },
  other: {
    blob1: "radial-gradient(ellipse, #2ad9b080, transparent 70%)",
    blob2: "radial-gradient(ellipse, #c53bf480, transparent 70%)",
    blob3: "radial-gradient(ellipse, #ff77c960, transparent 70%)",
  },
};

export const CATEGORY_LABELS: Record<VideoCategory, string> = {
  trending: "Trending",
  music: "Music",
  education: "Education",
  gaming: "Gaming",
  tech: "Tech",
  blockchain: "Blockchain",
  entertainment: "Entertainment",
  other: "Other",
};

export const CATEGORY_ICONS: Record<VideoCategory, string> = {
  trending: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941",
  music: "M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.262a2.25 2.25 0 01-1.336 0l-1.32-.262a2.25 2.25 0 01-1.632-2.163v-3.75",
  education: "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z",
  gaming: "M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  tech: "M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z",
  blockchain: "M12 2.25l7.794 4.5v10.5L12 21.75l-7.794-4.5v-10.5L12 2.25zm0 2.309L6.206 8.25 12 11.941 17.794 8.25 12 4.559zm-6.044 5.28v6.602L11.25 19.5v-6.602L5.956 9.839zm12.088 0L12.75 12.898V19.5l5.294-3.059V9.839z",
  entertainment: "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125m-12.75 0v-1.5m0 1.5c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125m0 0h-.375M21 12V9",
  other: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
};
