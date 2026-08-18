"use client";

import { createContext, useContext } from "react";

interface BrandingContextValue {
  logoDataUri: string | null;
}

const BrandingContext = createContext<BrandingContextValue>({ logoDataUri: null });

export function SettingsProvider({
  logoDataUri,
  children,
}: {
  logoDataUri: string | null;
  children: React.ReactNode;
}) {
  return <BrandingContext.Provider value={{ logoDataUri }}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
