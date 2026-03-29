const express = require("express");
const calendarEventsController = require("@/modules/calendar-events/calendar-events.controller");
const { verifyToken } = require("@/middlewares/verify-token");
const {
  highTrafficLimiter,
  standardTrafficLimiter,
} = require("@/middlewares/request-limiters");

const router = express.Router();

router.use(verifyToken);

router.get(
  "/",
  highTrafficLimiter,
  calendarEventsController.listEvents.bind(calendarEventsController)
);

router.get(
  "/:eventId",
  highTrafficLimiter,
  calendarEventsController.getEventById.bind(calendarEventsController)
);

router.post(
  "/",
  standardTrafficLimiter,
  calendarEventsController.createEvent.bind(calendarEventsController)
);

router.patch(
  "/:eventId",
  standardTrafficLimiter,
  calendarEventsController.updateEvent.bind(calendarEventsController)
);

router.delete(
  "/:eventId",
  standardTrafficLimiter,
  calendarEventsController.deleteEvent.bind(calendarEventsController)
);

module.exports = router;
