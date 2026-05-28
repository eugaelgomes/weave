const express = require("express");
const calendarEventsController = require("@/modules/calendar-events/controllers/calendar-events.controller");
const eventInvitesController = require("@/modules/calendar-events/controllers/event-invites.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { requireScope } = require("@/middlewares/auth/require-scope");
const {
  highTrafficLimiter,
  standardTrafficLimiter,
} = require("@/middlewares/security/request-limiters");

const router = express.Router();

router.use(verifyToken);

router.use((req, res, next) => {
  if (req.method === "GET") {
    return requireScope("calendar:read")(req, res, next);
  }
  return requireScope("calendar:write")(req, res, next);
});

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

// Event Invites Endpoints
router.get(
  "/:eventId/invites",
  highTrafficLimiter,
  eventInvitesController.listEventInvites.bind(eventInvitesController)
);

router.post(
  "/:eventId/invites",
  standardTrafficLimiter,
  eventInvitesController.createInvite.bind(eventInvitesController)
);

router.patch(
  "/:eventId/invites/:inviteId",
  standardTrafficLimiter,
  eventInvitesController.updateInvite.bind(eventInvitesController)
);

router.delete(
  "/:eventId/invites/:inviteId",
  standardTrafficLimiter,
  eventInvitesController.deleteInvite.bind(eventInvitesController)
);

router.get(
  "/google/settings",
  highTrafficLimiter,
  calendarEventsController.getGoogleCalendarSettings.bind(
    calendarEventsController
  )
);

router.get(
  "/google/calendars",
  highTrafficLimiter,
  calendarEventsController.listGoogleCalendars.bind(calendarEventsController)
);

router.post(
  "/google/freebusy",
  highTrafficLimiter,
  calendarEventsController.checkFreeBusy.bind(calendarEventsController)
);
module.exports = router;
