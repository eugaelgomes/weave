/** Default API base URL for internal challenges, avoiding circular imports with `api-methods`. */
const ensureApiV1Path = (baseUrl: string): string => {
  const normalized = baseUrl.replace(/\/+$/, "");
  if (normalized.endsWith("/api/v1")) {
    return normalized;
  }
  return `${normalized}/api/v1`;
};

const isLocalHostname = (hostname: string): boolean =>
  hostname === "localhost" || hostname === "127.0.0.1";

const shouldForceLocalApi = (configuredBaseUrl: string): boolean => {
  if (typeof window === "undefined") return false;
  if (!isLocalHostname(window.location.hostname)) return false;

  try {
    const configuredHost = new URL(configuredBaseUrl).hostname;
    return !isLocalHostname(configuredHost);
  } catch {
    return true;
  }
};

const resolveApiBaseForChallenge = (): string => {
  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8080/api/v1";

  if (shouldForceLocalApi(configuredBaseUrl)) {
    return "http://localhost:8080/api/v1";
  }

  return ensureApiV1Path(configuredBaseUrl);
};

/** Default API base URL for internal challenges, avoiding circular imports with `api-methods`. */
const API_BASE_FOR_CHALLENGE: string = resolveApiBaseForChallenge();

/** Endpoint path for internal challenges. */
const CHALLENGE_PATH: string = "/_internal/challenge";

/** Time skew in milliseconds to account for clock differences. */
const SKEW_MS: number = 45_000;

/** Type definition for the challenge cache. */
type ChallengeCache =
  | { kind: "token"; token: string; exp: number }
  | { kind: "disabled"; exp: number };

/** In-memory cache for the challenge. */
let cache: ChallengeCache | null = null;

/** Tracks ongoing fetch requests to avoid redundant calls. */
let inflight: Promise<ChallengeCache | null> | null = null;

/** Clears the internal challenge cache. */
export function clearInternalChallengeCache(): void {
  cache = null;
  inflight = null;
}

/**
 * Fetches the internal challenge from the API.
 * @returns A promise resolving to the challenge cache or null if the fetch fails.
 */
async function fetchChallenge(): Promise<ChallengeCache | null> {
  const url: string = `${API_BASE_FOR_CHALLENGE}${CHALLENGE_PATH}`;
  const res: Response = await fetch(url, { method: "GET", credentials: "include" });

  if (!res.ok) {
    return null;
  }

  const data: {
    disabled?: boolean;
    token?: string;
    expiresInSeconds?: number;
  } = await res.json();

  if (data.disabled) {
    return { kind: "disabled", exp: Date.now() + 86_400_000 }; // Cache for 1 day
  }

  if (!data.token || typeof data.token !== "string") {
    return null;
  }

  const ttlMs: number = (data.expiresInSeconds ?? 240) * 1000;
  return { kind: "token", token: data.token, exp: Date.now() + ttlMs };
}

/**
 * Generates headers for internal routes (/api/v1/...).
 * The headers include a short-lived JWT issued by the backend, tied to the Origin.
 * @returns A promise resolving to the headers object.
 */
export async function getInternalChallengeHeaders(): Promise<Record<string, string>> {
  const now: number = Date.now();

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

  const nextCache: ChallengeCache | null = await inflight;
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
