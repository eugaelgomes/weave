const express = require("express");

const PlansPublicController = require("@/modules/plans/controllers/plans-public.controller");
const PlansMeController = require("@/modules/plans/controllers/plans-me.controller");
const PlansUsageHistoryController = require("@/modules/plans/controllers/plans-usage-history.controller");
const PlansSubscriptionController = require("@/modules/plans/controllers/plans-subscription.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { validate } = require("@/middlewares/validation/validate");
const { changePlanSchema } = require("./schemas/plans.schema");
const { highTrafficLimiter } = require("@/middlewares/security/request-limiters");

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
  validate(changePlanSchema, "body"),
  PlansSubscriptionController.changePlan.bind(PlansSubscriptionController)
);

router.post(
  "/subscription/cancel",
  verifyToken,
  PlansSubscriptionController.cancelSubscription.bind(PlansSubscriptionController)
);

router.get("/", PlansPublicController.getAllPlans.bind(PlansPublicController));

module.exports = router;
