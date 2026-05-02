/** Canonical site origin without trailing slash (paths add their own slashes). */
export function getSiteOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://weavenotes.app").replace(/\/$/, "");
}
