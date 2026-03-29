const express = require("express");
const { verifyToken } = require("@/middlewares/verify-token");

const router = express.Router();

router.use(verifyToken);

router.get("/me", (req, res) => {
  res.json({
    status: "OK",
    message: "Successfully accessed Weave Notes Public API.",
    user: req.user,
    apiToken: req.apiToken,
  });
});


module.exports = router;