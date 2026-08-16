/**
 * Strips common HTML / markdown noise and truncates for card previews and lists.
 */
export function plainTextPreview(content: string | null | undefined, maxLength: number): string {
  if (!content) return "";
  const cleanContent = content.replace(/<[^>]*>/g, "").replace(/[#*_`]/g, "");
  if (cleanContent.length <= maxLength) return cleanContent;
  return `${cleanContent.slice(0, maxLength)}…`;
}
