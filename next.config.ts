import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The Tailwind loader's output was served stale from Turbopack's
    // filesystem cache after `@theme` tokens in globals.css changed, in both
    // `next build` and `next dev`. Builds take about two seconds here, so the
    // cache is not worth a deploy with the wrong colors.
    turbopackFileSystemCacheForBuild: false,
    turbopackFileSystemCacheForDev: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
