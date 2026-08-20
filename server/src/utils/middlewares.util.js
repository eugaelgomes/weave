const multer = require("multer");
const os = require("os");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const spacesService = require("@/services/storage.service");

/**
 * Express middleware to recursively parse top-level primitive values in the request body to strings.
 * This ensures that incoming payloads maintain string types for compatibility with legacy systems,
 * while safely ignoring nested objects and arrays.
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 */
const parseBodyPrimitivesToString = async (req, res, next) => {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    for (const propertyKey in req.body) {
      if (Object.prototype.hasOwnProperty.call(req.body, propertyKey)) {
        const propertyValue = req.body[propertyKey];
        if (
          propertyValue !== null &&
          typeof propertyValue !== "object" &&
          typeof propertyValue !== "string"
        ) {
          req.body[propertyKey] = String(propertyValue);
        }
      }
    }
  }
  next();
};

/**
 * Disk storage configuration for Multer.
 * Temporarily saves uploaded files to the operating system's temp directory
 * with a uniquely generated UUID filename.
 */
const temporaryDiskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, os.tmpdir());
  },
  filename: function (req, file, cb) {
    const uniqueFileName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFileName);
  },
});

/**
 * Multer middleware instance configured for image uploads.
 * Restricts files to PNG, JPEG, JPG, and WEBP formats, and applies a 2MB file size limit.
 */
const multipartImageUpload = multer({
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Only PNG, JPEG, JPG, and WEBP formats are allowed!"), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB Limit
  storage: temporaryDiskStorage,
});

/**
 * Express middleware to validate that an uploaded image meets the requirements
 * for the storage service (Digital Ocean Spaces / S3).
 * Validates both MIME type and maximum allowed size configured in the service.
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @param {import("express").NextFunction} next - Express next middleware function
 */
const validateImageMimeAndSize = (req, res, next) => {
  try {
    const uploadedFile = req.file;
    if (!uploadedFile || !uploadedFile.buffer) {
      return next(); // Proceed if no file was attached
    }

    if (!spacesService.isValidImageType(uploadedFile.mimetype)) {
      return res.status(400).json({
        error: "Invalid file type",
        message: "Only JPEG, PNG, WebP and GIF images are allowed.",
      });
    }

    if (!spacesService.isValidImageSize(uploadedFile.size)) {
      const sizeInMB = Math.round(uploadedFile.size / 1024 / 1024);
      return res.status(413).json({
        error: "File too large",
        message: `Image size (${sizeInMB}MB) exceeds the maximum allowed limit.`,
      });
    }

    next();
  } catch (validationError) {
    console.error("Error in image validation middleware:", validationError);
    res.status(500).json({
      error: "Image validation failed",
      message: "Unable to validate the uploaded image.",
    });
  }
};

/**
 * Utility to extract the client's geographic region and IP address
 * from Cloudflare headers, with a fallback to the socket connection IP.
 *
 * @param {import("express").Request} req - Express request object
 * @returns {{ countryCode: string, ip: string, method: string, timezone: string }} Geographic location data
 */
const extractClientRegionFromHeaders = (req) => {
  const cfTimezone = req.headers["cf-timezone"];
  const cfCountryCode = req.headers["cf-ipcountry"];
  const clientRealIp =
    req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (!cfTimezone) {
    return {
      countryCode: cfCountryCode || "XX",
      ip: clientRealIp,
      method: "fallback",
      timezone: "UTC",
    };
  }

  return {
    countryCode: cfCountryCode,
    ip: clientRealIp,
    method: "cloudflare",
    timezone: cfTimezone,
  };
};

module.exports = {
  extractClientRegionFromHeaders,
  multipartImageUpload,
  parseBodyPrimitivesToString,
  validateImageMimeAndSize,
};
