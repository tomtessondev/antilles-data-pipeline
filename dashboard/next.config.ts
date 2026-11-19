import type { NextConfig } from "next";

import { REDIRECTS } from "./src/lib/redirects";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async redirects() {
    return REDIRECTS;
  },
  partialPrefetching: true,
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
