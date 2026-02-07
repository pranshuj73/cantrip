import { Serwist, type PrecacheEntry } from "serwist";
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
} from "serwist";
import {
  ExpirationPlugin,
  CacheableResponsePlugin,
  BackgroundSyncPlugin,
} from "serwist";
import { defaultCache } from "@serwist/turbopack/worker";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Supabase Storage images — CacheFirst, long TTL
    {
      matcher: ({ url }) =>
        url.hostname.endsWith(".supabase.co") &&
        url.pathname.startsWith("/storage/v1/object/public/images/"),
      handler: new CacheFirst({
        cacheName: "supabase-images",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 500,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Upload endpoint — NetworkOnly with BackgroundSync fallback
    {
      matcher: ({ url, request }) =>
        url.pathname === "/api/images/upload" && request.method === "POST",
      method: "POST",
      handler: new NetworkOnly({
        plugins: [
          new BackgroundSyncPlugin("upload-queue", {
            maxRetentionTime: 7 * 24 * 60, // 7 days in minutes
          }),
        ],
      }),
    },
    // Supabase API (non-storage) — NetworkFirst, short TTL
    {
      matcher: ({ url }) =>
        url.hostname.endsWith(".supabase.co") &&
        !url.pathname.startsWith("/storage/"),
      handler: new NetworkFirst({
        cacheName: "supabase-api",
        networkTimeoutSeconds: 5,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 5 * 60, // 5 min
          }),
        ],
      }),
    },
    // Next.js defaults
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
