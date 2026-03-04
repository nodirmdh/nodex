const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function resolveAssetUrl(path?: string | null) {
  if (!path) {
    return "";
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (path.startsWith("/uploads")) {
    return `${API_URL}${path}`;
  }
  return path;
}
