const path = require("path");
const moduleAlias = require("module-alias");
moduleAlias.addAlias("@", path.join(__dirname, "../"));

const { test, describe } = require("node:test");
const assert = require("node:assert");

const { integrationRegistry, PROVIDER_KEYS } = require("./index");

describe("Multi-Integration Business Framework", () => {
  test("Default business integration providers are registered", () => {
    assert.strictEqual(integrationRegistry.has(PROVIDER_KEYS.GOOGLE), true);
    assert.strictEqual(integrationRegistry.has(PROVIDER_KEYS.NOTION), true);
    assert.strictEqual(integrationRegistry.has(PROVIDER_KEYS.ZENDESK), true);
    assert.strictEqual(integrationRegistry.has(PROVIDER_KEYS.MICROSOFT), true);
  });

  test("listAllCapabilities returns metadata for registered providers", () => {
    const capabilities = integrationRegistry.listAllCapabilities();
    assert.ok(Array.isArray(capabilities));
    assert.ok(capabilities.length >= 4);

    const googleCap = capabilities.find((c) => c.providerKey === PROVIDER_KEYS.GOOGLE);
    assert.ok(googleCap);
    assert.strictEqual(googleCap.displayName, "Google Workspace");
    assert.ok(googleCap.actions.some((a) => a.name === "sendEmail"));
  });

  test("Google Integration - executeAction sendEmail works with valid credentials", async () => {
    const res = await integrationRegistry.execute(
      PROVIDER_KEYS.GOOGLE,
      "sendEmail",
      { body: "Hello World", subject: "Proposal", to: "client@acme.com" },
      { accessToken: "fake_token_123" }
    );

    assert.strictEqual(res.to, "client@acme.com");
    assert.strictEqual(res.status, "sent");
  });

  test("Notion Integration - executeAction createPage works", async () => {
    const res = await integrationRegistry.execute(
      PROVIDER_KEYS.NOTION,
      "createPage",
      { parentId: "parent_123", title: "Project Specs" },
      { apiKey: "secret_notion_key" }
    );

    assert.strictEqual(res.title, "Project Specs");
    assert.ok(res.id.startsWith("page_"));
  });

  test("Zendesk Integration - executeAction createTicket works", async () => {
    const res = await integrationRegistry.execute(
      PROVIDER_KEYS.ZENDESK,
      "createTicket",
      { comment: "System unreachable", subject: "Urgent issue" },
      { apiToken: "token_123", subdomain: "acmehelp" }
    );

    assert.strictEqual(res.ticket.subject, "Urgent issue");
    assert.strictEqual(res.ticket.status, "new");
  });

  test("Microsoft 365 Integration - executeAction sendTeamsMessage works", async () => {
    const res = await integrationRegistry.execute(
      PROVIDER_KEYS.MICROSOFT,
      "sendTeamsMessage",
      { channelId: "channel_999", message: "Deployment started" },
      { accessToken: "ms_graph_token" }
    );

    assert.strictEqual(res.channelId, "channel_999");
    assert.strictEqual(res.status, "posted");
  });

  test("Throws error when executing non-existent action", async () => {
    await assert.rejects(
      async () => {
        await integrationRegistry.execute(
          PROVIDER_KEYS.GOOGLE,
          "invalidActionName",
          {},
          { accessToken: "token" }
        );
      },
      (err) => {
        return err.statusCode === 400 && err.message.includes("is not supported");
      }
    );
  });

  test("testConnection returns connected status for valid credentials", async () => {
    const googleIntegration = integrationRegistry.get(PROVIDER_KEYS.GOOGLE);
    const result = await googleIntegration.testConnection({ accessToken: "valid_token" });
    assert.strictEqual(result.status, "connected");
  });
});
