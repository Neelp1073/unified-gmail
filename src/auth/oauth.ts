import { createPkce, randomUrlSafe } from "@/auth/pkce";
import { getGoogleClientId, usableGoogleClientId } from "@/auth/clientId";
import { tokenStore } from "@/auth/tokenStore";
import {
  AUTH_SCOPES,
  GOOGLE_APIS,
  chromeExtensionClientHelp,
  oauthRedirectUrl,
  runtimeExtensionId,
} from "@/config";
import { storageGet, storageSet } from "@/lib/storage";
import type { Account, AccountLabel } from "@/types/account";
import { AppError, type AppErrorCode } from "@/utils/errors";

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface UserInfo {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
}

interface PkcePair {
  verifier: string;
  challenge: string;
}

let warmedPkce: PkcePair | null = null;
let warmingPkce: Promise<PkcePair> | null = null;

export function warmUpPkce(): Promise<PkcePair> {
  if (warmedPkce) return Promise.resolve(warmedPkce);
  if (warmingPkce) return warmingPkce;
  warmingPkce = createPkce().then((pair) => {
    warmedPkce = pair;
    warmingPkce = null;
    return pair;
  });
  return warmingPkce;
}

/**
 * Must be called from a click handler with no `await` before this function.
 * Brave/Chrome drop launchWebAuthFlow if the user gesture is already gone.
 *
 * Uses the implicit token flow. Chrome extension OAuth clients return the
 * access token in the redirect, so we never send a client secret.
 */
export function connectGoogleAccount(options?: {
  clientId?: string;
  loginHint?: string;
  interactiveConsent?: boolean;
}): Promise<Account> {
  const clientId = usableGoogleClientId(options?.clientId ?? "");

  const redirectUri = oauthRedirectUrl();
  const state = randomUrlSafe(16);
  const authUrl = buildGoogleAuthUrl({
    clientId,
    redirectUri,
    state,
    loginHint: options?.loginHint,
    prompt: options?.interactiveConsent === false ? "select_account" : "consent",
  });

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (redirectUrl) => {
      const lastError = chrome.runtime.lastError?.message;
      if (lastError) {
        reject(identityLaunchError(lastError, redirectUri));
        return;
      }
      if (!redirectUrl) {
        reject(new AppError("oauth_denied", "Google sign-in was cancelled."));
        return;
      }
      void completeGoogleSignIn({
        clientId,
        redirectUri,
        state,
        redirectUrl,
      }).then(resolve, reject);
    });
  });
}

function buildGoogleAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  loginHint?: string;
  prompt: string;
}): string {
  const authUrl = new URL(GOOGLE_APIS.oauthAuth);
  authUrl.searchParams.set("client_id", input.clientId);
  authUrl.searchParams.set("redirect_uri", input.redirectUri);
  authUrl.searchParams.set("response_type", "token");
  authUrl.searchParams.set("scope", AUTH_SCOPES.join(" "));
  authUrl.searchParams.set("state", input.state);
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("prompt", input.prompt);
  if (input.loginHint) authUrl.searchParams.set("login_hint", input.loginHint);
  return authUrl.toString();
}

async function completeGoogleSignIn(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  redirectUrl: string;
  verifier?: string;
}): Promise<Account> {
  const parsed = parseOAuthRedirect(input.redirectUrl);
  if (parsed.error) {
    throw oauthRedirectError(parsed.error, parsed.errorDescription);
  }
  if (parsed.state && parsed.state !== input.state) {
    throw new AppError("oauth_denied", "Google sign-in could not be verified. Try again.");
  }

  let accessToken = parsed.accessToken;
  let expiresAt =
    parsed.expiresIn !== undefined ? Date.now() + parsed.expiresIn * 1000 : Date.now() + 3600_000;
  let refreshToken = parsed.refreshToken;
  let scopes = parsed.scope?.split(/\s+/).filter(Boolean) ?? [...AUTH_SCOPES];

  if (!accessToken && parsed.code) {
    if (!input.verifier) {
      throw new AppError("not_configured", chromeExtensionClientHelp());
    }
    const tokens = await exchangeGoogleAuthCode({
      clientId: input.clientId,
      code: parsed.code,
      verifier: input.verifier,
      redirectUri: input.redirectUri,
    });
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token ?? refreshToken;
    expiresAt = Date.now() + (tokens.expires_in ?? 3600) * 1000;
    scopes = tokens.scope?.split(/\s+/) ?? scopes;
  }

  if (!accessToken) {
    throw new AppError(
      "oauth_denied",
      "Google did not return an access token. Check the OAuth client type and redirect URI.",
    );
  }

  const profile = await fetchUserInfo(accessToken);
  if (!profile.sub || !profile.email) {
    throw new AppError("oauth_denied", "Google did not return an email for that account.");
  }

  const existing = await storageGet<Account[]>("accounts", []);
  const previous = existing.find((account) => account.id === profile.sub);
  const account: Account = {
    id: profile.sub,
    email: profile.email,
    displayName: profile.name || profile.email,
    photoUrl: profile.picture,
    label: previous?.label ?? inferLabel(profile.email, existing),
    customLabel: previous?.customLabel,
    connectedAt: previous?.connectedAt ?? new Date().toISOString(),
    lastSync: new Date().toISOString(),
    scopes,
    status: "active",
  };

  await tokenStore.setTokens(account.id, {
    accessToken,
    expiresAt,
    refreshToken,
    scopes,
  });

  const nextAccounts = previous
    ? existing.map((item) => (item.id === account.id ? account : item))
    : [...existing, account];
  await storageSet("accounts", nextAccounts);

  return account;
}

export async function silentRefreshGoogleAccessToken(accountId: string): Promise<string | null> {
  const accounts = await storageGet<Account[]>("accounts", []);
  const account = accounts.find((item) => item.id === accountId);
  const clientId = await getGoogleClientId();
  if (!account || !clientId) return null;

  const redirectUri = oauthRedirectUrl();
  const state = randomUrlSafe(16);
  const authUrl = buildGoogleAuthUrl({
    clientId,
    redirectUri,
    state,
    loginHint: account.email,
    prompt: "none",
  });

  return new Promise((resolve) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: false }, (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        resolve(null);
        return;
      }
      void (async () => {
        try {
          const parsed = parseOAuthRedirect(redirectUrl);
          if (!parsed.accessToken || (parsed.state && parsed.state !== state)) {
            resolve(null);
            return;
          }
          const scopes = parsed.scope?.split(/\s+/).filter(Boolean) ?? account.scopes;
          await tokenStore.setTokens(accountId, {
            accessToken: parsed.accessToken,
            expiresAt:
              parsed.expiresIn !== undefined
                ? Date.now() + parsed.expiresIn * 1000
                : Date.now() + 3600_000,
            scopes,
          });
          resolve(parsed.accessToken);
        } catch {
          resolve(null);
        }
      })();
    });
  });
}

export function reauthenticateAccount(
  accountId: string,
  clientId?: string,
  loginHint?: string,
): Promise<Account> {
  if (loginHint && clientId) {
    return connectGoogleAccount({
      clientId,
      loginHint,
      interactiveConsent: true,
    });
  }
  return (async () => {
    const accounts = await storageGet<Account[]>("accounts", []);
    const account = accounts.find((item) => item.id === accountId);
    if (!account) {
      throw new AppError("not_connected", "That Gmail account is not connected.");
    }
    await warmUpPkce();
    return connectGoogleAccount({
      clientId: clientId || (await getGoogleClientId()),
      loginHint: account.email,
      interactiveConsent: true,
    });
  })();
}

export async function disconnectAccount(accountId: string): Promise<void> {
  const accounts = await storageGet<Account[]>("accounts", []);
  const account = accounts.find((item) => item.id === accountId);
  if (!account) {
    throw new AppError("not_connected", "That Gmail account is not connected.");
  }

  try {
    const token =
      (await tokenStore.getRefreshToken(accountId).catch(() => undefined)) ??
      (await tokenStore.getAccessToken(accountId).catch(() => undefined));
    if (token) {
      await fetch(GOOGLE_APIS.oauthRevoke, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }),
      });
    }
  } catch {
    // Revocation is best-effort; still forget the account locally.
  }

  await tokenStore.clear(accountId);
  await storageSet(
    "accounts",
    accounts.filter((item) => item.id !== accountId),
  );
}

function identityLaunchError(lastError: string, redirectUri: string): AppError {
  const text = lastError.toLowerCase();
  if (/cancel|closed|not approve|did not approve/.test(text)) {
    return new AppError("oauth_denied", "Google sign-in was cancelled.");
  }
  if (/authorization page could not be loaded/.test(text)) {
    return new AppError(
      "not_configured",
      `${chromeExtensionClientHelp()} Redirect used: ${redirectUri}. ${lastError}`,
    );
  }
  return new AppError("oauth_denied", `Google sign-in did not complete. ${lastError}`);
}

function parseOAuthRedirect(redirectUrl: string): {
  code?: string;
  state?: string;
  accessToken?: string;
  expiresIn?: number;
  refreshToken?: string;
  scope?: string;
  error?: string;
  errorDescription?: string;
} {
  const url = new URL(redirectUrl);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const query = url.searchParams;
  return {
    code: query.get("code") ?? hash.get("code") ?? undefined,
    state: query.get("state") ?? hash.get("state") ?? undefined,
    accessToken: hash.get("access_token") ?? query.get("access_token") ?? undefined,
    expiresIn: Number(hash.get("expires_in") ?? query.get("expires_in") ?? "") || undefined,
    refreshToken: query.get("refresh_token") ?? hash.get("refresh_token") ?? undefined,
    scope: hash.get("scope") ?? query.get("scope") ?? undefined,
    error: query.get("error") ?? hash.get("error") ?? undefined,
    errorDescription:
      query.get("error_description") ?? hash.get("error_description") ?? undefined,
  };
}

function oauthRedirectError(error: string, description?: string): AppError {
  if (error === "access_denied") {
    return new AppError("oauth_denied", "Google sign-in was denied for that account.");
  }
  if (error === "redirect_uri_mismatch") {
    return new AppError(
      "not_configured",
      `Google rejected the redirect URI. For a Chrome extension client, set Item ID to ${runtimeExtensionId()}. Web application clients cannot finish sign-in here without a secret.`,
    );
  }
  if (
    error === "unsupported_response_type" ||
    /implicit/i.test(description ?? "") ||
    /response_type/i.test(description ?? "")
  ) {
    return new AppError("not_configured", chromeExtensionClientHelp());
  }
  const detail = description?.replace(/\+/g, " ").trim();
  return new AppError(
    "oauth_denied",
    detail ? `Google sign-in failed: ${detail}` : `Google sign-in failed (${error}).`,
  );
}

async function exchangeGoogleAuthCode(input: {
  clientId: string;
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const inPage = typeof window !== "undefined";
  if (inPage && typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    const response = (await chrome.runtime.sendMessage({
      type: "EXCHANGE_OAUTH_CODE",
      clientId: input.clientId,
      code: input.code,
      verifier: input.verifier,
      redirectUri: input.redirectUri,
    })) as
      | { ok: true; tokens: TokenResponse }
      | { ok: false; message: string; code: AppErrorCode }
      | undefined;
    if (!response) {
      throw new AppError(
        "unknown",
        "The extension background page did not respond. Reload Unified Gmail and try again.",
      );
    }
    if (!response.ok) {
      throw new AppError(response.code, response.message);
    }
    return response.tokens;
  }
  return exchangeGoogleAuthCodeDirect(input);
}

export async function exchangeGoogleAuthCodeDirect(input: {
  clientId: string;
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  let response: Response;
  try {
    response = await fetch(GOOGLE_APIS.oauthToken, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: input.clientId,
        code: input.code,
        code_verifier: input.verifier,
        grant_type: "authorization_code",
        redirect_uri: input.redirectUri,
      }),
    });
  } catch (cause) {
    throw new AppError("network", "Network error while finishing Google sign-in.", {
      retryable: true,
      cause,
    });
  }

  const json = (await response.json()) as TokenResponse;
  if (!response.ok || json.error || !json.access_token) {
    throw mapTokenError(json, input.redirectUri);
  }
  return json;
}

function mapTokenError(json: TokenResponse, redirectUri: string): AppError {
  const error = (json.error ?? "").toLowerCase();
  const description = (json.error_description ?? "").replace(/\+/g, " ").trim();
  if (error === "redirect_uri_mismatch" || description.includes("redirect_uri")) {
    return new AppError(
      "not_configured",
      `The OAuth redirect URI does not match. Add ${redirectUri} as an authorized redirect URI on the Web application client.`,
    );
  }
  if (
    error === "invalid_client" ||
    error === "unauthorized_client" ||
    (error === "invalid_request" && /client_secret/i.test(description)) ||
    /client_secret/i.test(description)
  ) {
    return new AppError("not_configured", chromeExtensionClientHelp());
  }
  if (error === "invalid_grant") {
    return new AppError("oauth_denied", "Google sign-in expired. Start connect again.");
  }
  return new AppError(
    "oauth_denied",
    description
      ? `Google sign-in could not be completed. ${description}`
      : "Google sign-in could not be completed. Check the Client ID and try again.",
  );
}

async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  let response: Response;
  try {
    response = await fetch(GOOGLE_APIS.userInfo, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (cause) {
    throw new AppError("network", "Network error while loading the Google profile.", {
      retryable: true,
      cause,
    });
  }
  if (!response.ok) {
    throw new AppError("oauth_denied", "Could not load the Google account profile.");
  }
  return (await response.json()) as UserInfo;
}

function inferLabel(email: string, existing: Account[]): AccountLabel {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain.endsWith(".edu") || domain.includes(".ac.")) return "university";
  if (domain !== "gmail.com" && domain !== "googlemail.com") return "work";
  return existing.some((account) => account.label === "personal") ? "other" : "personal";
}
