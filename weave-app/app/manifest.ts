import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

export default function manifest(): MetadataRoute.Manifest {
  const origin = getSiteOrigin();

  return {
    name: "Weave - Intelligent Workspace",
    short_name: "Weave",
    description: "Intelligent workspace for intelligent teams.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    lang: "en-US",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
