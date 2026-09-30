import { storageGet } from "@/lib/storage";
import {
  BLOCKED_WEB_CLIENT_IDS,
  GOOGLE_CLIENT_ID_TYPOS,
  KNOWN_EXTENSION_CLIENT_ID,
} from "@/config";
import type { AppSettings } from "@/types/settings";

export function normalizeGoogleClientId(raw: string): string {
  const id = raw.trim().replace(/\s+/g, "");
  return GOOGLE_CLIENT_ID_TYPOS[id] ?? id;
}

export function isBlockedWebClientId(raw: string): boolean {
  const id = raw.trim().replace(/\s+/g, "");
  if (!id) return false;
  return BLOCKED_WEB_CLIENT_IDS.has(id);
}

export function usableGoogleClientId(raw: string): string {
  const id = normalizeGoogleClientId(raw);
  if (!id || isBlockedWebClientId(id) || isBlockedWebClientId(raw)) {
    return KNOWN_EXTENSION_CLIENT_ID;
  }
  return id;
}

export async function getGoogleClientId(): Promise<string> {
  const saved = await storageGet<Partial<AppSettings>>("settings", {});
  return usableGoogleClientId(
    saved.googleClientId?.trim() ||
      import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ||
      KNOWN_EXTENSION_CLIENT_ID,
  );
}
