import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommandInput,
  DeleteObjectCommandInput,
  GetObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
// pg-pool deleted during refactor, DB fallback disabled for now
export interface StorageConfig {
  accessKeyId?: string;
  bucketName?: string;
  region?: string;
  secretAccessKey?: string;
  spacesEndpoint?: string;
}

export interface UploadResult {
  fileName: string;
  key: string;
  size: number;
  success: boolean;
  url?: string;
  expiresAt?: Date;
}

export class SpacesService {
  public static readonly FOLDER_PATHS = {
    AGENTS: {
      FILES: "files",
      ROOT: "agents",
    },
    BACKUPS: "backups",
    IMAGES: "images",
    NOTES: {
      BANNERS: "banners",
      DOCUMENT_IMAGES: "document-images",
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
      ROOT: "organizations",
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

  public s3Client: S3Client | null = null;
  public isConfigured: boolean = false;
  public spacesEndpoint?: string;
  public accessKeyId?: string;
  public secretAccessKey?: string;
  public bucketName?: string;
  public region?: string;

  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.init();
  }

  public async init(): Promise<void> {
    try {
      const isFlagEnabled =
        String(process.env.STORAGE_ENABLED ?? process.env.S3_STORAGE_ENABLED ?? "")
          .trim()
          .toLowerCase() === "true";

      this.spacesEndpoint =
        process.env.STORAGE_ENDPOINT ||
        process.env.S3_ENDPOINT ||
        process.env.DO_SPACES_ENDPOINT ||
        process.env.AWS_ENDPOINT_URL;

      this.accessKeyId =
        process.env.STORAGE_ACCESS_KEY ||
        process.env.S3_ACCESS_KEY ||
        process.env.DO_SPACES_ACCESS_KEY ||
        process.env.AWS_ACCESS_KEY_ID;

      this.secretAccessKey =
        process.env.STORAGE_SECRET_KEY ||
        process.env.S3_SECRET_KEY ||
        process.env.DO_SPACES_SECRET_KEY ||
        process.env.AWS_SECRET_ACCESS_KEY;

      this.bucketName =
        process.env.STORAGE_BUCKET_NAME ||
        process.env.S3_BUCKET_NAME ||
        process.env.DO_SPACES_BUCKET_NAME ||
        process.env.AWS_BUCKET_NAME;

      this.region =
        process.env.STORAGE_REGION ||
        process.env.S3_REGION ||
        process.env.DO_SPACES_REGION ||
        process.env.AWS_REGION ||
        "us-east-1";

      if (
        !isFlagEnabled ||
        !this.spacesEndpoint ||
        !this.accessKeyId ||
        !this.secretAccessKey ||
        !this.bucketName ||
        !this.region
      ) {
        this.isConfigured = false;
        return;
      }

      this.s3Client = new S3Client({
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
        endpoint: this.spacesEndpoint,
        forcePathStyle: true,
        region: this.region,
      });

      this.isConfigured = true;
    } catch (error) {
      console.error("Error initializing Storage Service:", error);
      this.isConfigured = false;
    }
  }

  public async ensureConfigured(): Promise<void> {
    await this.initPromise;
    if (!this.isConfigured) {
      throw new Error(
        "O armazenamento de arquivos (Storage) não está ativo ou não foi configurado via variáveis de ambiente."
      );
    }
  }

  public buildKey(...segments: (string | null | undefined)[]): string {
    return segments.filter(Boolean).join("/");
  }

  public async uploadBackup(
    fileContent: Buffer | string,
    userId: string | number,
    fileName: string | null = null
  ): Promise<UploadResult> {
    await this.ensureConfigured();
    try {
      const { BACKUPS } = SpacesService.FOLDER_PATHS;
      const timestamp = Date.now();
      const uniqueFileName = fileName || `backup_${userId}_${timestamp}.csv`;
      const key = this.buildKey(BACKUPS, String(userId), uniqueFileName);

      const buffer = Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent, "utf-8");

      const uploadParams: PutObjectCommandInput = {
        Body: buffer,
        Bucket: this.bucketName,
        CacheControl: "no-cache, no-store, must-revalidate",
        ContentType: "text/csv",
        Expires: new Date(Date.now() + 48 * 60 * 60 * 1000),
        Key: key,
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client!.send(command);

      return {
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        fileName: uniqueFileName,
        key: key,
        size: buffer.length,
        success: true,
      };
    } catch (error: any) {
      console.error("Erro ao fazer upload do backup:", error);
      throw new Error(`Upload de backup falhou: ${error?.message || error}`);
    }
  }

  public async uploadImage(
    imageBuffer: Buffer,
    mimeType: string,
    userId: string | number | null,
    fileName: string | null = null,
    folderPath: string | null = null
  ): Promise<UploadResult> {
    await this.ensureConfigured();
    try {
      const fileExtension = this.getFileExtensionFromMimeType(mimeType);
      const uniqueFileName = fileName || `image_${uuidv4()}${fileExtension}`;
      const key = folderPath
        ? this.buildKey(folderPath, uniqueFileName)
        : this.buildKey(SpacesService.FOLDER_PATHS.IMAGES, userId ? String(userId) : null, uniqueFileName);

      const uploadParams: PutObjectCommandInput = {
        Body: imageBuffer,
        Bucket: this.bucketName,
        CacheControl: "max-age=31536000",
        ContentType: mimeType,
        Key: key,
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client!.send(command);

      const publicUrl = `${this.spacesEndpoint}/${this.bucketName}/${key}`;

      return {
        fileName: uniqueFileName,
        key: key,
        size: imageBuffer.length,
        success: true,
        url: publicUrl,
      };
    } catch (error: any) {
      console.error("Erro ao fazer upload para Storage:", error);
      throw new Error(`Upload failed: ${error?.message || error}`);
    }
  }

  public async deleteImage(key: string): Promise<boolean> {
    await this.ensureConfigured();
    try {
      const deleteParams: DeleteObjectCommandInput = {
        Bucket: this.bucketName,
        Key: key,
      };

      const command = new DeleteObjectCommand(deleteParams);
      await this.s3Client!.send(command);

      return true;
    } catch (error) {
      console.error("Erro ao deletar imagem do Storage:", error);
      return false;
    }
  }

  public async deleteBackup(key: string): Promise<boolean> {
    return this.deleteImage(key);
  }

  public async downloadFile(key: string): Promise<Buffer> {
    await this.ensureConfigured();
    try {
      const getParams: GetObjectCommandInput = {
        Bucket: this.bucketName,
        Key: key,
      };

      const command = new GetObjectCommand(getParams);
      const response = await this.s3Client!.send(command);

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error: any) {
      console.error("Erro ao fazer download do arquivo:", error);
      throw new Error(`Download falhou: ${error?.message || error}`);
    }
  }

  public getFileExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
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
      "video/mp4": ".mp4",
      "video/ogg": ".ogv",
      "video/quicktime": ".mov",
      "video/webm": ".webm",
    };

    return mimeToExt[mimeType] || ".bin";
  }

  public async uploadNoteIcon(fileBuffer: Buffer, mimeType: string, noteId: string | number, userId: string | number): Promise<UploadResult> {
    const { NOTES } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `${uuidv4()}${ext}`;
    const folderPath = this.buildKey(NOTES.ROOT, `userId_${userId}`, `noteId_${noteId}`, NOTES.ICONS);
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  public async uploadNoteBanner(fileBuffer: Buffer, mimeType: string, noteId: string | number, userId: string | number): Promise<UploadResult> {
    const { NOTES } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `${uuidv4()}${ext}`;
    const folderPath = this.buildKey(NOTES.ROOT, `userId_${userId}`, `noteId_${noteId}`, NOTES.BANNERS);
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  public async uploadNoteFile(fileBuffer: Buffer, mimeType: string, noteId: string | number, userId: string | number, originalName: string | null = null): Promise<UploadResult> {
    const { NOTES } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const safeOriginalName = originalName ? originalName.replace(/[^a-zA-Z0-9.-]/g, "_") : `file${ext}`;
    const fileName = `${uuidv4()}_${safeOriginalName}`;
    const folderPath = this.buildKey(NOTES.ROOT, `userId_${userId}`, `noteId_${noteId}`, NOTES.FILES);
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  public async uploadNoteDocumentImage(fileBuffer: Buffer, mimeType: string, noteId: string | number, userId: string | number, originalName: string | null = null): Promise<UploadResult> {
    const { NOTES } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const safeOriginalName = originalName ? originalName.replace(/[^a-zA-Z0-9.-]/g, "_") : `image${ext}`;
    const fileName = `${uuidv4()}_${safeOriginalName}`;
    const folderPath = this.buildKey(NOTES.ROOT, `userId_${userId}`, `noteId_${noteId}`, NOTES.DOCUMENT_IMAGES);
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  public async uploadNoteCommentFile(fileBuffer: Buffer, mimeType: string, noteId: string | number, userId: string | number, originalName: string | null = null): Promise<UploadResult> {
    const { NOTES_COMMENTS_FILES } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const safeOriginalName = originalName ? originalName.replace(/[^a-zA-Z0-9.-]/g, "_") : `file${ext}`;
    const fileName = `${uuidv4()}_${safeOriginalName}`;
    const folderPath = this.buildKey(NOTES_COMMENTS_FILES.ROOT, `userId_${userId}`, `noteId_${noteId}`, NOTES_COMMENTS_FILES.FILES);
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  public async uploadProjectIcon(fileBuffer: Buffer, mimeType: string, projectId: string | number, userId: string | number): Promise<UploadResult> {
    const { PROJECTS } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `${uuidv4()}${ext}`;
    const folderPath = this.buildKey(PROJECTS.ROOT, `userId_${userId}`, `projectId_${projectId}`, PROJECTS.ICONS);
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  public async uploadProjectFile(fileBuffer: Buffer, mimeType: string, projectId: string | number, userId: string | number, originalName: string | null = null): Promise<UploadResult> {
    const { PROJECTS } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const safeOriginalName = originalName ? originalName.replace(/[^a-zA-Z0-9.-]/g, "_") : `file${ext}`;
    const fileName = `${uuidv4()}_${safeOriginalName}`;
    const folderPath = this.buildKey(PROJECTS.ROOT, `userId_${userId}`, `projectId_${projectId}`, PROJECTS.FILES);
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  public extractKeyFromUrl(url: string | null | undefined): string | null {
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
      if (this.bucketName && path.startsWith(bucketPrefix)) {
        path = path.substring(bucketPrefix.length);
      }

      return path;
    } catch (error) {
      console.error("Erro ao extrair key da URL:", error);
      return null;
    }
  }

  public getFileUrl(key: string | null | undefined): string | null {
    if (!key) return null;
    if (
      key.startsWith("http://") ||
      key.startsWith("https://") ||
      key.startsWith("data:") ||
      key.startsWith("blob:")
    ) {
      return key;
    }

    return `${this.spacesEndpoint}/${this.bucketName}/${key}`;
  }

  public async getSignedUrl(key: string | null | undefined, expiresIn: number = 43200): Promise<string | null> {
    await this.ensureConfigured();
    if (!key) return null;
    if (
      key.startsWith("http://") ||
      key.startsWith("https://") ||
      key.startsWith("data:") ||
      key.startsWith("blob:")
    ) {
      return key;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await awsGetSignedUrl(this.s3Client!, command, { expiresIn });
    } catch (error) {
      console.error("Erro ao gerar URL assinada:", error);
      return this.getFileUrl(key);
    }
  }

  public async uploadProfileImage(fileBuffer: Buffer, mimeType: string, userId: string | number): Promise<UploadResult> {
    const { USERS_CONTENT } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `user-${userId}-avatar${ext}`;
    const folderPath = this.buildKey(USERS_CONTENT.ROOT, USERS_CONTENT.PROFILE, String(userId), USERS_CONTENT.AVATAR);
    return this.uploadImage(fileBuffer, mimeType, userId, fileName, folderPath);
  }

  public async uploadOrganizationLogo(fileBuffer: Buffer, mimeType: string, organizationId: string | number): Promise<UploadResult> {
    const { ORGANIZATIONS } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `org-${organizationId}-logo${ext}`;
    const folderPath = this.buildKey(ORGANIZATIONS.ROOT, String(organizationId), ORGANIZATIONS.LOGO);
    return this.uploadImage(fileBuffer, mimeType, null, fileName, folderPath);
  }

  public async uploadOrganizationBanner(fileBuffer: Buffer, mimeType: string, organizationId: string | number): Promise<UploadResult> {
    const { ORGANIZATIONS } = SpacesService.FOLDER_PATHS;
    const ext = this.getFileExtensionFromMimeType(mimeType);
    const fileName = `org-${organizationId}-banner${ext}`;
    const folderPath = this.buildKey(ORGANIZATIONS.ROOT, String(organizationId), ORGANIZATIONS.BANNER);
    return this.uploadImage(fileBuffer, mimeType, null, fileName, folderPath);
  }

  public isValidImageType(mimeType: string): boolean {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    return validTypes.includes(mimeType);
  }

  public isValidImageSize(size: number): boolean {
    const maxSize = 5 * 1024 * 1024; // 5MB
    return size <= maxSize;
  }

  public generateUniqueFileName(extension: string = ""): string {
    const sanitizedExt = extension ? (extension.startsWith(".") ? extension : `.${extension}`) : "";
    return `file_${Date.now()}_${uuidv4()}${sanitizedExt}`;
  }

  public validateConfiguration(): { config: Record<string, boolean>; isValid: boolean; missing: string[] } {
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
      missing: Object.keys(config).filter((key) => !config[key as keyof typeof config]),
    };
  }
}

export const storageService = new SpacesService();
export const spacesService = storageService;
