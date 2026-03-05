"use client";

import { createContext, useCallback, useContext, useState } from "react";

type UploadModalContextValue = {
  isOpen: boolean;
  openUpload: () => void;
  closeUpload: () => void;
};

const UploadModalContext = createContext<UploadModalContextValue | null>(null);

export function UploadModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openUpload = useCallback(() => setIsOpen(true), []);
  const closeUpload = useCallback(() => setIsOpen(false), []);
  return (
    <UploadModalContext.Provider value={{ isOpen, openUpload, closeUpload }}>
      {children}
    </UploadModalContext.Provider>
  );
}

export function useUploadModal() {
  const ctx = useContext(UploadModalContext);
  if (!ctx) throw new Error("useUploadModal must be used within UploadModalProvider");
  return ctx;
}
