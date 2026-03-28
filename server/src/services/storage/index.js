const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

class SpacesService {
  static FOLDER_PATHS = {
    BACKUPS: "backups",
    IMAGES: "images",
    NOTES: {
      ROOT: "notes",
      ICONS: "icons",
      BANNERS: "banners",
      FILES: "files",
    },
    PROJECTS: {
      ROOT: "projects",
      ICONS: "icons",
      FILES: "files",
    },
    USERS_CONTENT: {
      ROOT: "users-content",
      PROFILE: "profile",
      AVATAR: "avatar",
    },
    ORGANIZATIONS: {
      ROOT: "organizations",
      LOGO: "logo",
      BANNER: "banner",
    },
    AGENTS: {
      ROOT: "agents",
      FILES: "files",
    },
  };

  constructor() {
    this.spacesEndpoint = process.env.DO_SPACES_ENDPOINT;
    this.accessKeyId = process.env.DO_SPACES_ACCESS_KEY;
    this.secretAccessKey = process.env.DO_SPACES_SECRET_KEY;
    // Força o bucket central para wn-storage
    this.bucketName = process.env.DO_SPACES_BUCKET_NAME || "wn-storage";
    this.region = process.env.DO_SPACES_REGION || "sfo3";

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
      forcePathStyle: false,
    });
  }

  /**
   * Constrói a key (path) do arquivo no bucket unindo os segmentos com "/".
   * Filtra segmentos vazios/nulos automaticamente.
   * @param {...string} segments - Segmentos do path (pasta, subpasta, nome do arquivo)
   * @returns {string} Key final para uso no S3
   *
   * @example
   * buildKey('notes', '42', 'icons', 'icon_abc.png')
   * // => 'notes/42/icons/icon_abc.png'
   */
  buildKey(...segments) {
    return segments.filter(Boolean).join("/");
  }

  /**
   * Faz upload de um arquivo de backup para o Digital Ocean Spaces na raiz do bucket
   * @param {Buffer|string} fileContent - Conteúdo do arquivo (Buffer ou string)
   * @param {string} userId - ID do usuário
   * @param {string} fileName - Nome do arquivo (opcional)
   * @returns {Promise<Object>} - Objeto com key do arquivo
   */
  async uploadBackup(fileContent, userId, fileName = null) {
    try {
      const { BACKUPS } = SpacesService.FOLDER_PATHS;
      const timestamp = Date.now();
      const uniqueFileName = fileName || `backup_${userId}_${timestamp}.csv`;
      const key = this.buildKey(BACKUPS, String(userId), uniqueFileName);

      const buffer = Buffer.isBuffer(fileContent)
        ? fileContent
        : Buffer.from(fileContent, "utf-8");

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: "text/csv",
        ACL: "private",
        CacheControl: "no-cache, no-store, must-revalidate",
        Expires: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48H
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
   * Faz upload de uma imagem genérica
   * @param {Buffer} imageBuffer - Buffer da imagem
   * @param {string} mimeType - Tipo MIME da imagem
   * @param {string} userId - ID do usuário dono do arquivo
   * @param {string} fileName - Nome personalizado do arquivo (opcional)
   * @param {string} folderPath - Path completo da pasta no bucket (opcional)
   * @returns {Promise<Object>} - Objeto com URL e key do arquivo
   */
  async uploadImage(
    imageBuffer,
    mimeType,
    userId,
    fileName = null,
    folderPath = null
  ) {
    try {
      const fileExtension = this.getFileExtensionFromMimeType(mimeType);
      const uniqueFileName = fileName || `image_${uuidv4()}${fileExtension}`;
      const key = folderPath
        ? this.buildKey(folderPath, uniqueFileName)
        : this.buildKey(
            SpacesService.FOLDER_PATHS.IMAGES,
            String(userId),
            uniqueFileName
          );

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: mimeType,
        ACL: "public-read",
        CacheControl: "max-age=31536000", // Cache por 1 ano
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      const publicUrl =
        `${this.spacesEndpoint}/${this.bucketName}/${key}`.replace(
          "digitaloceanspaces.com",
          `${this.region}.digitaloceanspaces.com`
        );

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
   * Deleta um arquivo do Digital Ocean Spaces
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
   * Faz download de um arquivo
   */
  async downloadFile(key) {
    try {
      const getParams = {
        Bucket: this.bucketName,
        Key: key,
      };

      const command = new GetObjectCommand(getParams);
      const response = await this.s3Client.send(command);

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
   */
  getFileExtensionFromMimeType(mimeType) {
    const mimeToExt = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "image/svg+xml": ".svg",
      "application/pdf": ".pdf",
      "application/msword": ".doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        ".docx",
      "application/vnd.ms-excel": ".xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        ".xlsx",
      "application/vnd.ms-powerpoint": ".ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        ".pptx",
      "text/plain": ".txt",
      "text/csv": ".csv",
      "text/markdown": ".md",
      "application/zip": ".zip",
      "application/x-rar-compressed": ".rar",
      "application/gzip": ".gz",
      "application/json": ".json",
      "application/xml": ".xml",
    };

    return mimeToExt[mimeType] || ".bin";
  }

  // ========================================
  // Note Assets (icon, banner, files)
  // Estrutura: notes/{userId}/{noteId}/{icons|banners|files}/{arquivo}
  // ========================================

  async uploadNoteIcon(fileBuffer, mimeType, noteId, userId) {
    const { NOTES } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `${uuidv4()}${ext}`;
    const userFolder = `userId_${userId}`;
    const noteFolder = `noteId_${noteId}`;
    const folderPath = this.buildKey(
      NOTES.ROOT,
      userFolder,
      noteFolder,
      NOTES.ICONS
    );
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  async uploadNoteBanner(fileBuffer, mimeType, noteId, userId) {
    const { NOTES } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `${uuidv4()}${ext}`;
    const userFolder = `userId_${userId}`;
    const noteFolder = `noteId_${noteId}`;
    const folderPath = this.buildKey(
      NOTES.ROOT,
      userFolder,
      noteFolder,
      NOTES.BANNERS
    );
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  async uploadNoteFile(
    fileBuffer,
    mimeType,
    noteId,
    userId,
    originalName = null
  ) {
    const { NOTES } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const safeOriginalName = originalName
      ? originalName.replace(/[^a-zA-Z0-9.-]/g, "_")
      : `file${ext}`;

    const fileName = `${uuidv4()}_${safeOriginalName}`;
    const userFolder = `userId_${userId}`;
    const noteFolder = `noteId_${noteId}`;
    const folderPath = this.buildKey(
      NOTES.ROOT,
      userFolder,
      noteFolder,
      NOTES.FILES
    );
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  // ========================================
  // Project Assets (icon, files)
  // Estrutura: projects/{userId}/{projectId}/{icons|files}/{arquivo}
  // ========================================

  async uploadProjectIcon(fileBuffer, mimeType, projectId, userId) {
    const { PROJECTS } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `${uuidv4()}${ext}`;
    const userFolder = `userId_${userId}`;
    const projectFolder = `projectId_${projectId}`;
    const folderPath = this.buildKey(
      PROJECTS.ROOT,
      userFolder,
      projectFolder,
      PROJECTS.ICONS
    );
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  async uploadProjectFile(
    fileBuffer,
    mimeType,
    projectId,
    userId,
    originalName = null
  ) {
    const { PROJECTS } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const safeOriginalName = originalName
      ? originalName.replace(/[^a-zA-Z0-9.-]/g, "_")
      : `file${ext}`;

    const fileName = `${uuidv4()}_${safeOriginalName}`;
    const userFolder = `userId_${userId}`;
    const projectFolder = `projectId_${projectId}`;
    const folderPath = this.buildKey(
      PROJECTS.ROOT,
      userFolder,
      projectFolder,
      PROJECTS.FILES
    );
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  /**
   * Extrai a key (path relativo) da URL completa
   */
  extractKeyFromUrl(url) {
    if (!url) return null;
    if (!url.startsWith("http")) {
      return url.startsWith("/") ? url.substring(1) : url;
    }

    try {
      const urlObj = new URL(url);
      const pathWithoutBucket = urlObj.pathname.substring(1);
      const bucketPrefixLength = this.bucketName.length + 1;
      return pathWithoutBucket.substring(bucketPrefixLength);
    } catch (error) {
      console.error("Erro ao extrair key da URL:", error);
      return null;
    }
  }

  // ========================================
  // User Profile Avatar
  // Estrutura: users-content/profile/{userId}/avatar/{arquivo}
  // ========================================

  async uploadProfileImage(fileBuffer, mimeType, userId) {
    const { USERS_CONTENT } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `user-${userId}-avatar${ext}`;
    const folderPath = this.buildKey(
      USERS_CONTENT.ROOT,
      USERS_CONTENT.PROFILE,
      String(userId),
      USERS_CONTENT.AVATAR
    );
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  // ========================================
  // Organization Assets (logo, banner)
  // Estrutura: organizations/{orgId}/{logo|banner}/{arquivo}
  // ========================================

  async uploadOrganizationLogo(fileBuffer, mimeType, organizationId) {
    const { ORGANIZATIONS } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `org-${organizationId}-logo${ext}`;
    const folderPath = this.buildKey(
      ORGANIZATIONS.ROOT,
      String(organizationId),
      ORGANIZATIONS.LOGO
    );
    return this.uploadImage(fileBuffer, mimeType, null, fileName, folderPath);
  }

  async uploadOrganizationBanner(fileBuffer, mimeType, organizationId) {
    const { ORGANIZATIONS } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `org-${organizationId}-banner${ext}`;
    const folderPath = this.buildKey(
      ORGANIZATIONS.ROOT,
      String(organizationId),
      ORGANIZATIONS.BANNER
    );
    return this.uploadImage(fileBuffer, mimeType, null, fileName, folderPath);
  }

  // ========================================
  // Image Validation
  // ========================================

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

  isValidImageSize(size) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    return size <= maxSize;
  }

  /**
   * Gera um nome de arquivo único com base em timestamp + UUID.
   * @param {string} extension - extensão sem ponto ou com ponto.
   * @returns {string}
   */
  generateUniqueFileName(extension = "") {
    const sanitizedExt = extension
      ? extension.startsWith(".")
        ? extension
        : `.${extension}`
      : "";
    return `file_${Date.now()}_${uuidv4()}${sanitizedExt}`;
  }

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
