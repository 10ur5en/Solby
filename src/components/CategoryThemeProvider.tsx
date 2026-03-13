"use client";

import { CATEGORY_GRADIENTS } from "@/lib/categories";
import { VIDEO_CATEGORIES, type VideoCategory } from "@/types/video";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export function CategoryThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") as VideoCategory | null;
  const category =
    categoryParam && VIDEO_CATEGORIES.includes(categoryParam)
      ? categoryParam
      : "trending";
  const isHome = pathname === "/";
  const activeCategory = isHome ? category : "trending";
  const gradients = CATEGORY_GRADIENTS[activeCategory];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--theme-blob-1", gradients.blob1);
    root.style.setProperty("--theme-blob-2", gradients.blob2);
    root.style.setProperty("--theme-blob-3", gradients.blob3);
    return () => {
      root.style.removeProperty("--theme-blob-1");
      root.style.removeProperty("--theme-blob-2");
      root.style.removeProperty("--theme-blob-3");
    };
  }, [gradients]);

  return <>{children}</>;
}
