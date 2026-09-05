/**
 * Integration System Types & Enums
 */

const INTEGRATION_CATEGORIES = Object.freeze({
  CALENDAR: "calendar",
  COMMUNICATION: "communication",
  CRM: "crm",
  KNOWLEDGE_BASE: "knowledge_base",
  PRODUCTIVITY: "productivity",
  STORAGE: "storage",
  TICKETING: "ticketing",
});

const AUTH_TYPES = Object.freeze({
  API_KEY: "api_key",
  BASIC: "basic",
  BEARER_TOKEN: "bearer_token",
  OAUTH2: "oauth2",
});

const INTEGRATION_STATUS = Object.freeze({
  CONNECTED: "connected",
  DEGRADED: "degraded",
  DISCONNECTED: "disconnected",
  ERROR: "error",
});

const PROVIDER_KEYS = Object.freeze({
  GOOGLE: "google",
  MICROSOFT: "microsoft",
  NOTION: "notion",
  SLACK: "slack",
  ZENDESK: "zendesk",
});

module.exports = {
  AUTH_TYPES,
  INTEGRATION_CATEGORIES,
  INTEGRATION_STATUS,
  PROVIDER_KEYS,
};
