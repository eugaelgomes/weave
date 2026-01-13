const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

class SpacesService {
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
      throw new Error(
        "Digital Ocean Spaces credentials not configured properly"
      );
    }

    this.s3Client = new S3Client({
      endpoint: this.spacesEndpoint,
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      forcePathStyle: false, // Digital Ocean Spaces usa virtual hosted-style
    });
  }

  /**
   * Faz upload de um arquivo de backup para o Digital Ocean Spaces
   * @param {Buffer|string} fileContent - Conteúdo do arquivo (Buffer ou string)
   * @param {string} userId - ID do usuário
   * @param {string} fileName - Nome do arquivo (opcional)
   * @returns {Promise<Object>} - Objeto com key do arquivo
   */
  async uploadBackup(fileContent, userId, fileName = null) {
    try {
      const timestamp = Date.now();
      const uniqueFileName = fileName || `backup_${userId}_${timestamp}.csv`;
      const key = `weave-notes/users-content/backups/${userId}/${uniqueFileName}`;

      // Converter string para Buffer se necessário
      const buffer = Buffer.isBuffer(fileContent) 
        ? fileContent 
        : Buffer.from(fileContent, 'utf-8');

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'text/csv',
        ACL: 'private', // Backup privado, só acessível via token
        CacheControl: 'no-cache, no-store, must-revalidate',
        Expires: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 horas
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      return {
        success: true,
        key: key,
        fileName: uniqueFileName,
        size: buffer.length,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      };
    } catch (error) {
      console.error("Erro ao fazer upload do backup:", error);
      throw new Error(`Upload de backup falhou: ${error.message}`);
    }
  }

  /**
   * Faz upload de uma imagem para o Digital Ocean Spaces
   * @param {Buffer} imageBuffer - Buffer da imagem
   * @param {string} mimeType - Tipo MIME da imagem
   * @param {string} folder - Pasta onde salvar (ex: 'profile-images')
   * @param {string} fileName - Nome personalizado do arquivo (opcional)
   * @returns {Promise<Object>} - Objeto com URL e key do arquivo
   */
  async uploadImage(imageBuffer, mimeType, folder = "images", fileName = null) {
    try {
      // Gerar nome único para o arquivo se não fornecido
      const fileExtension = this.getFileExtensionFromMimeType(mimeType);
      const uniqueFileName = fileName || `${uuidv4()}${fileExtension}`;
      const key = `${folder}/${uniqueFileName}`;

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: mimeType,
        ACL: "public-read", // Garante que o arquivo seja público (opcional, dependendo da config do bucket)
        CacheControl: "max-age=31536000", // Cache por 1 ano
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      // Construir URL pública direta
      // Nota: Certifique-se de que o bucket permite acesso público ou use CDN
      const publicUrl =
        `${this.spacesEndpoint}/${this.bucketName}/${key}`.replace(
          "digitaloceanspaces.com",
          `${this.region}.digitaloceanspaces.com`
        );
      // OBS: A construção da URL acima pode variar dependendo se o endpoint já inclui a região ou não.
      // Geralmente em DO Spaces: https://bucket.region.digitaloceanspaces.com/key
      // Mas mantendo a lógica simples baseada no seu código original:
      const simpleUrl = `${this.spacesEndpoint}/${this.bucketName}/${key}`;

      return {
        success: true,
        url: simpleUrl,
        key: key,
        fileName: uniqueFileName,
        size: imageBuffer.length,
      };
    } catch (error) {
      console.error("Erro ao fazer upload para Digital Ocean Spaces:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Deleta uma imagem do Digital Ocean Spaces
   * @param {string} key - Chave do arquivo no Spaces
   * @returns {Promise<boolean>} - True se deletado com sucesso
   */
  async deleteImage(key) {
    try {
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
   * Faz download de um arquivo do Digital Ocean Spaces
   * @param {string} key - Chave do arquivo no Spaces
   * @returns {Promise<Buffer>} - Buffer com conteúdo do arquivo
   */
  async downloadFile(key) {
    try {
      const getParams = {
        Bucket: this.bucketName,
        Key: key,
      };

      const command = new GetObjectCommand(getParams);
      const response = await this.s3Client.send(command);

      // Converter stream para buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error("Erro ao fazer download do arquivo:", error);
      throw new Error(`Download falhou: ${error.message}`);
    }
  }

  /**
   * Extrai extensão do arquivo baseada no MIME type
   * @param {string} mimeType - Tipo MIME
   * @returns {string} - Extensão do arquivo com ponto
   */
  getFileExtensionFromMimeType(mimeType) {
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
   * Extrai a key do arquivo a partir da URL
   * @param {string} url - URL completa do arquivo
   * @returns {string} - Key do arquivo
   */
  extractKeyFromUrl(url) {
    if (!url) return null;

    try {
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
   * Valida se as configurações estão corretas
   * @returns {Object} - Status da configuração
   */
  validateConfiguration() {
    const config = {
      endpoint: !!this.spacesEndpoint,
      accessKey: !!this.accessKeyId,
      secretKey: !!this.secretAccessKey,
      bucket: !!this.bucketName,
      region: !!this.region,
    };

    const isValid = Object.values(config).every(Boolean);

    return {
      isValid,
      config,
      missing: Object.keys(config).filter((key) => !config[key]),
    };
  }
}

module.exports = new SpacesService();
