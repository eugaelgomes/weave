const CDN_BASE =
  process.env.NEXT_PUBLIC_CDN_BASE_URL || process.env.NEXT_PUBLIC_FILE_STORAGE_URL || "";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const trimLeadingSlash = (value: string) => value.replace(/^\/+/, "");
const collapsePathSlashes = (value: string) => value.replace(/\/+/g, "/");

/**
 * Monta a URL completa de um arquivo a partir do path/key salvo no banco.
 * Se o valor já for uma URL completa (http/https/blob), retorna como está.
 * Também evita barras duplicadas quando o CDN_BASE/path já possuem slash.
 */
const ABSOLUTE_PROTOCOLS = /^https?:\/\/|^blob:/i;

const getStorageUrl = (path: string): string => {
  if (!path) return "";

  if (ABSOLUTE_PROTOCOLS.test(path)) {
    if (path.startsWith("blob:")) {
      return path;
    }

    try {
      const normalizedUrl = new URL(path);
      normalizedUrl.pathname = collapsePathSlashes(normalizedUrl.pathname);
      return normalizedUrl.toString();
    } catch {
      return path;
    }
  }

  const base = trimTrailingSlash(CDN_BASE);
  const normalizedPath = trimLeadingSlash(path);

  if (!base) {
    return path.startsWith("/") ? path : `/${normalizedPath}`;
  }

  return `${base}/${normalizedPath}`;
};

export default getStorageUrl;
