export type ComposeIntent = "insight" | "instructions" | null;

export type ComposeChipId =
  | "publish_insight"
  | "tune_instructions"
  | "back_feed";

export type ComposeMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  chips?: ComposeChipId[];
};

export function buildComposeBackHref(from: string | null, projectId: string | null): string {
  if (from === "project" && projectId) {
    return `/projects/${projectId}/details`;
  }
  return "/weave-engine";
}

export function resolveUserDisplayName(user: {
  user_name?: string;
  name?: string | null;
  username?: string;
} | null): string {
  if (!user) return "";
  const name = user.user_name || user.name || user.username;
  return typeof name === "string" ? name.trim() : "";
}
