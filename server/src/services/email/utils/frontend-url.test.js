const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeFrontendBase, buildAuthInviteUrl } = require("./frontend-url");

const SAMPLE_UUID = "078ce37f-ba69-4038-942e-a375f9580c4a";

test("normalizeFrontendBase strips trailing slashes", () => {
  assert.equal(normalizeFrontendBase("https://app.example/"), "https://app.example");
  assert.equal(normalizeFrontendBase("https://app.example///"), "https://app.example");
});

test("buildAuthInviteUrl uses trailing slash on auth path and encodes token", () => {
  const url = buildAuthInviteUrl(SAMPLE_UUID, "https://app.example");
  assert.equal(url, `https://app.example/auth/?invite_token=${encodeURIComponent(SAMPLE_UUID)}`);
});

test("buildAuthInviteUrl avoids double slashes when base has trailing slash", () => {
  const url = buildAuthInviteUrl(SAMPLE_UUID, "https://app.example/");
  assert.equal(url.includes("//auth"), false);
  assert.ok(url.startsWith("https://app.example/auth/?invite_token="));
});

test("buildAuthInviteUrl encodes special characters in invite id", () => {
  const token = "550e8400-e29b-41d4-a716-446655440000&x=1";
  const url = buildAuthInviteUrl(token, "http://localhost:3000");
  assert.ok(url.includes(encodeURIComponent(token)));
});
