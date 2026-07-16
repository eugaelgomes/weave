const multer = require("multer");

const os = require("os");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, os.tmpdir());
  },
  filename: function (req, file, cb) {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  // 2 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only PNG, JPEG, JPG, and WEBP formats are allowed!"),
        false
      );
    }
    cb(null, true);
  },

  limits: { fileSize: 2 * 1024 * 1024 },
  storage,
});

module.exports = upload;
