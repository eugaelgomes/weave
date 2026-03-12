const { google } = require("googleapis");

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

const CALENDAR_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || "http://localhost:8080/api/v1/webhooks/google/callback";

// Shared client only for OAuth flow (auth URL + token exchange)
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  CALENDAR_REDIRECT_URI
);

const getAuthUrl = (userId) => {
  const state = Buffer.from(JSON.stringify({ userId })).toString("base64");
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    state,
    scope: SCOPES,
  });
};

const getTokens = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

// Creates an isolated OAuth2 client per user to avoid credential sharing between requests
const createUserOAuth2Client = (tokens) => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    CALENDAR_REDIRECT_URI
  );
  client.setCredentials(tokens);
  return client;
};

const getCalendarClient = (tokens) => {
  const client = createUserOAuth2Client(tokens);
  return google.calendar({ version: "v3", auth: client });
};

// Returns { calendar, auth } so callers can read refreshed tokens from auth.credentials
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
