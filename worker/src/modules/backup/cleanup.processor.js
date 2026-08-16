const { executeQuery } = require("../../database/connection");
const storageService = require("../storage");
const { logger } = require("../../config/logger");

const JOB_TYPE = "cleanup_expired_backups";

async function process(_job) {
  logger.info("Starting expired backups cleanup");

  const expiredTokensQuery = `
    SELECT t.token, t.user_id, j.result
    FROM tokens t
    LEFT JOIN jobs j ON j.user_id = t.user_id 
      AND j.type = 'backup_export' 
      AND j.result IS NOT NULL
      AND j.result->>'downloadToken' = t.token
    WHERE t.type = 'backup_download' 
    AND t.expires_at < NOW()
  `;

  const expiredTokens = await executeQuery(expiredTokensQuery);

  if (expiredTokens.length === 0) {
    logger.info("No expired backups found");
    return { deletedCount: 0, failedCount: 0 };
  }

  logger.info(`Found ${expiredTokens.length} expired backups to clean`);

  let deletedCount = 0;
  let failedCount = 0;

  for (const token of expiredTokens) {
    try {
      const result = token.result;
      const storageKey = result?.storageKey;

      if (storageKey && storageService.isConfigured) {
        const deleted = await storageService.deleteImage(storageKey);

        if (deleted) {
          deletedCount++;
          logger.debug(`Backup deleted: ${storageKey}`);
        } else {
          failedCount++;
          logger.error(`Failed to delete backup: ${storageKey}`);
        }
      }

      await executeQuery("DELETE FROM tokens WHERE token = $1", [token.token]);
    } catch (error) {
      failedCount++;
      logger.error(`Error processing token ${token.token}`, {
        error: error.message,
      });
    }
  }

  logger.info("Cleanup completed", { deletedCount, failedCount });
  return { deletedCount, failedCount };
}

module.exports = {
  process,
  type: JOB_TYPE,
};
