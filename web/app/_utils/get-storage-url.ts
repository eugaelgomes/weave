/**
 * Monta a URL completa de um arquivo a partir do path/key.
 * Como o backend agora retorna a URL completa absoluta, esta função atua como passthrough.
 */
const getStorageUrl = (path: string): string => {
  if (!path) return "";

  // Garantir que não existam barras triplas ou mal formatadas, se aplicável
  try {
    if (/^https?:\/\/|^blob:/i.test(path)) {
      if (path.startsWith("blob:")) {
        return path;
      }
      const normalizedUrl = new URL(path);
      normalizedUrl.pathname = normalizedUrl.pathname.replace(/\/+/g, "/");
      return normalizedUrl.toString();
    }
  } catch {
    // Ignorar erro de parsing de URL
  }

  return path;
};

export default getStorageUrl;
