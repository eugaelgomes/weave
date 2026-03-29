const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const spacesService = require("../../services/storage");

const spacesHostname = (() => {
  try {
    const url = new URL(spacesService.spacesEndpoint);
    return url.hostname;
  } catch (error) {
    console.error("Não foi possível determinar o host do Spaces:", error);
    return "";
  }
})();

const SPACES_PREFIXES = [
  spacesService.constructor?.FOLDER_PATHS?.BACKUPS || "backups",
  spacesService.constructor?.FOLDER_PATHS?.IMAGES || "images",
  spacesService.constructor?.FOLDER_PATHS?.NOTES?.ROOT || "notes",
  spacesService.constructor?.FOLDER_PATHS?.PROJECTS?.ROOT || "projects",
  spacesService.constructor?.FOLDER_PATHS?.USERS_CONTENT?.ROOT ||
    "users-content",
  spacesService.constructor?.FOLDER_PATHS?.ORGANIZATIONS?.ROOT ||
    "organizations",
  spacesService.constructor?.FOLDER_PATHS?.AGENTS?.ROOT || "agents",
];

function isSpacesManagedValue(value) {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("blob:")) return false;

  const hasProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://");
  if (hasProtocol) {
    try {
      const { hostname } = new URL(trimmed);
      return (
        hostname === spacesHostname ||
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
async function generatePresignedUrl(key, expiresIn = 3600) {
  if (!key) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: spacesService.bucketName,
      Key: key,
    });

    const url = await getSignedUrl(spacesService.s3Client, command, {
      expiresIn,
    });

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
async function presignObjectFields(data, fields = [], expiresIn = 3600) {
  if (!data) return data;

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
async function presignListFields(list, fields = [], expiresIn = 3600) {
  if (!list || !Array.isArray(list)) return [];
  return Promise.all(
    list.map((item) => presignObjectFields(item, fields, expiresIn))
  );
}

module.exports = {
  generatePresignedUrl,
  presignObjectFields,
  presignListFields,
};
