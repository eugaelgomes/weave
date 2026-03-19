const CDN_BASE =
  process.env.NEXT_PUBLIC_CDN_BASE_URL || process.env.NEXT_PUBLIC_FILE_STORAGE_URL || "";

/**
 * Monta a URL completa de um arquivo a partir do path/key salvo no banco.
 * Se o valor já for uma URL completa (http/https/blob), retorna como está.
 */
const getStorageUrl = (path: string): string => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path;
  }
  return `${CDN_BASE}/${path}`;
};

export default getStorageUrl;
