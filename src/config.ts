export const APP_NAME = "Unified Gmail";
export const APP_VERSION = "0.1.0";

/** Pinned unpacked ID from the manifest public key. Prefer chrome.runtime.id at runtime. */
export const STABLE_EXTENSION_ID = "fiigkankdkfhojbdcdlgdhhhaepnlmim";

/** Chrome extension client. Item ID matches this unpacked extension. Public, not a secret. */
export const KNOWN_EXTENSION_CLIENT_ID =
  "824323458913-qd8pe3ia06qu2saegg2t1co3of0mca2p.apps.googleusercontent.com";

/** Web application client. Google requires a secret for it; do not use in this extension. */
export const KNOWN_WEB_CLIENT_ID =
  "824323458913-a0n8iepmaqilqkajop6u2pi03dkoj8lr.apps.googleusercontent.com";

export const GOOGLE_CLIENT_ID_TYPOS: Record<string, string> = {
  "824323458913-a0n8iepmaqlqkajop6u2pi03dkojl8lr.apps.googleusercontent.com":
    KNOWN_EXTENSION_CLIENT_ID,
  [KNOWN_WEB_CLIENT_ID]: KNOWN_EXTENSION_CLIENT_ID,
};

export const BLOCKED_WEB_CLIENT_IDS = new Set<string>([
  KNOWN_WEB_CLIENT_ID,
  "824323458913-a0n8iepmaqlqkajop6u2pi03dkojl8lr.apps.googleusercontent.com",
]);

export const GOOGLE_APIS = {
  // Same host as Drive. Brave Shields has been seen blocking gmail.googleapis.com
  // on extension pages while www.googleapis.com still works.
  gmail: "https://www.googleapis.com/gmail/v1",
  drive: "https://www.googleapis.com/drive/v3",
  driveUpload: "https://www.googleapis.com/upload/drive/v3",
  oauthToken: "https://oauth2.googleapis.com/token",
  oauthRevoke: "https://oauth2.googleapis.com/revoke",
  oauthAuth: "https://accounts.google.com/o/oauth2/v2/auth",
  userInfo: "https://www.googleapis.com/oauth2/v3/userinfo",
} as const;

export const SCOPES = {
  openid: "openid",
  email: "https://www.googleapis.com/auth/userinfo.email",
  profile: "https://www.googleapis.com/auth/userinfo.profile",
  gmailReadonly: "https://www.googleapis.com/auth/gmail.readonly",
  gmailSend: "https://www.googleapis.com/auth/gmail.send",
  gmailModify: "https://www.googleapis.com/auth/gmail.modify",
  drive: "https://www.googleapis.com/auth/drive",
  driveFile: "https://www.googleapis.com/auth/drive.file",
  driveReadonly: "https://www.googleapis.com/auth/drive.readonly",
  driveMetadataReadonly:
    "https://www.googleapis.com/auth/drive.metadata.readonly",
} as const;

/** Minimum scopes for inbox, search, viewer, storage quota, and identity. */
export const READ_SCOPES = [
  SCOPES.openid,
  SCOPES.email,
  SCOPES.profile,
  SCOPES.gmailReadonly,
  SCOPES.drive,
] as const;

/** Scopes requested on connect. gmail.modify is required to move mail to Trash. */
export const AUTH_SCOPES = [...READ_SCOPES, SCOPES.gmailModify] as const;

export const WRITE_SCOPES = [SCOPES.gmailSend] as const;

export function hasGmailModifyScope(scopes: readonly string[]): boolean {
  return scopes.some(
    (scope) => scope === SCOPES.gmailModify || scope === "https://mail.google.com/",
  );
}

export function hasDriveListScope(scopes: readonly string[]): boolean {
  return scopes.some(
    (scope) =>
      scope === SCOPES.drive ||
      scope === SCOPES.driveReadonly ||
      scope === SCOPES.driveMetadataReadonly ||
      scope === "https://www.googleapis.com/auth/drive.metadata",
  );
}

export function hasDriveContentScope(scopes: readonly string[]): boolean {
  return scopes.some((scope) => scope === SCOPES.driveReadonly || scope === SCOPES.drive);
}

export function hasDriveWriteScope(scopes: readonly string[]): boolean {
  return scopes.some((scope) => scope === SCOPES.drive || scope === SCOPES.driveFile);
}

export const DEFAULT_PAGE_SIZE = 25;
export const SEARCH_DEBOUNCE_MS = 300;
export const REFRESH_ALARM = "unified-gmail-refresh";

export function runtimeExtensionId(): string {
  return typeof chrome !== "undefined" && chrome.runtime?.id
    ? chrome.runtime.id
    : STABLE_EXTENSION_ID;
}

export function oauthRedirectUrl(): string {
  if (typeof chrome !== "undefined" && chrome.identity?.getRedirectURL) {
    return chrome.identity.getRedirectURL();
  }
  return `https://${runtimeExtensionId()}.chromiumapp.org/`;
}

export function chromeExtensionClientHelp(): string {
  const itemId = runtimeExtensionId();
  return `Google rejected a Web application Client ID because that type needs a client secret, and Unified Gmail will not store one. In Google Cloud → Clients, use a Chrome extension client with Item ID ${itemId}. Paste that Client ID (not Unified Gmail Web, not a secret) and connect again.`;
}
