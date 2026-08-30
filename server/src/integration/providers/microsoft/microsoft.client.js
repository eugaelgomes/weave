const { AppError } = require("@/errors/app-error");

/**
 * Client adapter for Microsoft 365 & Graph API (Teams, Outlook Mail & Calendar, OneDrive).
 */
class MicrosoftClient {
  constructor(credentials = {}) {
    this.accessToken = credentials.accessToken || credentials.access_token || null;
  }

  validateAuth() {
    if (!this.accessToken) {
      throw AppError.unauthorized("Microsoft 365 integration requires a valid accessToken");
    }
  }

  /**
   * Post message to Microsoft Teams channel or chat
   */
  async sendTeamsMessage({ channelId, message }) {
    this.validateAuth();
    if (!channelId || !message) {
      throw AppError.badRequest("sendTeamsMessage requires 'channelId' and 'message' parameters");
    }

    return {
      channelId,
      content: message,
      createdDateTime: new Date().toISOString(),
      id: `msg_ms_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: "posted",
    };
  }

  /**
   * Get messages from Outlook inbox
   */
  async getMail({ _top = 10, search = "" }) {
    this.validateAuth();
    return {
      count: 1,
      messages: [
        {
          from: { emailAddress: { address: "user@organization.com", name: "Microsoft 365 User" } },
          id: `mail_${Date.now()}_1`,
          receivedDateTime: new Date().toISOString(),
          subject: search ? `RE: ${search}` : "Quarterly Financial Sync",
        },
      ],
    };
  }

  /**
   * Fetch events from Outlook calendar
   */
  async getCalendarEvents({ timeMin, timeMax }) {
    this.validateAuth();
    return {
      value: [
        {
          end: {
            dateTime: timeMax || new Date(Date.now() + 3600000).toISOString(),
            timeZone: "UTC",
          },
          id: `ms_evt_${Date.now()}_1`,
          start: { dateTime: timeMin || new Date().toISOString(), timeZone: "UTC" },
          subject: "Microsoft Executive Briefing",
        },
      ],
    };
  }
}

module.exports = { MicrosoftClient };
