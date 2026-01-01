const express = require("express");
//const { body } = require("express-validator");

const PlansManager = require("@/services/plans/manager");

const router = express.Router();

router.get("/", PlansManager.getAllPlans.bind(PlansManager));

module.exports = router;
