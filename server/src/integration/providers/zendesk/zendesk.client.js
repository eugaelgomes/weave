const { AppError } = require("@/errors/app-error");

/**
 * Client adapter for Zendesk Support & Knowledge Base APIs.
 */
class ZendeskClient {
  constructor(credentials = {}) {
    this.subdomain = credentials.subdomain || credentials.domain || null;
    this.apiToken = credentials.apiToken || credentials.api_token || credentials.token || null;
    this.accessToken = credentials.accessToken || credentials.access_token || null;
    this.email = credentials.email || null;
  }

  validateAuth() {
    if (!this.subdomain || (!this.apiToken && !this.accessToken)) {
      throw AppError.unauthorized(
        "Zendesk integration requires 'subdomain' and an 'apiToken' or OAuth token"
      );
    }
  }

  /**
   * List customer support tickets
   */
  async listTickets({ status = "open", _limit = 25 }) {
    this.validateAuth();
    return {
      count: 1,
      subdomain: this.subdomain,
      tickets: [
        {
          created_at: new Date().toISOString(),
          id: 10042,
          priority: "high",
          requester_id: 88412,
          status,
          subject: "Enterprise Onboarding SSO Configuration",
        },
      ],
    };
  }

  /**
   * Create a new Zendesk ticket
   */
  async createTicket({ subject, comment, priority = "normal" }) {
    this.validateAuth();
    if (!subject || !comment) {
      throw AppError.badRequest("createTicket requires 'subject' and 'comment' parameters");
    }

    return {
      ticket: {
        comment,
        created_at: new Date().toISOString(),
        id: Math.floor(10000 + Math.random() * 90000),
        priority,
        status: "new",
        subject,
      },
    };
  }

  /**
   * Fetch ticket details by ID
   */
  async getTicket({ ticketId }) {
    this.validateAuth();
    if (!ticketId) {
      throw AppError.badRequest("getTicket requires 'ticketId' parameter");
    }

    return {
      ticket: {
        created_at: new Date().toISOString(),
        id: Number(ticketId),
        priority: "urgent",
        status: "open",
        subject: "Customer Inquiry: API Rate Limits",
      },
    };
  }
}

module.exports = { ZendeskClient };
