import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    turbo: {
      resolveConditions: ["style", "..."],
    },
  },
};

export default nextConfig;
