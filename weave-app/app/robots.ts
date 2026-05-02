import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

const origin = getSiteOrigin();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
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
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
