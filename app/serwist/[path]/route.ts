import { createSerwistRoute } from "@serwist/turbopack";
import { execSync } from "node:child_process";

let revision: string;
try {
  revision = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
} catch {
  revision = Date.now().toString();
}

export const { GET, generateStaticParams, dynamic, dynamicParams, revalidate } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
  });
