const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
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
      const key = `profile-images/${filename}`;

      // Upload para Digital Ocean Spaces
      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: mimeType,
        ACL: "public-read", // Imagem publicamente acessível
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
}

module.exports = new ImageUtils();
