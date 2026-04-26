import type { MetadataRoute } from "next";

const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://weavenotes.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/home/",
          "/notes/",
          "/projects/",
          "/settings/",
          "/calendar/",
          "/notifications/",
          "/weave-ai/",
          "/organization/",
          "/api/",
          "/_next/",
          "/auth/",
        ],
      },
      {
        userAgent: "GPTBot",
        disallow: ["/"],
      },
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
    ],
    sitemap: `${NEXT_PUBLIC_APP_URL}/sitemap.xml`,
    host: NEXT_PUBLIC_APP_URL,
  };
}
