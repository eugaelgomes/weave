const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
//const { v4: uuidv4 } = require("uuid");

class ImageUtils {
  constructor() {
    this.spacesEndpoint = process.env.DO_SPACES_ENDPOINT;
    this.accessKeyId = process.env.DO_SPACES_ACCESS_KEY;
    this.secretAccessKey = process.env.DO_SPACES_SECRET_KEY;
    this.bucketName = process.env.DO_SPACES_BUCKET_NAME;
    this.region = process.env.DO_SPACES_REGION || "nyc3";

    if (
      !this.spacesEndpoint ||
      !this.accessKeyId ||
      !this.secretAccessKey ||
      !this.bucketName
    ) {
      console.warn("Credenciais do Digital Ocean Spaces não configuradas.");
      return;
    }

    this.s3Client = new S3Client({
      endpoint: this.spacesEndpoint,
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      forcePathStyle: false,
    });
  }

  /**
   * Salva uma imagem no Digital Ocean Spaces
   * @param {Buffer} imageBuffer - Buffer da imagem
   * @param {string} mimeType - Tipo MIME da imagem
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} - Resultado do upload
   */
  async saveProfileImage(imageBuffer, mimeType, userId) {
    try {
      if (!this.s3Client) {
        throw new Error("Digital Ocean Spaces not configured");
      }

      // Nome do arquivo simples
      const extension = this.getExtensionFromMimeType(mimeType);
      const filename = `user-${userId}-avatar${extension}`;
      const key = `users-content/profile/${filename}`;

      // Upload para Digital Ocean Spaces
      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: mimeType,
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      // URL pública da imagem
      const imageUrl = `${this.spacesEndpoint}/${this.bucketName}/${key}`;

      return {
        success: true,
        url: imageUrl,
        filename,
        key,
        size: imageBuffer.length,
      };
    } catch (error) {
      console.error("Erro ao fazer upload para Digital Ocean Spaces:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Salva logo de organização no Digital Ocean Spaces
   * @param {Buffer} imageBuffer - Buffer da imagem
   * @param {string} mimeType - Tipo MIME da imagem
   * @param {string} organizationId - ID da organização
   * @returns {Promise<Object>} - Resultado do upload
   */
  async saveOrganizationLogo(imageBuffer, mimeType, organizationId) {
    try {
      if (!this.s3Client) {
        throw new Error("Digital Ocean Spaces not configured");
      }

      const extension = this.getExtensionFromMimeType(mimeType);
      const filename = `org-${organizationId}-logo${extension}`;
      const key = `organizations/${organizationId}/images/logo/${filename}`;

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: mimeType,
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      const imageUrl = `${this.spacesEndpoint}/${this.bucketName}/${key}`;

      return {
        success: true,
        url: imageUrl,
        filename,
        key,
        size: imageBuffer.length,
      };
    } catch (error) {
      console.error("Erro ao fazer upload do logo:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Salva banner de organização no Digital Ocean Spaces
   * @param {Buffer} imageBuffer - Buffer da imagem
   * @param {string} mimeType - Tipo MIME da imagem
   * @param {string} organizationId - ID da organização
   * @returns {Promise<Object>} - Resultado do upload
   */
  async saveOrganizationBanner(imageBuffer, mimeType, organizationId) {
    try {
      if (!this.s3Client) {
        throw new Error("Digital Ocean Spaces not configured");
      }

      const extension = this.getExtensionFromMimeType(mimeType);
      const filename = `org-${organizationId}-banner${extension}`;
      const key = `organizations/${organizationId}/images/banner/${filename}`;

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: mimeType,
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      const imageUrl = `${this.spacesEndpoint}/${this.bucketName}/${key}`;

      return {
        success: true,
        url: imageUrl,
        filename,
        key,
        size: imageBuffer.length,
      };
    } catch (error) {
      console.error("Erro ao fazer upload do banner:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Remove uma imagem do Digital Ocean Spaces
   * @param {string} key - Chave da imagem no Spaces
   * @returns {Promise<boolean>} - True se removido com sucesso
   */
  async deleteProfileImage(key) {
    try {
      if (!this.s3Client) {
        console.warn("Digital Ocean Spaces not configured");
        return false;
      }

      const deleteParams = {
        Bucket: this.bucketName,
        Key: key,
      };

      const command = new DeleteObjectCommand(deleteParams);
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error("Erro ao deletar imagem do Digital Ocean Spaces:", error);
      return false;
    }
  }

  /**
   * Extrai extensão do arquivo baseada no MIME type
   * @param {string} mimeType - Tipo MIME
   * @returns {string} - Extensão do arquivo com ponto
   */
  getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    };
    return mimeToExt[mimeType] || ".jpg";
  }

  /**
   * Valida se o tipo de arquivo é uma imagem suportada
   * @param {string} mimeType - Tipo MIME
   * @returns {boolean} - True se suportado
   */
  isValidImageType(mimeType) {
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    return validTypes.includes(mimeType);
  }

  /**
   * Valida o tamanho da imagem (MVP: limite simples)
   * @param {number} size - Tamanho em bytes
   * @returns {boolean} - True se dentro do limite
   */
  isValidImageSize(size) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    return size <= maxSize;
  }

  /**
   * Extrai a key do arquivo a partir da URL
   * @param {string} url - URL completa do arquivo
   * @returns {string|null} - Key do arquivo ou null
   */
  extractKeyFromUrl(url) {
    if (!url) return null;

    try {
      // Se já for uma key (sem protocolo), retorna direto
      if (!url.startsWith("http")) return url;

      const urlObj = new URL(url);
      // Remove a primeira barra e o nome do bucket
      const pathWithoutBucket = urlObj.pathname.substring(1);
      const bucketPrefixLength = this.bucketName.length + 1;
      return pathWithoutBucket.substring(bucketPrefixLength);
    } catch (error) {
      console.error("Erro ao extrair key da URL:", error);
      return null;
    }
  }

  /**
   * Gera URL assinada temporária para acesso privado
   * @param {string} key - Chave do arquivo no Spaces
   * @param {number} expiresIn - Tempo de expiração em segundos (padrão: 1 hora)
   * @returns {Promise<string|null>} - URL assinada ou null
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      if (!this.s3Client || !key) return null;

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });
      return signedUrl;
    } catch (error) {
      console.error("Erro ao gerar URL assinada:", error);
      return null;
    }
  }

  /**
   * Processa um objeto substituindo URLs de imagem por URLs assinadas
   * @param {Object} obj - Objeto com campos de URL
   * @param {Array<string>} urlFields - Nomes dos campos que contêm URLs
   * @param {number} expiresIn - Tempo de expiração das URLs
   * @returns {Promise<Object>} - Objeto com URLs assinadas
   */
  async addSignedUrls(obj, urlFields = [], expiresIn = 3600) {
    if (!obj || !this.s3Client) return obj;

    const result = { ...obj };

    for (const field of urlFields) {
      if (result[field]) {
        const key = this.extractKeyFromUrl(result[field]);
        if (key) {
          const signedUrl = await this.getSignedUrl(key, expiresIn);
          if (signedUrl) {
            result[field] = signedUrl;
          }
        }
      }
    }

    return result;
  }

  /**
   * Processa array de objetos substituindo URLs por URLs assinadas
   * @param {Array<Object>} items - Array de objetos
   * @param {Array<string>} urlFields - Campos de URL a processar
   * @param {number} expiresIn - Tempo de expiração
   * @returns {Promise<Array<Object>>} - Array processado
   */
  async addSignedUrlsToArray(items, urlFields = [], expiresIn = 3600) {
    if (!items || !Array.isArray(items) || !this.s3Client) return items;

    return Promise.all(
      items.map((item) => this.addSignedUrls(item, urlFields, expiresIn))
    );
  }
}

module.exports = new ImageUtils();
