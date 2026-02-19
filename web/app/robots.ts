import type { MetadataRoute } from "next";

const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://weavenotes.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/home"],
        disallow: ["/app/", "/api/", "/auth/", "/_next/"],
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
