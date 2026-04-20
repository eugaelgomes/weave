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
  if (
    path === "/_internal/challenge" ||
    path.startsWith("/_internal/challenge/")
  ) {
    return true;
  }
  if (path.startsWith("/webhooks") || path.startsWith("/auth/sso/")) {
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
      error: "Desafio interno não configurado no servidor.",
      code: "INTERNAL_CHALLENGE_NOT_CONFIGURED",
    });
  }

  const origin = normalizeOrigin(req.headers.origin);
  if (!origin) {
    if (isDev) {
      return res.status(400).json({
        error: "Header Origin é obrigatório para emitir o desafio.",
        code: "ORIGIN_REQUIRED",
      });
    }
    return res.status(403).json({
      error: "Acesso negado.",
      code: "ORIGIN_REQUIRED",
    });
  }

  const token = jwt.sign(
    {
      [CHALLENGE_CLAIM]: origin,
      weaveTyp: "internal-web-challenge",
    },
    secret,
    { expiresIn: "4m", algorithm: "HS256" }
  );

  return res.json({
    token,
    expiresInSeconds: 240,
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
      error: "Desafio interno não configurado no servidor.",
      code: "INTERNAL_CHALLENGE_NOT_CONFIGURED",
    });
  }

  const rawToken = req.headers[CHALLENGE_HEADER];
  if (!rawToken || typeof rawToken !== "string") {
    return res.status(403).json({
      error: "Cliente não autorizado.",
      code: "INTERNAL_CHALLENGE_REQUIRED",
    });
  }

  try {
    const payload = jwt.verify(rawToken, secret, {
      algorithms: ["HS256"],
    });

    if (payload.weaveTyp !== "internal-web-challenge") {
      return res.status(403).json({
        error: "Cliente não autorizado.",
        code: "INTERNAL_CHALLENGE_INVALID",
      });
    }

    const claimed = normalizeOrigin(payload[CHALLENGE_CLAIM]);
    if (!claimed) {
      return res.status(403).json({
        error: "Cliente não autorizado.",
        code: "INTERNAL_CHALLENGE_INVALID",
      });
    }

    const current = normalizeOrigin(req.headers.origin);
    if (!current) {
      return res.status(403).json({
        error: "Cliente não autorizado.",
        code: "ORIGIN_REQUIRED",
      });
    }

    if (claimed !== current) {
      return res.status(403).json({
        error: "Cliente não autorizado.",
        code: "INTERNAL_CHALLENGE_ORIGIN_MISMATCH",
      });
    }

    return next();
  } catch {
    return res.status(403).json({
      error: "Cliente não autorizado.",
      code: "INTERNAL_CHALLENGE_INVALID",
    });
  }
}

module.exports = {
  issueInternalChallenge,
  verifyInternalWebChallenge,
  INTERNAL_CHALLENGE_HEADER: "X-Weave-Internal-Challenge",
};
