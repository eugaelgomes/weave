const { google } = require("googleapis");

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
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

const getCalendarClient = (tokens) => {
  oauth2Client.setCredentials(tokens);
  return google.calendar({ version: "v3", auth: oauth2Client });
};

module.exports = {
  oauth2Client,
  getAuthUrl,
  getTokens,
  getCalendarClient,
};
