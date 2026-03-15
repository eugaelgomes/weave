const { google } = require("googleapis");

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

const CALENDAR_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || "http://localhost:8080/api/v1/webhooks/google/callback";
/**
 * Setup Envs of Google OAuth2 Client and Calendar API
 * @see https://developers.google.com/calendar/api/quickstart/nodejs
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#creatingclient
 * @see https://developers.google.com/identity/protocols/oauth2/scopes#calendar
 */
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  CALENDAR_REDIRECT_URI
);

/**
 * Generates the Google OAuth2 consent screen URL for a given user ID.
 * The user ID is encoded in the state parameter to be retrieved in the callback.
 * @param {string} userId - ID of the user to associate with the OAuth2 flow
 * @returns {string} - The URL to redirect the user for Google OAuth2 consent
 */
const getAuthUrl = (userId) => {
  const state = Buffer.from(JSON.stringify({ userId })).toString("base64");
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    state,
    scope: SCOPES,
  });
};

/**
 * Exchanges an authorization code for access and refresh tokens.
 * @param {string} code - The authorization code received from Google OAuth2 callback
 * @returns {Promise<{access_token: string, refresh_token: string, expiry_date: number}>} - The tokens object
 */
const getTokens = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

/**
 * Creates an OAuth2 client for a user with the given tokens.
 * @param {Object} tokens - The OAuth2 tokens for the user
 * @returns {google.auth.OAuth2} - The OAuth2 client
 */
const createUserOAuth2Client = (tokens) => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    CALENDAR_REDIRECT_URI
  );
  client.setCredentials(tokens);
  return client;
};

/**
 * Creates a Google Calendar API client for a user with the given tokens.
 * @param {Object} tokens - The OAuth2 tokens for the user
 * @returns {google.calendar} - The Google Calendar API client
 */
const getCalendarClient = (tokens) => {
  const client = createUserOAuth2Client(tokens);
  return google.calendar({ version: "v3", auth: client });
};

/**
 * Creates a Google Calendar API client with an associated OAuth2 client for a user with the given tokens.
 * @param {Object} tokens - The OAuth2 tokens for the user
 * @returns {{calendar: google.calendar, auth: google.auth.OAuth2}} - The Google Calendar API client and OAuth2 client
 */
const getCalendarClientWithAuth = (tokens) => {
  const auth = createUserOAuth2Client(tokens);
  const calendar = google.calendar({ version: "v3", auth });
  return { calendar, auth };
};

module.exports = {
  oauth2Client,
  getAuthUrl,
  getTokens,
  getCalendarClient,
  getCalendarClientWithAuth,
};
