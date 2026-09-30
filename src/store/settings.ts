import { create } from "zustand";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type ThemePreference,
} from "@/types/settings";
import { storageGet, storageSet } from "@/lib/storage";
import { usableGoogleClientId } from "@/auth/clientId";

interface SettingsState extends AppSettings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}

const KEY = "settings";

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    const saved = await storageGet<Partial<AppSettings>>(KEY, {});
    const googleClientId = usableGoogleClientId(
      saved.googleClientId ||
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        DEFAULT_SETTINGS.googleClientId,
    );
    set({ ...DEFAULT_SETTINGS, ...saved, googleClientId, hydrated: true });
  },

  update: async (patch) => {
    const next = { ...get(), ...patch };
    const persistable: AppSettings = {
      theme: next.theme,
      defaultAccountId: next.defaultAccountId,
      defaultInbox: next.defaultInbox,
      notificationsEnabled: next.notificationsEnabled,
      refreshMinutes: next.refreshMinutes,
      googleClientId: usableGoogleClientId(next.googleClientId),
    };
    set({ ...persistable });
    await storageSet(KEY, persistable);
  },
}));

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "light" || preference === "dark") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyResolvedTheme(preference: ThemePreference): void {
  const resolved = resolveTheme(preference);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}
