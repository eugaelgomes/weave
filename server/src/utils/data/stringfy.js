const toString = async (req, res, next) => {
  for (const key in req.body) {
    if (typeof req.body[key] !== "string") {
      req.body[key] = String(req.body[key]);
    }
  }
  next();
};

module.exports = toString;
