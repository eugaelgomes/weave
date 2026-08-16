import { jwtDecode } from "jwt-decode";
import getStorageUrl from "@/app/_utils/get-storage-url";

export const normalizeStorageUrl = (value?: string | null): string => {
  if (!value) return "";
  return getStorageUrl(value);
};

export const normalizeThemeMode = (value?: string): "LIGHT" | "DARK" | undefined => {
  if (!value) return undefined;
  const normalized = value.toUpperCase();
  if (normalized === "DARK") return "DARK";
  if (normalized === "LIGHT") return "LIGHT";
  return undefined;
};

export const decodeToken = (token: string) => {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};
