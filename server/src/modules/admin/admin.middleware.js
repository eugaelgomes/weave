const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.SECRET_KEY;
const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim())
  : [];

/**
 * Middleware que verifica se o usuário autenticado é um administrador.
 * Deve ser usado DEPOIS do verifyToken.
 *
 * Verificação por email na whitelist (ADMIN_EMAILS env).
 */
const verifyAdmin = (req, res, next) => {
  // verifyToken já populou req.user
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "Acesso negado. Não autenticado." });
  }

  const userEmail = req.user.email;

  if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
    return res.status(403).json({ error: "Acesso negado. Permissão de administrador necessária." });
  }

  next();
};

/**
 * Middleware combinado: verifica token + verifica admin.
 * Usa o mesmo JWT do sistema principal.
 */
const verifyAdminToken = (req, res, next) => {
  // 1. Extrair token
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Acesso negado. Token não fornecido." });
  }

  // 2. Verificar token
  try {
    const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ["HS256"] });
    req.user = decoded;
  } catch (error) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }

  // 3. Verificar admin
  const userEmail = req.user.email;
  if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
    return res.status(403).json({ error: "Acesso negado. Permissão de administrador necessária." });
  }

  next();
};

module.exports = { verifyAdmin, verifyAdminToken };
