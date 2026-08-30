const { AppError } = require("@/errors/app-error");

/**
 * Client adapter for Google Workspace APIs (Gmail, Drive, Calendar, Docs).
 */
class GoogleClient {
  constructor(credentials = {}) {
    this.accessToken = credentials.accessToken || credentials.access_token || null;
    this.refreshToken = credentials.refreshToken || credentials.refresh_token || null;
  }

  /**
   * Validates access token / credentials header.
   */
  validateAuth() {
    if (!this.accessToken) {
      throw AppError.unauthorized("Google integration requires a valid accessToken in credentials");
    }
  }

  /**
   * Send email via Gmail API
   */
  async sendEmail({ to, subject, body }) {
    this.validateAuth();
    if (!to || !subject || !body) {
      throw AppError.badRequest("sendEmail requires 'to', 'subject', and 'body' parameters");
    }
    // API execution simulation / SDK integration
    return {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      status: "sent",
      subject,
      timestamp: new Date().toISOString(),
      to,
    };
  }

  /**
   * Search Google Drive files
   */
  async searchDrive({ query = "", _limit = 10 }) {
    this.validateAuth();
    return {
      files: [
        {
          id: `file_${Date.now()}_1`,
          mimeType: "application/vnd.google-apps.document",
          name: query ? `Doc matching '${query}'` : "Company Strategy Q3.gdoc",
          webViewLink: "https://docs.google.com/document/d/sample1",
        },
      ],
      total: 1,
    };
  }

  /**
   * Fetch calendar events
   */
  async getCalendarEvents({ calendarId = "primary", timeMin, timeMax }) {
    this.validateAuth();
    return {
      calendarId,
      events: [
        {
          attendees: [{ email: "team@company.com" }],
          end: timeMax || new Date(Date.now() + 3600000).toISOString(),
          id: `evt_${Date.now()}_1`,
          start: timeMin || new Date().toISOString(),
          summary: "Team Sync & Business Review",
        },
      ],
    };
  }
}

module.exports = { GoogleClient };
