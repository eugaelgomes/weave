const getSecretKey = () => {
  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) throw new Error("SECRET_KEY não configurada!");
  return secretKey;
};

module.exports = {
  getSecretKey, // renamed from secretsManager to getSecretKey for clarity
};
