const imageUtils = require("@/middlewares/data/image-utils");

/**
 */
const validateImageMVP = (req, res, next) => {
  try {
    // Se não há arquivo, continua
    if (!req.file || !req.file.buffer) {
      return next();
    }

    // Validação básica de tipo MIME
    if (!imageUtils.isValidImageType(req.file.mimetype)) {
      return res.status(400).json({
        error: "Invalid file type",
        message: "Only JPEG, PNG, WebP and GIF images are allowed.",
      });
    }

    // Validação básica de tamanho
    if (!imageUtils.isValidImageSize(req.file.size)) {
      return res.status(413).json({
        error: "File too large",
        message: `Image size (${Math.round(req.file.size / 1024 / 1024)}MB) exceeds limit (5MB).`,
      });
    }

    next();
  } catch (error) {
    console.error("Erro no middleware de validação de imagem:", error);
    res.status(500).json({
      error: "Image validation failed",
      message: "Unable to validate the uploaded image.",
    });
  }
};

module.exports = validateImageMVP;
