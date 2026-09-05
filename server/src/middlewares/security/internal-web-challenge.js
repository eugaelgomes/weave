const jwt = require("jsonwebtoken");

const CHALLENGE_HEADER = "x-weave-internal-challenge";
const CHALLENGE_CLAIM = "o";

function normalizeOrigin(origin) {
  if (!origin || typeof origin !== "string") return "";
  return origin.replace(/\/+$/, "");
}

function getChallengeSecret() {
  return process.env.INTERNAL_WEB_CHALLENGE_SECRET || "";
}

function shouldSkipInternalChallenge(path) {
  const isSsoAuthPath = path.startsWith("/auth/signin/sso") || path.startsWith("/auth/sso");

  if (path === "/_internal/challenge" || path.startsWith("/_internal/challenge/")) {
    return true;
  }
  const isSlackWebhookOrOAuth =
    path.startsWith("/integrations/slack/events") ||
    path.startsWith("/integrations/slack/interactivity") ||
    path.startsWith("/integrations/slack/install") ||
    path.startsWith("/integrations/slack/oauth/callback");

  if (path.startsWith("/webhooks") || isSsoAuthPath || isSlackWebhookOrOAuth) {
    return true;
  }
  return false;
}

/**
 * Emite JWT curto amarrado ao Origin (rota GET /_internal/challenge).
 * Em produção exige Origin; em dev sem secret retorna { disabled: true }.
 */
function issueInternalChallenge(req, res) {
  const isDev = process.env.NODE_ENV !== "production";
  const secret = getChallengeSecret();

  if (!secret) {
    if (isDev) {
      return res.json({ disabled: true });
    }
    return res.status(503).json({
      code: "INTERNAL_CHALLENGE_NOT_CONFIGURED",
      error: "Desafio interno não configurado no servidor.",
    });
  }

  const origin = normalizeOrigin(req.headers.origin);
  if (!origin) {
    if (isDev) {
      return res.status(400).json({
        code: "ORIGIN_REQUIRED",
        error: "Header Origin é obrigatório para emitir o desafio.",
      });
    }
    return res.status(403).json({
      code: "ORIGIN_REQUIRED",
      error: "Acesso negado.",
    });
  }

  const token = jwt.sign(
    {
      [CHALLENGE_CLAIM]: origin,
      weaveTyp: "internal-web-challenge",
    },
    secret,
    { algorithm: "HS256", expiresIn: "4m" }
  );

  return res.json({
    expiresInSeconds: 240,
    token,
  });
}

/**
 * Exige header X-Weave-Internal-Challenge com JWT válido e Origin coerente.
 * Em desenvolvimento, se INTERNAL_WEB_CHALLENGE_SECRET não estiver definido, não aplica.
 */
function verifyInternalWebChallenge(req, res, next) {
  if (shouldSkipInternalChallenge(req.path)) {
    return next();
  }

  const isDev = process.env.NODE_ENV !== "production";
  const secret = getChallengeSecret();

  if (!secret) {
    if (isDev) {
      return next();
    }
    return res.status(503).json({
      code: "INTERNAL_CHALLENGE_NOT_CONFIGURED",
      error: "Desafio interno não configurado no servidor.",
    });
  }

  const rawToken = req.headers[CHALLENGE_HEADER];
  if (!rawToken || typeof rawToken !== "string") {
    return res.status(403).json({
      code: "INTERNAL_CHALLENGE_REQUIRED",
      error: "Cliente não autorizado.",
    });
  }

  try {
    const payload = jwt.verify(rawToken, secret, {
      algorithms: ["HS256"],
    });

    if (payload.weaveTyp !== "internal-web-challenge") {
      return res.status(403).json({
        code: "INTERNAL_CHALLENGE_INVALID",
        error: "Cliente não autorizado.",
      });
    }

    const claimed = normalizeOrigin(payload[CHALLENGE_CLAIM]);
    if (!claimed) {
      return res.status(403).json({
        code: "INTERNAL_CHALLENGE_INVALID",
        error: "Cliente não autorizado.",
      });
    }

    const current = normalizeOrigin(req.headers.origin);
    if (!current) {
      return res.status(403).json({
        code: "ORIGIN_REQUIRED",
        error: "Cliente não autorizado.",
      });
    }

    if (claimed !== current) {
      return res.status(403).json({
        code: "INTERNAL_CHALLENGE_ORIGIN_MISMATCH",
        error: "Cliente não autorizado.",
      });
    }

    return next();
  } catch {
    return res.status(403).json({
      code: "INTERNAL_CHALLENGE_INVALID",
      error: "Cliente não autorizado.",
    });
  }
}

module.exports = {
  INTERNAL_CHALLENGE_HEADER: "X-Weave-Internal-Challenge",
  issueInternalChallenge,
  verifyInternalWebChallenge,
};
