const express = require("express");
//const { body } = require("express-validator");

const PlansManager = require("@/services/plans/manager");
const PlansMeController = require("@/modules/plans/plans-me.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const {
  highTrafficLimiter,
} = require("@/middlewares/security/request-limiters");

const router = express.Router();

router.get(
  "/me",
  verifyToken,
  highTrafficLimiter,
  PlansMeController.getPlanMe.bind(PlansMeController)
);

router.get("/", PlansManager.getAllPlans.bind(PlansManager));

module.exports = router;
