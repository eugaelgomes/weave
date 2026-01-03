import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "avatars.dicebear.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "sfo3.digitaloceanspaces.com" },
      { protocol: "https", hostname: "cwn.sfo3.cdn.digitaloceanspaces.com" },
      { protocol: "https", hostname: "cw-notes.sfo3.cdn.digitaloceanspaces.com" },
      { protocol: "https", hostname: "weave-notes.sfo3.digitaloceanspaces.com" },
    ],
  },
  reactStrictMode: true,
  trailingSlash: true,
};

export default nextConfig;
