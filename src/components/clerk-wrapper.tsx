"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

export function ClerkWrapper({ children }: { children: ReactNode }) {
  // Skip ClerkProvider when publishable key is missing (demo mode)
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return <>{children}</>;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}
