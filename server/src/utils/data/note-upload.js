const multer = require("multer");

const storage = multer.memoryStorage();

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

const ALLOWED_FILE_TYPES = [
  // Imagens
  ...ALLOWED_IMAGE_TYPES,
  // Documentos
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  // Arquivos compactados
  "application/zip",
  "application/x-rar-compressed",
  "application/gzip",
  // Outros
  "application/json",
  "application/xml",
];

/**
 * Upload combinado para update de nota
 * Aceita: icon (1), banner (1) e files (múltiplos)
 */
/**
 * Upload de anexos para comentários em notas (mesmos MIMEs que `files` na atualização de nota).
 */
const commentFilesUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      return cb(new Error("Formato de arquivo não permitido."), false);
    }
    cb(null, true);
  },
});

const noteUpdateUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "icon" || file.fieldname === "banner") {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return cb(
          new Error(
            `Formato de ${file.fieldname} não permitido. Use: PNG, JPEG, WEBP, GIF ou SVG.`
          ),
          false
        );
      }
    } else if (file.fieldname === "files") {
      if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
        return cb(new Error("Formato de arquivo não permitido."), false);
      }
    } else {
      return cb(new Error(`Campo '${file.fieldname}' não permitido.`), false);
    }
    cb(null, true);
  },
});

module.exports = { commentFilesUpload, noteUpdateUpload };
