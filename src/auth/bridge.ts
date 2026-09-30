import {
  connectGoogleAccount,
  disconnectAccount,
  reauthenticateAccount,
} from "@/auth/oauth";
import { AppError, type AppErrorCode, toUserError } from "@/utils/errors";
import type { Account } from "@/types/account";
import type { RuntimeMessage } from "@/types/messages";

interface OkResponse {
  ok: true;
  account?: Account;
}

interface ErrResponse {
  ok: false;
  message: string;
  code: AppErrorCode;
}

type BridgeResponse = OkResponse | ErrResponse | undefined;

function canLaunchIdentityHere(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.identity?.launchWebAuthFlow);
}

async function send(message: RuntimeMessage): Promise<BridgeResponse> {
  try {
    return (await chrome.runtime.sendMessage(message)) as BridgeResponse;
  } catch {
    throw new AppError(
      "unknown",
      "The extension background page did not respond. Reload the extension from chrome://extensions and try again.",
    );
  }
}

function unwrap(response: BridgeResponse): Account | undefined {
  if (!response) {
    throw new AppError(
      "unknown",
      "The extension background page did not respond. Reload the extension and try again.",
    );
  }
  if (!response.ok) {
    throw new AppError(response.code, response.message);
  }
  return response.account;
}

export async function requestConnectGoogle(clientId?: string): Promise<Account> {
  if (canLaunchIdentityHere()) {
    return connectGoogleAccount({ clientId });
  }
  const account = unwrap(await send({ type: "CONNECT_GOOGLE" }));
  if (!account) {
    throw new AppError("unknown", "Google sign-in finished but no account was returned.");
  }
  return account;
}

export async function requestReauthGoogle(
  accountId: string,
  clientId?: string,
  loginHint?: string,
): Promise<Account> {
  if (canLaunchIdentityHere()) {
    return reauthenticateAccount(accountId, clientId, loginHint);
  }
  const account = unwrap(await send({ type: "REAUTH_GOOGLE", accountId, clientId }));
  if (!account) {
    throw new AppError("unknown", "Reconnect finished but no account was returned.");
  }
  return account;
}

export async function requestDisconnectGoogle(accountId: string): Promise<void> {
  if (canLaunchIdentityHere()) {
    await disconnectAccount(accountId);
    return;
  }
  unwrap(await send({ type: "DISCONNECT_GOOGLE", accountId }));
}

export function serializeAuthError(error: unknown): ErrResponse {
  return {
    ok: false,
    message: toUserError(error),
    code: error instanceof AppError ? error.code : "unknown",
  };
}
