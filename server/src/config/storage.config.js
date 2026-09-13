/**
 * Evaluates whether a storage provider is enabled based on its env flag and credentials.
 * Only returns true if the environment variable is strictly equal to "true" (case-insensitive)
 * and required credentials are present. If omitted or anything else, returns false.
 *
 * @param {string | undefined} envValue - Flag from process.env (e.g. STORAGE_ENABLED or S3_STORAGE_ENABLED)
 * @param {unknown} [hasCredentials=true] - Truthy check for credentials
 * @returns {boolean}
 */
function isStorageFlagEnabled(envValue, hasCredentials = true) {
  if (
    String(envValue ?? "")
      .trim()
      .toLowerCase() !== "true"
  ) {
    return false;
  }
  return Boolean(hasCredentials);
}

/**
 * Resolves Storage configuration strictly from environment variables (Doppler / .env).
 *
 * @returns {{
 *   access_key: string,
 *   bucket_name: string,
 *   enabled: boolean,
 *   endpoint: string,
 *   force_path_style: boolean,
 *   region: string,
 *   secret_key: string,
 * }}
 */
function getStorageConfig() {
  const endpoint =
    process.env.STORAGE_ENDPOINT ||
    process.env.S3_ENDPOINT ||
    process.env.DO_SPACES_ENDPOINT ||
    process.env.AWS_ENDPOINT_URL ||
    "";

  const accessKey =
    process.env.STORAGE_ACCESS_KEY ||
    process.env.S3_ACCESS_KEY ||
    process.env.DO_SPACES_ACCESS_KEY ||
    process.env.AWS_ACCESS_KEY_ID ||
    "";

  const secretKey =
    process.env.STORAGE_SECRET_KEY ||
    process.env.S3_SECRET_KEY ||
    process.env.DO_SPACES_SECRET_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    "";

  const bucketName =
    process.env.STORAGE_BUCKET_NAME ||
    process.env.S3_BUCKET_NAME ||
    process.env.DO_SPACES_BUCKET_NAME ||
    process.env.AWS_BUCKET_NAME ||
    "";

  const region =
    process.env.STORAGE_REGION ||
    process.env.S3_REGION ||
    process.env.DO_SPACES_REGION ||
    process.env.AWS_REGION ||
    "us-east-1";

  const hasCredentials = Boolean(endpoint && accessKey && secretKey && bucketName && region);

  const envFlag = process.env.STORAGE_ENABLED ?? process.env.S3_STORAGE_ENABLED;
  const enabled = isStorageFlagEnabled(envFlag, hasCredentials);

  return {
    access_key: accessKey,
    bucket_name: bucketName,
    enabled,
    endpoint,
    force_path_style: true,
    region,
    secret_key: secretKey,
  };
}

module.exports = {
  getStorageConfig,
  isStorageFlagEnabled,
};
