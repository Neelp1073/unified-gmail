export type RuntimeMessage =
  | { type: "OPEN_DASHBOARD"; hash?: string }
  | { type: "CONNECT_GOOGLE" }
  | { type: "REAUTH_GOOGLE"; accountId: string; clientId?: string }
  | { type: "DISCONNECT_GOOGLE"; accountId: string }
  | {
      type: "EXCHANGE_OAUTH_CODE";
      clientId: string;
      code: string;
      verifier: string;
      redirectUri: string;
    }
  | { type: "ACCOUNTS_CHANGED" }
  | { type: "SETTINGS_CHANGED" }
  | { type: "REFRESH_UNREAD" };

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      typeof (value as { type: unknown }).type === "string",
  );
}
