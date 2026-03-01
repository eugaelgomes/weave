const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.SECRET_KEY;

const verifyToken = (req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";
  
  // Token HTTP Only
  let token = req.cookies?.token;
  let tokenSource = "cookie";

  // Se token não estiver nos cookies, verificar o header Authorization
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      token = authHeader.split(" ")[1];
      tokenSource = "header";
    }
  }

  // Debug em produção para identificar o problema
  if (isProduction && !token) {
    console.error("[Auth Error] Token não encontrado", {
      hasCookies: !!req.cookies,
      cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
      hasAuthHeader: !!req.headers.authorization,
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers["user-agent"]?.substring(0, 50),
      path: req.path,
    });
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Acesso negado. Token não fornecido." });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ["HS256"] });
    req.user = decoded;
    
    // Log de sucesso em produção (apenas primeira vez por sessão)
    if (isProduction) {
      console.log(`[Auth Success] User ${decoded.userId} via ${tokenSource}`);
    }
    
    next();
  } catch (error) {
    // Log de erro em produção
    if (isProduction) {
      console.error("[Auth Error] Token inválido", {
        error: error.message,
        tokenSource,
      });
    }
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
};

module.exports = {
  verifyToken,
};
