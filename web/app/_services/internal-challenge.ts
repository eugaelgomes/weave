/** Mesmo default que `api-methods` (evita import circular). */
const API_BASE_FOR_CHALLENGE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

const CHALLENGE_PATH = "/_internal/challenge";
const SKEW_MS = 45_000;

type ChallengeCache =
  | { kind: "token"; token: string; exp: number }
  | { kind: "disabled"; exp: number };

let cache: ChallengeCache | null = null;
let inflight: Promise<ChallengeCache | null> | null = null;

export function clearInternalChallengeCache(): void {
  cache = null;
  inflight = null;
}

async function fetchChallenge(): Promise<ChallengeCache | null> {
  const url = `${API_BASE_FOR_CHALLENGE}${CHALLENGE_PATH}`;
  const res = await fetch(url, { method: "GET", credentials: "include" });
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as {
    disabled?: boolean;
    token?: string;
    expiresInSeconds?: number;
  };

  if (data.disabled) {
    return { kind: "disabled", exp: Date.now() + 86_400_000 };
  }

  if (!data.token || typeof data.token !== "string") {
    return null;
  }

  const ttlMs = (data.expiresInSeconds ?? 240) * 1000;
  return { kind: "token", token: data.token, exp: Date.now() + ttlMs };
}

/**
 * Headers para rotas internas (/api/v1/...): JWT curto emitido pelo backend, amarrado ao Origin.
 */
export async function getInternalChallengeHeaders(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cache && cache.exp - SKEW_MS > now) {
    if (cache.kind === "disabled") {
      return {};
    }
    return { "X-Weave-Internal-Challenge": cache.token };
  }

  if (!inflight) {
    inflight = fetchChallenge().finally(() => {
      inflight = null;
    });
  }

  const nextCache = await inflight;
  if (nextCache) {
    cache = nextCache;
  }

  if (!cache || cache.exp - SKEW_MS <= now) {
    return {};
  }
  if (cache.kind === "disabled") {
    return {};
  }
  return { "X-Weave-Internal-Challenge": cache.token };
}
