const {
  ListObjectsV2Command,
  DeleteObjectCommand,
  CopyObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const spacesService = require("@/services/storage/index");

const SYSTEM_RESERVED_ROOTS = [
  "agents",
  "backups",
  "images",
  "notes",
  "notes-comments-files",
  "organizations",
  "projects",
  "users-content",
];

class FileManagerService {
  /**
   * Verifica se o caminho (Key) pertence a uma estrutura reservada do sistema.
   * Caminhos de sistema não podem ser renomeados ou deletados via File Manager.
   * @param {string} key
   * @returns {boolean}
   */
  isProtectedPath(key) {
    if (!key) return false;
    const normalizedKey = key.startsWith("/") ? key.slice(1) : key;
    const root = normalizedKey.split("/")[0];
    return SYSTEM_RESERVED_ROOTS.includes(root);
  }

  async ensureReady() {
    await spacesService.ensureConfigured();
  }

  /**
   * Lista os arquivos e pastas num prefixo
   */
  async listFiles(prefix = "") {
    await this.ensureReady();
    
    // Garantir que pastas terminem com barra para o S3
    const normalizedPrefix = prefix && !prefix.endsWith("/") ? `${prefix}/` : prefix;

    const command = new ListObjectsV2Command({
      Bucket: spacesService.bucketName,
      Prefix: normalizedPrefix,
      Delimiter: "/", // Agrupa os resultados por pasta
    });

    const response = await spacesService.s3Client.send(command);

    // Mapear pastas
    const folders = (response.CommonPrefixes || []).map((p) => {
      const folderKey = p.Prefix;
      return {
        type: "folder",
        key: folderKey,
        name: folderKey.replace(normalizedPrefix, "").replace("/", ""),
        isProtected: this.isProtectedPath(folderKey),
      };
    });

    // Mapear arquivos (ignorando pastas puras que o S3 as vezes retorna como objeto size 0)
    const files = (response.Contents || [])
      .filter((item) => item.Key !== normalizedPrefix)
      .map((item) => {
        return {
          type: "file",
          key: item.Key,
          name: item.Key.replace(normalizedPrefix, ""),
          size: item.Size,
          lastModified: item.LastModified,
          isProtected: this.isProtectedPath(item.Key),
        };
      });

    return [...folders, ...files];
  }

  /**
   * Cria uma pasta vazia no S3 (objeto com size 0 e terminando em /)
   */
  async createFolder(folderPath) {
    await this.ensureReady();
    if (this.isProtectedPath(folderPath)) {
      throw new Error("Você não tem permissão para criar pastas protegidas do sistema.");
    }

    const key = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;
    
    const command = new PutObjectCommand({
      Bucket: spacesService.bucketName,
      Key: key,
      Body: "",
    });

    await spacesService.s3Client.send(command);
    return { key, success: true };
  }

  /**
   * Deleta um arquivo ou pasta
   */
  async deleteItem(key) {
    await this.ensureReady();
    if (this.isProtectedPath(key)) {
      throw new Error("Arquivos ou pastas de sistema não podem ser deletados.");
    }

    // Nota: Se for uma pasta, deletar apenas a pasta no S3 não deleta os arquivos dentro.
    // Para simplificar no File Manager, o front deve deletar itens específicos, ou teríamos que 
    // listar e deletar em massa. Assumimos que 'key' é o item exato.
    const command = new DeleteObjectCommand({
      Bucket: spacesService.bucketName,
      Key: key,
    });

    await spacesService.s3Client.send(command);
    return { success: true };
  }

  /**
   * Renomear um arquivo requer Copy e depois Delete no S3.
   */
  async renameFile(oldKey, newKey) {
    await this.ensureReady();
    if (this.isProtectedPath(oldKey)) {
      throw new Error("Arquivos ou pastas de sistema não podem ser renomeados.");
    }
    if (this.isProtectedPath(newKey)) {
      throw new Error("O novo nome conflita com um diretório reservado do sistema.");
    }

    // Copiar
    const copyCommand = new CopyObjectCommand({
      Bucket: spacesService.bucketName,
      CopySource: `${spacesService.bucketName}/${oldKey}`,
      Key: newKey,
    });
    await spacesService.s3Client.send(copyCommand);

    // Deletar o antigo
    const deleteCommand = new DeleteObjectCommand({
      Bucket: spacesService.bucketName,
      Key: oldKey,
    });
    await spacesService.s3Client.send(deleteCommand);

    return { key: newKey, success: true };
  }
}

module.exports = new FileManagerService();
