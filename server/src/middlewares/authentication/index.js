const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.SECRET_KEY;

const verifyToken = (req, res, next) => {
  // Token HTTP Only
  let token = req.cookies?.token;

  // Se token não estiver nos cookies, verificar o header Authorization
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Acesso negado. Token não fornecido." });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ["HS256"] });
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}

module.exports = {
  verifyToken,
};
