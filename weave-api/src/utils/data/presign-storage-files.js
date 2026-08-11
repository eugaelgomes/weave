const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const spacesService = require("../../services/storage");
const {
  assertFileAccess,
  StorageAccessError,
} = require("@/services/storage/access-control");
const redis = require("@/services/queue/connection");

function getSpacesHostname() {
  try {
    if (!spacesService.spacesEndpoint) return "";
    const url = new URL(spacesService.spacesEndpoint);
    return url.hostname;
  } catch (error) {
    return "";
  }
}

const SPACES_PREFIXES = [
  spacesService.constructor?.FOLDER_PATHS?.BACKUPS || "backups",
  spacesService.constructor?.FOLDER_PATHS?.IMAGES || "images",
  spacesService.constructor?.FOLDER_PATHS?.NOTES?.ROOT || "notes",
  spacesService.constructor?.FOLDER_PATHS?.NOTES_COMMENTS_FILES?.ROOT ||
    "notes-comments-files",
  spacesService.constructor?.FOLDER_PATHS?.PROJECTS?.ROOT || "projects",
  spacesService.constructor?.FOLDER_PATHS?.USERS_CONTENT?.ROOT ||
    "users-content",
  spacesService.constructor?.FOLDER_PATHS?.ORGANIZATIONS?.ROOT ||
    "organizations",
  spacesService.constructor?.FOLDER_PATHS?.AGENTS?.ROOT || "agents",
];

const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

function isSpacesManagedValue(value) {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("blob:")) return false;

  const hasProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://");
  if (hasProtocol) {
    try {
      const { hostname } = new URL(trimmed);
      const host = getSpacesHostname();
      return (
        (host && hostname === host) ||
        hostname.includes(spacesService.bucketName)
      );
    } catch (error) {
      console.error("URL inválida ao verificar domínio do Spaces:", error);
      return false;
    }
  }

  const normalized = trimmed.startsWith("/") ? trimmed.substring(1) : trimmed;
  return SPACES_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/**
 * Gera uma URL pré-assinada para um objeto no Digital Ocean Spaces (S3)
 * @param {string} key - A chave (caminho) do arquivo no bucket
 * @param {number} expiresIn - Tempo em segundos para a URL expirar (padrão 3600s = 1 hora)
 * @returns {Promise<string|null>} A URL pré-assinada
 */
async function generatePresignedUrl(key, expiresIn = SESSION_MAX_AGE_SECONDS) {
  if (!key) return null;

  try {
    const redisKey = `s3_presign:${key}`;
    const cachedUrl = await redis.get(redisKey).catch(() => null);
    if (cachedUrl) {
      return cachedUrl;
    }

    const command = new GetObjectCommand({
      Bucket: spacesService.bucketName,
      Key: key,
    });

    const url = await getSignedUrl(spacesService.s3Client, command, {
      expiresIn,
    });

    // Cache in Redis with slightly lower TTL for safety margin
    const ttl = Math.max(1, expiresIn - 300);
    await redis.setex(redisKey, ttl, url).catch(() => null);

    return url;
  } catch (error) {
    console.error("Erro ao gerar URL pré-assinada:", error);
    return null;
  }
}

/**
 * Utilitário para formatar um registro iterando sobre os campos especificados
 * para extrair a key de uma URL pública do Spaces/S3 e assinar a URL.
 *
 * @param {Object} data - Objeto contendo os dados do banco (ex: nota, projeto)
 * @param {Array<string>} fields - Array de campos que contem a chave ou URL do arquivo
 * @param {number} expiresIn - Tempo em segundos para a URL expirar (padrão 3600s = 1 hora)
 * @returns {Promise<Object>} Novo objeto com as URLs substituídas
 */
const normalizeOptions = (options) => {
  if (typeof options === "number") {
    return { expiresIn: options };
  }

  if (options && typeof options === "object") {
    return {
      expiresIn: options.expiresIn ?? SESSION_MAX_AGE_SECONDS,
      userId: options.userId,
    };
  }

  return { expiresIn: SESSION_MAX_AGE_SECONDS };
};

async function presignObjectFields(data, fields = [], options = {}) {
  if (!data) return data;

  const { expiresIn, userId } = normalizeOptions(options);

  if (!userId) {
    throw new StorageAccessError(
      "Contexto do usuário é obrigatório para gerar URLs assinadas."
    );
  }

  const result = { ...data };

  for (const field of fields) {
    const fieldValue = result[field];
    if (!fieldValue || typeof fieldValue !== "string") {
      continue;
    }

    if (!isSpacesManagedValue(fieldValue)) {
      continue;
    }

    const key = spacesService.extractKeyFromUrl(fieldValue);
    if (!key) {
      continue;
    }

    await assertFileAccess(userId, key);
    result[field] = await generatePresignedUrl(key, expiresIn);
  }

  return result;
}

/**
 * Utilitário para formatar múltiplos registros de uma vez.
 *
 * @param {Array<Object>} list - Lista de registros
 * @param {Array<string>} fields - Campos para gerar as URLs pré-assinadas
 * @param {number} expiresIn - Tempo em segundos para a URL expirar
 * @returns {Promise<Array<Object>>}
 */
async function presignListFields(list, fields = [], options = {}) {
  if (!list || !Array.isArray(list)) return [];
  return Promise.all(
    list.map((item) => presignObjectFields(item, fields, options))
  );
}

module.exports = {
  generatePresignedUrl,
  presignListFields,
  presignObjectFields,
};
