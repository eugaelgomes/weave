const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const { env } = require("../../config/enviroment");
const { logger } = require("@theweave/database");

class SpacesService {
  static FOLDER_PATHS = {
    AGENTS: {
      FILES: "files",
      ROOT: "agents",
    },
    BACKUPS: "backups",
    IMAGES: "images",
    NOTES: {
      BANNERS: "banners",
      FILES: "files",
      ICONS: "icons",
      ROOT: "notes",
    },
    NOTES_COMMENTS_FILES: {
      FILES: "files",
      ROOT: "notes-comments-files",
    },
    ORGANIZATIONS: {
      BANNER: "banner",
      LOGO: "logo",
      ROOT: "workspaces",
    },
    PROJECTS: {
      FILES: "files",
      ICONS: "icons",
      ROOT: "projects",
    },
    USERS_CONTENT: {
      AVATAR: "avatar",
      PROFILE: "profile",
      ROOT: "users-content",
    },
  };

  constructor() {
    this.spacesEndpoint = env.storage.endpoint;
    this.accessKeyId = env.storage.accessKey;
    this.secretAccessKey = env.storage.secretKey;
    this.bucketName = env.storage.bucketName;
    this.region = env.storage.region;

    if (!this.spacesEndpoint || !this.accessKeyId || !this.secretAccessKey || !this.bucketName) {
      logger.warn("Storage service not configured, some features will be disabled");
      this.isConfigured = false;
      return;
    }

    this.isConfigured = true;
    this.s3Client = new S3Client({
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      endpoint: this.spacesEndpoint,
      forcePathStyle: false,
      region: this.region,
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

      const buffer = Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent, "utf-8");

      const uploadParams = {
        ACL: "private",
        Body: buffer,
        Bucket: this.bucketName,
        CacheControl: "no-cache, no-store, must-revalidate",
        ContentType: "text/csv",
        Expires: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48H
        Key: key,
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      return {
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        fileName: uniqueFileName,
        key: key,
        size: buffer.length,
        success: true,
      };
    } catch (error) {
      logger.error("Erro ao fazer upload do backup:", error);
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
  async uploadImage(imageBuffer, mimeType, userId, fileName = null, folderPath = null) {
    try {
      const fileExtension = this.getFileExtensionFromMimeType(mimeType);
      const uniqueFileName = fileName || `image_${uuidv4()}${fileExtension}`;
      const key = folderPath
        ? this.buildKey(folderPath, uniqueFileName)
        : this.buildKey(SpacesService.FOLDER_PATHS.IMAGES, String(userId), uniqueFileName);

      const uploadParams = {
        ACL: "public-read",
        Body: imageBuffer,
        Bucket: this.bucketName,
        CacheControl: "max-age=31536000", // Cache por 1 ano
        ContentType: mimeType,
        Key: key,
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      const simpleUrl = `${this.spacesEndpoint}/${this.bucketName}/${key}`;

      return {
        fileName: uniqueFileName,
        key: key,
        size: imageBuffer.length,
        success: true,
        url: simpleUrl,
      };
    } catch (error) {
      logger.error("Erro ao fazer upload para Digital Ocean Spaces:", error);
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
      logger.error("Erro ao deletar imagem do Digital Ocean Spaces:", error);
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
      logger.error("Erro ao fazer download do arquivo:", error);
      throw new Error(`Download falhou: ${error.message}`);
    }
  }

  /**
   * Extrai extensão do arquivo baseada no MIME type
   */
  getFileExtensionFromMimeType(mimeType) {
    const mimeToExt = {
      "application/gzip": ".gz",
      "application/json": ".json",
      "application/msword": ".doc",
      "application/pdf": ".pdf",
      "application/vnd.ms-excel": ".xls",
      "application/vnd.ms-powerpoint": ".ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
      "application/x-rar-compressed": ".rar",
      "application/xml": ".xml",
      "application/zip": ".zip",
      "image/gif": ".gif",
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/svg+xml": ".svg",
      "image/webp": ".webp",
      "text/csv": ".csv",
      "text/markdown": ".md",
      "text/plain": ".txt",
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
    const folderPath = this.buildKey(NOTES.ROOT, userFolder, noteFolder, NOTES.ICONS);
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  async uploadNoteBanner(fileBuffer, mimeType, noteId, userId) {
    const { NOTES } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `${uuidv4()}${ext}`;
    const userFolder = `userId_${userId}`;
    const noteFolder = `noteId_${noteId}`;
    const folderPath = this.buildKey(NOTES.ROOT, userFolder, noteFolder, NOTES.BANNERS);
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  async uploadNoteFile(fileBuffer, mimeType, noteId, userId, originalName = null) {
    const { NOTES } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const safeOriginalName = originalName
      ? originalName.replace(/[^a-zA-Z0-9.-]/g, "_")
      : `file${ext}`;

    const fileName = `${uuidv4()}_${safeOriginalName}`;
    const userFolder = `userId_${userId}`;
    const noteFolder = `noteId_${noteId}`;
    const folderPath = this.buildKey(NOTES.ROOT, userFolder, noteFolder, NOTES.FILES);
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  /**
   * Anexos de comentários em notas.
   * Estrutura: notes-comments-files/{userId}/{noteId}/files/{arquivo}
   */
  async uploadNoteCommentFile(fileBuffer, mimeType, noteId, userId, originalName = null) {
    const { NOTES_COMMENTS_FILES } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const safeOriginalName = originalName
      ? originalName.replace(/[^a-zA-Z0-9.-]/g, "_")
      : `file${ext}`;

    const fileName = `${uuidv4()}_${safeOriginalName}`;
    const userFolder = `userId_${userId}`;
    const noteFolder = `noteId_${noteId}`;
    const folderPath = this.buildKey(
      NOTES_COMMENTS_FILES.ROOT,
      userFolder,
      noteFolder,
      NOTES_COMMENTS_FILES.FILES
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
    const folderPath = this.buildKey(PROJECTS.ROOT, userFolder, projectFolder, PROJECTS.ICONS);
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  async uploadProjectFile(fileBuffer, mimeType, projectId, userId, originalName = null) {
    const { PROJECTS } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const safeOriginalName = originalName
      ? originalName.replace(/[^a-zA-Z0-9.-]/g, "_")
      : `file${ext}`;

    const fileName = `${uuidv4()}_${safeOriginalName}`;
    const userFolder = `userId_${userId}`;
    const projectFolder = `projectId_${projectId}`;
    const folderPath = this.buildKey(PROJECTS.ROOT, userFolder, projectFolder, PROJECTS.FILES);
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  /**
   * Extrai a key (path relativo) da URL completa
   */
  extractKeyFromUrl(url) {
    if (!url) return null;
    const normalize = (value = "") => value.replace(/\/+/g, "/");
    const trimLeadingSlash = (value = "") => value.replace(/^\/+/, "");

    if (!url.startsWith("http")) {
      return trimLeadingSlash(normalize(url));
    }

    try {
      const urlObj = new URL(url);
      const normalizedPath = normalize(urlObj.pathname);
      let path = trimLeadingSlash(normalizedPath);

      const bucketPrefix = `${this.bucketName}/`;
      if (path.startsWith(bucketPrefix)) {
        path = path.substring(bucketPrefix.length);
      }

      return path;
    } catch (error) {
      logger.error("Erro ao extrair key da URL:", error);
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
  // Workspace Assets (logo, banner)
  // Estrutura: workspaces/{orgId}/{logo|banner}/{arquivo}
  // ========================================

  async uploadWorkspaceLogo(fileBuffer, mimeType, workspaceId) {
    const { ORGANIZATIONS } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `org-${workspaceId}-logo${ext}`;
    const folderPath = this.buildKey(
      ORGANIZATIONS.ROOT,
      String(workspaceId),
      ORGANIZATIONS.LOGO
    );
    return this.uploadImage(fileBuffer, mimeType, null, fileName, folderPath);
  }

  async uploadWorkspaceBanner(fileBuffer, mimeType, workspaceId) {
    const { ORGANIZATIONS } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `org-${workspaceId}-banner${ext}`;
    const folderPath = this.buildKey(
      ORGANIZATIONS.ROOT,
      String(workspaceId),
      ORGANIZATIONS.BANNER
    );
    return this.uploadImage(fileBuffer, mimeType, null, fileName, folderPath);
  }

  // ========================================
  // Image Validation
  // ========================================

  isValidImageType(mimeType) {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
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
    const sanitizedExt = extension ? (extension.startsWith(".") ? extension : `.${extension}`) : "";
    return `file_${Date.now()}_${uuidv4()}${sanitizedExt}`;
  }

  validateConfiguration() {
    const config = {
      accessKey: !!this.accessKeyId,
      bucket: !!this.bucketName,
      endpoint: !!this.spacesEndpoint,
      region: !!this.region,
      secretKey: !!this.secretAccessKey,
    };

    const isValid = Object.values(config).every(Boolean);

    return {
      config,
      isValid,
      missing: Object.keys(config).filter((key) => !config[key]),
    };
  }
}

module.exports = new SpacesService();
