const express = require("express");
const calendarController = require("@/modules/calendar/controllers/calendar.controller");
const eventInvitesController = require("@/modules/calendar/controllers/event-invites.controller");
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
} = require("./schemas/calendar.schema");

const router = express.Router();

router.use(verifyToken);
const { requireModule } = require("@/middlewares/auth/require-module");
router.use(requireModule("calendar"));
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
  calendarController.listEvents.bind(calendarController)
);

router.get(
  "/:eventId",
  highTrafficLimiter,
  validate(eventIdParamSchema, "params"),
  calendarController.getEventById.bind(calendarController)
);

router.post(
  "/",
  standardTrafficLimiter,
  validate(createEventSchema, "body"),
  calendarController.createEvent.bind(calendarController)
);

router.patch(
  "/:eventId",
  standardTrafficLimiter,
  validate(eventIdParamSchema, "params"),
  validate(updateEventSchema, "body"),
  calendarController.updateEvent.bind(calendarController)
);

router.delete(
  "/:eventId",
  standardTrafficLimiter,
  validate(eventIdParamSchema, "params"),
  calendarController.deleteEvent.bind(calendarController)
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
  calendarController.getGoogleCalendarSettings.bind(
    calendarController
  )
);

router.get(
  "/google/calendars",
  highTrafficLimiter,
  calendarController.listGoogleCalendars.bind(calendarController)
);

router.post(
  "/google/freebusy",
  highTrafficLimiter,
  validate(checkFreeBusySchema, "body"),
  calendarController.checkFreeBusy.bind(calendarController)
);
module.exports = router;
