import { config } from "dotenv";
import Redis from "ioredis";
import { randomUUID } from "crypto";

config();

const API_URL = process.env.WEAVE_API_URL || "http://localhost:4000/api/v1";
const API_TOKEN = process.env.WEAVE_API_TOKEN || "";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

if (!API_TOKEN) {
  console.warn("Aviso: WEAVE_API_TOKEN não está definido nas variáveis de ambiente.");
}

const defaultHeaders = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${API_TOKEN}`,
};

/**
 * Cliente HTTP para comunicar com o weave-api
 */
export class WeaveApiClient {
  static async fetchApi(endpoint: string, options: RequestInit = {}) {
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${API_URL}${path}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Weave API Error (${response.status}): ${errorText}`);
    }

    if (response.status === 204) return null;
    
    return response.json();
  }
}

// Inicializa a conexão Redis para conversar com o weave-engine
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const ENGINE_REQUEST_QUEUE = process.env.REDIS_ENGINE_LLM_REQUEST_QUEUE_KEY || "weave:engine:llm:requests";
const DEFAULT_TIMEOUT_SECONDS = 60;

/**
 * Cliente de Fila (Redis) para comunicar com o weave-engine
 */
export class WeaveEngineClient {
  /**
   * Envia uma tarefa para o weave-engine e aguarda a resposta (RPC pattern)
   * @param taskType Tipo da tarefa (ex: 'chat_v2_process', 'provider_call')
   * @param payload Payload da tarefa
   * @param timeoutSeconds Tempo máximo de espera pela resposta
   */
  static async executeTask(taskType: string, payload: any = {}, timeoutSeconds = DEFAULT_TIMEOUT_SECONDS) {
    const requestId = randomUUID();
    const responseQueueKey = `weave:mcp:response:${requestId}`;

    const jobEnvelope = {
      requestId,
      taskType,
      payload,
      responseQueueKey,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    // Push do job na fila de requisições do engine
    await redis.rpush(ENGINE_REQUEST_QUEUE, JSON.stringify(jobEnvelope));

    // Aguarda (bloqueando) pela resposta na nossa fila dedicada
    // blpop retorna [nomeDaFila, valor] ou null se dar timeout
    const result = await redis.blpop(responseQueueKey, timeoutSeconds);

    if (!result) {
      throw new Error(`Weave Engine Timeout: Nenhuma resposta após ${timeoutSeconds}s para a task ${taskType}`);
    }

    const [, rawResponse] = result;
    
    try {
      const response = JSON.parse(rawResponse);
      
      if (!response.success) {
        throw new Error(`Engine Error: ${response.error?.message || 'Erro desconhecido'} (${response.error?.code || 'UNKNOWN'})`);
      }

      return response.data;
    } catch (err: any) {
      if (err.message.startsWith("Engine Error")) {
        throw err;
      }
      throw new Error(`Falha ao parsear resposta do Engine: ${err.message}`);
    }
  }

  /**
   * Fecha a conexão com o Redis (útil no shutdown do servidor MCP)
   */
  static disconnect() {
    redis.quit();
  }
}
