import { redis } from "./client";
import { SYSTEM_QUEUES, isSystemQueue, CUSTOM_QUEUES_REGISTRY_KEY } from "./keys";

export interface ManagedQueueInfo {
  description: string;
  isDeletable: boolean;
  isSystem: boolean;
  key: string;
  name: string;
  size: number;
}

export async function listManagedQueues(): Promise<ManagedQueueInfo[]> {
  const result: ManagedQueueInfo[] = [];

  for (const sq of SYSTEM_QUEUES) {
    let size = 0;
    try {
      size = await redis.llen(sq.key);
    } catch (_err) {
      size = 0;
    }
    result.push({ ...sq, size });
  }

  try {
    const rawCustom = await redis.smembers(CUSTOM_QUEUES_REGISTRY_KEY);
    for (const itemStr of rawCustom) {
      try {
        const customObj = JSON.parse(itemStr);
        let size = 0;
        try {
          size = await redis.llen(customObj.key);
        } catch (_err) {
          size = 0;
        }
        result.push({
          description: customObj.description || "User custom queue",
          isDeletable: true,
          isSystem: false,
          key: customObj.key,
          name: customObj.name,
          size,
        });
      } catch (_e) {
        // Skip malformed entries
      }
    }
  } catch (_err) {
    // Redis offline or empty
  }

  return result;
}

export async function createCustomQueue({ description = "Custom user queue", key, name }: { description?: string; key: string; name: string }) {
  if (!key || !name) {
    throw new Error("Campos 'name' e 'key' são obrigatórios para criar uma fila.");
  }

  const normalizedKey = key.trim();
  if (isSystemQueue(normalizedKey)) {
    throw new Error(`A chave '${normalizedKey}' é reservada por uma fila padrão do sistema.`);
  }

  const queueData = {
    createdAt: new Date().toISOString(),
    description,
    isDeletable: true,
    isSystem: false,
    key: normalizedKey,
    name: name.trim(),
  };

  await redis.sadd(CUSTOM_QUEUES_REGISTRY_KEY, JSON.stringify(queueData));

  return { queue: queueData, success: true };
}

export async function deleteCustomQueue(queueKey: string) {
  if (!queueKey) {
    throw new Error("Chave de fila não informada.");
  }

  const normalizedKey = queueKey.trim();

  if (isSystemQueue(normalizedKey)) {
    throw new Error(`A fila '${normalizedKey}' é uma fila padrão do sistema e NÃO pode ser deletada.`);
  }

  await redis.del(normalizedKey);

  try {
    const rawCustom = await redis.smembers(CUSTOM_QUEUES_REGISTRY_KEY);
    for (const itemStr of rawCustom) {
      try {
        const customObj = JSON.parse(itemStr);
        if (customObj.key === normalizedKey) {
          await redis.srem(CUSTOM_QUEUES_REGISTRY_KEY, itemStr);
        }
      } catch (_e) {
        // ignore
      }
    }
  } catch (_err) {
    // ignore
  }

  return { message: `Fila '${normalizedKey}' removida com sucesso.`, success: true };
}

export async function purgeQueue(queueKey: string) {
  if (!queueKey) {
    throw new Error("Chave de fila não informada.");
  }

  const count = await redis.llen(queueKey);
  await redis.del(queueKey);

  return { cleared: count, success: true };
}
