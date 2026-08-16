const { fromUnknown } = require("@/errors");
const eventInvitesRepository = require("../repositories/event-invites.repository");
const calendarRepository = require("../repositories/calendar.repository");

class EventInvitesController {
  async createInvite(req, res, next) {
    try {
      const { eventId } = req.params;
      const { email, role, status, userId, externalGuestId } = req.body;
      const creatorId = req.user?.userId;

      // Ensure the event exists and the user has access to it.
      const event = await calendarRepository.getEventById({
        creatorId,
        eventId,
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found or access restricted" });
      }

      const newInvite = await eventInvitesRepository.createInvite({
        email,
        eventId,
        externalGuestId: externalGuestId || null,
        role: role || "REQUIRED",
        status: status || "PENDING",
        userId: userId || null,
      });

      return res.status(201).json(newInvite);
    } catch (error) {
      if (error.code === "23505") {
        // unique violation
        return res.status(409).json({ error: "This email has already been invited to the event." });
      }
      next(fromUnknown(error));
    }
  }

  async listEventInvites(req, res, next) {
    try {
      const { eventId } = req.params;
      const creatorId = req.user?.userId;

      // Verify user access first
      const event = await calendarRepository.getEventById({
        creatorId,
        eventId,
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const invites = await eventInvitesRepository.listInvitesByEvent(eventId);
      return res.status(200).json(invites);
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async updateInvite(req, res, next) {
    try {
      const { eventId, inviteId } = req.params;
      const { role, status } = req.body;
      const creatorId = req.user?.userId;

      // Ensure event exists
      const event = await calendarRepository.getEventById({
        creatorId,
        eventId,
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Check if invite exists for this event
      const invite = await eventInvitesRepository.getInviteById(inviteId);
      if (!invite || invite.event_id !== eventId) {
        return res.status(404).json({ error: "Invite not found in the event" });
      }

      const updatedInvite = await eventInvitesRepository.updateInvite({
        id: inviteId,
        role,
        status,
      });

      return res.status(200).json(updatedInvite);
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async deleteInvite(req, res, next) {
    try {
      const { eventId, inviteId } = req.params;
      const creatorId = req.user?.userId;

      // verify event
      const event = await calendarRepository.getEventById({
        creatorId,
        eventId,
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const invite = await eventInvitesRepository.getInviteById(inviteId);
      if (!invite || invite.event_id !== eventId) {
        return res.status(404).json({ error: "Invite not found in the event" });
      }

      await eventInvitesRepository.deleteInvite(inviteId);
      return res.status(204).send();
    } catch (error) {
      next(fromUnknown(error));
    }
  }
}

module.exports = new EventInvitesController();
