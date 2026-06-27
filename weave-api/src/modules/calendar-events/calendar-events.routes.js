const express = require("express");
const calendarEventsController = require("@/modules/calendar-events/controllers/calendar-events.controller");
const eventInvitesController = require("@/modules/calendar-events/controllers/event-invites.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { requireScope } = require("@/middlewares/auth/require-scope");
const { validate } = require("@/middlewares/validation/validate");
const {
  highTrafficLimiter,
  standardTrafficLimiter,
} = require("@/middlewares/security/request-limiters");

const {
  eventIdParamSchema,
  inviteIdParamSchema,
  listEventsQuerySchema,
  createEventSchema,
  updateEventSchema,
  createInviteSchema,
  updateInviteSchema,
  checkFreeBusySchema,
} = require("./schemas/calendar-events.schema");

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
  validate(listEventsQuerySchema, "query"),
  calendarEventsController.listEvents.bind(calendarEventsController)
);

router.get(
  "/:eventId",
  highTrafficLimiter,
  validate(eventIdParamSchema, "params"),
  calendarEventsController.getEventById.bind(calendarEventsController)
);

router.post(
  "/",
  standardTrafficLimiter,
  validate(createEventSchema, "body"),
  calendarEventsController.createEvent.bind(calendarEventsController)
);

router.patch(
  "/:eventId",
  standardTrafficLimiter,
  validate(eventIdParamSchema, "params"),
  validate(updateEventSchema, "body"),
  calendarEventsController.updateEvent.bind(calendarEventsController)
);

router.delete(
  "/:eventId",
  standardTrafficLimiter,
  validate(eventIdParamSchema, "params"),
  calendarEventsController.deleteEvent.bind(calendarEventsController)
);

// Event Invites Endpoints
router.get(
  "/:eventId/invites",
  highTrafficLimiter,
  validate(eventIdParamSchema, "params"),
  eventInvitesController.listEventInvites.bind(eventInvitesController)
);

router.post(
  "/:eventId/invites",
  standardTrafficLimiter,
  validate(eventIdParamSchema, "params"),
  validate(createInviteSchema, "body"),
  eventInvitesController.createInvite.bind(eventInvitesController)
);

router.patch(
  "/:eventId/invites/:inviteId",
  standardTrafficLimiter,
  validate(inviteIdParamSchema, "params"),
  validate(updateInviteSchema, "body"),
  eventInvitesController.updateInvite.bind(eventInvitesController)
);

router.delete(
  "/:eventId/invites/:inviteId",
  standardTrafficLimiter,
  validate(inviteIdParamSchema, "params"),
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
  validate(checkFreeBusySchema, "body"),
  calendarEventsController.checkFreeBusy.bind(calendarEventsController)
);
module.exports = router;
