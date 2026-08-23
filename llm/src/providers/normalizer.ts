/**
 * @module weave-engine/providers
 * @description Entry point for the multi-provider LLM client.
 * Routes requests to the appropriate provider implementation.
 */

import type { LLMRequestParams, LLMResponse } from "@theweave/shared";
import { callOpenAICompatProvider } from "./models.openai";
import { callAnthropicProvider } from "./models.anthropic";
import { callDeepseekProvider } from "./models.deepseek";
import { callKimiProvider } from "./models.kimi";
import { callXAIProvider } from "./models.xai";

export * from "@theweave/shared";

export interface CallLLMProviderResult {
  data: LLMResponse;
  model: string;
  provider: string;
}

export async function callLLMProvider(params: LLMRequestParams): Promise<CallLLMProviderResult> {
  if (!params.provider) {
    throw new Error("provider is required");
  }
  if (!params.model) {
    throw new Error("model is required");
  }
  if (!params.apiKey) {
    throw new Error("apiKey is required");
  }

  try {
    let data: LLMResponse;
    const prov = params.provider.toLowerCase();

    if (prov === "anthropic") {
      data = await callAnthropicProvider(params);
    } else if (prov === "deepseek") {
      data = await callDeepseekProvider(params);
    } else if (prov === "kimi" || prov === "moonshot") {
      data = await callKimiProvider(params);
    } else if (prov === "xai" || prov === "grok") {
      data = await callXAIProvider(params);
    } else {
      data = await callOpenAICompatProvider(params);
    }

    return { data, model: params.model, provider: params.provider };
  } catch (error: unknown) {
    const err = error as Error & { code?: string; response?: Record<string, unknown> };

    const res = err.response || {};
    if (res.data) {
      const responseData = res.data as Record<string, unknown>;
      if (typeof responseData.on === "function") {
        let body = "";
        responseData.on("data", (c: { toString(): string }) => {
          body += c.toString();
        });
        responseData.on("end", () => {
          console.error("[LLM ERROR] Provider API stream error:", body);
        });
      } else {
        console.error("[LLM ERROR] Provider API error:", JSON.stringify(res.data, null, 2));
      }
    }

    if (!err.code) {
      err.code = "ENGINE_PROVIDER_CALL_FAILED";
    }
    throw err;
  }
}

// Legacy alias for chat.engine.ts compat
export type { LLMRequestParams as CallAIProviderParams };

/** @deprecated Use callLLMProvider. Kept for backward compat with chat.engine.ts */
export async function callAIProvider(params: LLMRequestParams): Promise<CallLLMProviderResult> {
  return callLLMProvider(params);
}
