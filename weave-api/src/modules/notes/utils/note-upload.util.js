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

/** Body media for notes (Tiptap): same multipart field `documentImages`, images or short videos */
const ALLOWED_DOCUMENT_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
  "video/x-msvideo", // avi
  "video/x-matroska", // mkv
];

const ALLOWED_DOCUMENT_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_VIDEO_TYPES];

const ALLOWED_FILE_TYPES = [
  // Imagens
  ...ALLOWED_IMAGE_TYPES,
  // Vídeos
  ...ALLOWED_DOCUMENT_VIDEO_TYPES,
  // Áudio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/webm",
  "audio/aac",
  "audio/mp4",
  // Documentos
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/rtf",
  "application/epub+zip",
  // Texto e Código
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/html",
  "text/css",
  "text/javascript",
  "application/javascript",
  "application/typescript",
  "application/json",
  "application/xml",
  "text/xml",
  // Arquivos compactados
  "application/zip",
  "application/x-rar-compressed",
  "application/gzip",
  "application/x-7z-compressed",
  "application/x-tar",
];

/**
 * Upload combinado para update de nota
 * Aceita: icon (1), banner (1), files (múltiplos) e documentImages (múltiplos)
 */
/**
 * Upload de anexos para comentários em notas (mesmos MIMEs que `files` na atualização de nota).
 */
const commentFilesUpload = multer({
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      return cb(new Error("Formato de arquivo não permitido."), false);
    }
    cb(null, true);
  },
  limits: { fileSize: MAX_FILE_SIZE },
  storage,
});

const noteUpdateUpload = multer({
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
    } else if (file.fieldname === "documentImages") {
      if (!ALLOWED_DOCUMENT_MEDIA_TYPES.includes(file.mimetype)) {
        return cb(
          new Error(
            "Formato de média do documento não permitido. Imagens: PNG, JPEG, WEBP, GIF ou SVG. Vídeos: MP4, WebM, MOV, OGG, AVI ou MKV."
          ),
          false
        );
      }
    } else {
      return cb(new Error(`Campo '${file.fieldname}' não permitido.`), false);
    }
    cb(null, true);
  },
  limits: { fileSize: MAX_FILE_SIZE },
  storage,
});

module.exports = { commentFilesUpload, noteUpdateUpload };
