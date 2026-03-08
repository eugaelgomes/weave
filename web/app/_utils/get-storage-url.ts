// Utilitário para montar a URL do arquivo a partir do path salvo
const getStorageUrl = (path: string): string => {
  if (!path) return "";
  // Ajuste conforme sua configuração de CDN ou endpoint
  // Exemplo: return `https://YOUR_CDN_ENDPOINT/${path}`;
  return `${process.env.NEXT_PUBLIC_FILE_STORAGE_URL}/${encodeURIComponent(path)}`;
};

export default getStorageUrl;
