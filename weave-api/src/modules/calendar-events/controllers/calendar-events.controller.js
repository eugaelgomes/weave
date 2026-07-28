const { fromUnknown } = require("@/errors");
const calendarEventsService = require("../services/calendar-events.service");
const { parseDate, extractBoolean } = require("../normalizer");

class CalendarEventsController {
  _requireAuthentication(req, res) {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "User is not authenticated" });
      return null;
    }

    return userId;
  }

  async createEvent(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const event = await calendarEventsService.createEvent(
        req.body,
        creatorId
      );
      return res.status(201).json({ event });
    } catch (error) {
      if (error.status)
        return res.status(error.status).json({ error: error.message });
      next(fromUnknown(error));
    }
  }

  async listEvents(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const organizationId =
        req.query.organization_id || req.query.organizationId;
      const includeDeleted = extractBoolean(req.query.include_deleted, false);
      const from = parseDate(req.query.from);
      const to = parseDate(req.query.to);

      const events = await calendarEventsService.listEvents({
        creatorId,
        from,
        includeDeleted,
        organizationId,
        to,
      });

      return res.status(200).json({ events });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async getEventById(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const { eventId } = req.params;

      const event = await calendarEventsService.getEventById(
        eventId,
        creatorId
      );
      return res.status(200).json({ event });
    } catch (error) {
      if (error.status)
        return res.status(error.status).json({ error: error.message });
      next(fromUnknown(error));
    }
  }

  async updateEvent(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const { eventId } = req.params;

      const event = await calendarEventsService.updateEvent(
        eventId,
        req.body,
        creatorId
      );
      return res.status(200).json({ event });
    } catch (error) {
      if (error.status)
        return res.status(error.status).json({ error: error.message });
      next(fromUnknown(error));
    }
  }

  async deleteEvent(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const { eventId } = req.params;

      await calendarEventsService.deleteEvent(eventId, creatorId);
      return res.status(200).json({ success: true });
    } catch (error) {
      if (error.status)
        return res.status(error.status).json({ error: error.message });
      next(fromUnknown(error));
    }
  }

  async getGoogleCalendarSettings(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const settings =
        await calendarEventsService.getGoogleCalendarSettings(creatorId);
      return res.status(200).json({ settings });
    } catch (error) {
      if (error.status)
        return res.status(error.status).json({ error: error.message });
      next(fromUnknown(error));
    }
  }

  async listGoogleCalendars(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const calendars =
        await calendarEventsService.listGoogleCalendars(creatorId);
      return res.status(200).json({ calendars });
    } catch (error) {
      if (error.status)
        return res.status(error.status).json({ error: error.message });
      next(fromUnknown(error));
    }
  }

  async checkFreeBusy(req, res, next) {
    try {
      const creatorId = this._requireAuthentication(req, res);
      if (!creatorId) return;

      const freebusy = await calendarEventsService.checkFreeBusy(
        creatorId,
        req.body
      );
      return res.status(200).json({ freebusy });
    } catch (error) {
      if (error.status)
        return res.status(error.status).json({ error: error.message });
      next(fromUnknown(error));
    }
  }
}

module.exports = new CalendarEventsController();
