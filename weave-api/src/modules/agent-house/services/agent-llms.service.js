const agentLlmsRepository = require("../repositories/agent-llms.repository");
const crypto = require("crypto");

// Minimal simple encryption for API keys - in a real app, use KMS or a secure vault
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "a_very_secure_key_32_chars_long_!";
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text) {
  if (!text) return text;
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    console.error("Failed to decrypt API key", e);
    return null;
  }
}

class AgentLlmsService {
  async createLlmConfig(userId, data) {
    if (!data.title || !data.provider || !data.model || !data.apiKey) {
      throw new Error("Missing required fields (title, provider, model, apiKey).");
    }

    const payload = {
      ...data,
      apiKey: encrypt(data.apiKey),
    };

    const result = await agentLlmsRepository.create(userId, payload);
    delete result.api_key; // Never return API key directly in responses
    return result;
  }

  async listUserLlmConfigs(userId) {
    return agentLlmsRepository.findByUserId(userId);
  }

  async getLlmConfigForExecution(id, userId) {
    const config = await agentLlmsRepository.findById(id, userId);
    if (!config) throw new Error("LLM Config not found.");

    return {
      ...config,
      api_key: decrypt(config.api_key),
    };
  }

  async updateLlmConfig(id, userId, updates) {
    const safeUpdates = { ...updates };

    // Encrypt new key if provided
    if (safeUpdates.apiKey) {
      safeUpdates.api_key = encrypt(safeUpdates.apiKey);
      delete safeUpdates.apiKey; // Delete camelCase as the repository uses snake_case keys mapped
    }

    const result = await agentLlmsRepository.update(id, userId, safeUpdates);
    if (!result) throw new Error("Failed to update or not found.");

    delete result.api_key;
    return result;
  }

  async deleteLlmConfig(id, userId) {
    const result = await agentLlmsRepository.delete(id, userId);
    if (!result) throw new Error("LLM Config not found.");
    return { success: true };
  }
}

module.exports = new AgentLlmsService();
