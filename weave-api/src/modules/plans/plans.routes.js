const express = require("express");
const { body } = require("express-validator");

const PlansManager = require("@/services/plans/manager");
const PlansMeController = require("@/modules/plans/plans-me.controller");
const PlansUsageHistoryController = require("@/modules/plans/plans-usage-history.controller");
const PlansSubscriptionController = require("@/modules/plans/plans-subscription.controller");
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

router.get(
  "/usage-history",
  verifyToken,
  highTrafficLimiter,
  PlansUsageHistoryController.getUsageHistory.bind(PlansUsageHistoryController)
);

router.get(
  "/subscription",
  verifyToken,
  PlansSubscriptionController.getSubscription.bind(PlansSubscriptionController)
);

router.put(
  "/subscription",
  verifyToken,
  body("planId").isString().notEmpty().withMessage("planId is required"),
  PlansSubscriptionController.changePlan.bind(PlansSubscriptionController)
);

router.post(
  "/subscription/cancel",
  verifyToken,
  PlansSubscriptionController.cancelSubscription.bind(PlansSubscriptionController)
);

router.get("/", PlansManager.getAllPlans.bind(PlansManager));

module.exports = router;
