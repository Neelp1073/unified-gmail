import { KNOWN_EXTENSION_CLIENT_ID } from "../config";

export type ThemePreference = "light" | "dark" | "system";
export type DefaultInbox = "inbox" | "starred" | "unread";
export type RefreshMinutes = 5 | 15 | 30 | 60;

export interface AppSettings {
  theme: ThemePreference;
  defaultAccountId: string | null;
  defaultInbox: DefaultInbox;
  notificationsEnabled: boolean;
  refreshMinutes: RefreshMinutes;
  googleClientId: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  defaultAccountId: null,
  defaultInbox: "inbox",
  notificationsEnabled: true,
  refreshMinutes: 15,
  googleClientId: KNOWN_EXTENSION_CLIENT_ID,
};
