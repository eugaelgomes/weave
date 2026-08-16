const INVITE_POST_LOGIN_KEY = "invite_post_login_path";

export function setInvitePostLoginPath(path: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(INVITE_POST_LOGIN_KEY, path);
  } catch {
    /* ignore */
  }
}

/** Lê e remove o caminho guardado após aceitar convite (fluxo login manual). */
export function consumeInvitePostLoginPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(INVITE_POST_LOGIN_KEY);
    if (v) sessionStorage.removeItem(INVITE_POST_LOGIN_KEY);
    return v;
  } catch {
    return null;
  }
}
