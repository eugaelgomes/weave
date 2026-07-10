jest.mock("../services/cache/redis.client", () => ({
  blpop: jest.fn(),
  expire: jest.fn(),
  lpush: jest.fn(),
  rpush: jest.fn().mockResolvedValue(1),
}));

jest.mock("../services/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const chatProcessor = require("../modules/weave-ai-chat/chat.processor");

describe("chat.processor envelope validation", () => {
  it("parses a valid job with defaults", () => {
    const parsed = chatProcessor.parseRawJob(
      JSON.stringify({
        payload: { message: "hello" },
        responseQueueKey: "weave:engine:llm:responses:req-1",
      })
    );

    expect(parsed).not.toBeNull();
    expect(parsed.taskType).toBe("provider_call");
    expect(parsed.attempts).toBe(0);
    expect(parsed.payload.message).toBe("hello");
  });

  it("returns null for malformed json payload", () => {
    const parsed = chatProcessor.parseRawJob("{not-json");
    expect(parsed).toBeNull();
  });

  it("returns null when envelope has no response queue", () => {
    const parsed = chatProcessor.parseRawJob(
      JSON.stringify({
        payload: { message: "hello" },
      })
    );
    expect(parsed).toBeNull();
  });
});
