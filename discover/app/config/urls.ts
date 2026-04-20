export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://weavenotes.app";

export const BLOG_URL =
  process.env.NEXT_PUBLIC_BLOG_URL || "https://blog.weavenotes.app";

export const SOCIAL_GITHUB_URL =
  process.env.NEXT_PUBLIC_GITHUB_URL ||
  "https://github.com/eugaelgomes/weave-notes";

export const SOCIAL_LINKEDIN_URL =
  process.env.NEXT_PUBLIC_LINKEDIN_URL ||
  "https://www.linkedin.com/company/weavenotes";

/** Legal / DPA document (landing has no local /dpa page). Override via env if needed. */
export const LEGAL_DPA_URL =
  process.env.NEXT_PUBLIC_LEGAL_DPA_URL || `${BLOG_URL}/legal/dpa`;
