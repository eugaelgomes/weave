import type { MetadataRoute } from "next";

const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://weavenotes.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: NEXT_PUBLIC_APP_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${NEXT_PUBLIC_APP_URL}/auth/`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${NEXT_PUBLIC_APP_URL}/auth/signup`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  return staticPages;
}
