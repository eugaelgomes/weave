const { fromUnknown } = require("@/errors");
const eventInvitesRepository = require("../repositories/event-invites.repository");
const calendarEventsRepository = require("../repositories/calendar-events.repository");

class EventInvitesController {
  _validateInvitePayload(payload) {
    if (!payload.email || typeof payload.email !== "string") {
      throw new Error("E-mail é obrigatório e deve ser uma string válido");
    }
  }

  async createInvite(req, res, next) {
    try {
      const { eventId } = req.params;
      const { email, role, status, userId, externalGuestId } = req.body;
      const creatorId = req.user?.userId;

      // Ensure the event exists and the user has access to it.
      const event = await calendarEventsRepository.getEventById({
        eventId,
        creatorId,
      });

      if (!event) {
        return res
          .status(404)
          .json({ error: "Evento não encontrado ou acesso restrito" });
      }

      this._validateInvitePayload(req.body);

      const newInvite = await eventInvitesRepository.createInvite({
        eventId,
        email,
        role: role || "REQUIRED",
        status: status || "PENDING",
        userId: userId || null,
        externalGuestId: externalGuestId || null,
      });

      return res.status(201).json(newInvite);
    } catch (error) {
      if (error.code === "23505") {
        // unique violation
        return res
          .status(409)
          .json({ error: "This email has already been invited to the event." });
      }
      if (error.message.includes("E-mail") || error.message.includes("email")) {
        return res.status(400).json({ error: "Email is required." });
      }
      next(fromUnknown(error));
    }
  }

  async listEventInvites(req, res, next) {
    try {
      const { eventId } = req.params;
      const creatorId = req.user?.userId;

      // Verify user access first
      const event = await calendarEventsRepository.getEventById({
        eventId,
        creatorId,
      });

      if (!event) {
        return res.status(404).json({ error: "Evento não encontrado" });
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
      const event = await calendarEventsRepository.getEventById({
        eventId,
        creatorId,
      });

      if (!event) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      // Check if invite exists for this event
      const invite = await eventInvitesRepository.getInviteById(inviteId);
      if (!invite || invite.event_id !== eventId) {
        return res
          .status(404)
          .json({ error: "Convite não encontrado no evento" });
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
      const event = await calendarEventsRepository.getEventById({
        eventId,
        creatorId,
      });

      if (!event) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      const invite = await eventInvitesRepository.getInviteById(inviteId);
      if (!invite || invite.event_id !== eventId) {
        return res
          .status(404)
          .json({ error: "Convite não encontrado no evento" });
      }

      await eventInvitesRepository.deleteInvite(inviteId);
      return res.status(204).send();
    } catch (error) {
      next(fromUnknown(error));
    }
  }
}

module.exports = new EventInvitesController();
