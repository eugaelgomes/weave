import type { MetadataRoute } from "next";

const BLOG_URL =
  process.env.NEXT_PUBLIC_BLOG_URL || "https://blog.weavenotes.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/privacy", "/terms"],
        disallow: ["/_next/", "/api/"],
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
    sitemap: `${BLOG_URL}/sitemap.xml`,
  };
}
