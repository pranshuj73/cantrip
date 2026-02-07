"use client";

import { SerwistProvider } from "@serwist/turbopack/react";

export function SWProvider({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider swUrl="/serwist/sw.js" reloadOnOnline={false}>
      {children}
    </SerwistProvider>
  );
}
