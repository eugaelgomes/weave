import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

/**
 * Public indexable routes only (trailing slash matches next.config trailingSlash).
 * Auth views use query params on a single /auth/ page.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${origin}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${origin}/auth/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${origin}/auth/?view=signup`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${origin}/activate/`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  return staticPages;
}
