import { storageGet, storageSet, storageRemove } from "@/lib/storage";
import { getGoogleClientId } from "@/auth/clientId";
import { GOOGLE_APIS } from "@/config";
import { AppError } from "@/utils/errors";
import type { Account } from "@/types/account";

interface AccessRecord {
  accessToken: string;
  expiresAt: number;
  scopes: string[];
}

type AccessMap = Record<string, AccessRecord>;
type RefreshMap = Record<string, string>;

const ACCESS_KEY = "access-tokens";
const REFRESH_KEY = "refresh-tokens";
const SKEW_MS = 60_000;

function hasSessionStore(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.session);
}

async function readAccessMap(): Promise<AccessMap> {
  const local = await storageGet<AccessMap>(ACCESS_KEY, {});
  if (!hasSessionStore()) return local;
  const session = (await chrome.storage.session.get(ACCESS_KEY))[ACCESS_KEY] as
    | AccessMap
    | undefined;
  return { ...local, ...(session ?? {}) };
}

async function writeAccessMap(map: AccessMap): Promise<void> {
  await storageSet(ACCESS_KEY, map);
  if (hasSessionStore()) {
    await chrome.storage.session.set({ [ACCESS_KEY]: map });
  }
}

async function readRefreshMap(): Promise<RefreshMap> {
  return storageGet<RefreshMap>(REFRESH_KEY, {});
}

async function writeRefreshMap(map: RefreshMap): Promise<void> {
  await storageSet(REFRESH_KEY, map);
}

async function accountEmail(accountId: string): Promise<string | undefined> {
  const accounts = await storageGet<Account[]>("accounts", []);
  return accounts.find((account) => account.id === accountId)?.email;
}

async function reauthError(accountId: string): Promise<AppError> {
  const email = await accountEmail(accountId);
  return new AppError(
    "needs_reauth",
    email
      ? `Your ${email} Gmail account needs to be reconnected.`
      : "A connected Gmail account needs to be signed in again.",
    { accountEmail: email, retryable: true },
  );
}

async function refreshAccessToken(
  accountId: string,
  refreshToken: string,
): Promise<AccessRecord> {
  const clientId = await getGoogleClientId();
  if (!clientId) {
    throw new AppError(
      "not_configured",
      "Add a Google OAuth Client ID in Settings before reconnecting.",
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  let response: Response;
  try {
    response = await fetch(GOOGLE_APIS.oauthToken, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (cause) {
    throw new AppError("network", "Network error while refreshing Google sign-in.", {
      retryable: true,
      cause,
    });
  }

  if (!response.ok) {
    throw await reauthError(accountId);
  }

  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    refresh_token?: string;
  };

  if (!json.access_token) throw await reauthError(accountId);

  const record: AccessRecord = {
    accessToken: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    scopes: json.scope?.split(/\s+/) ?? [],
  };

  const access = await readAccessMap();
  access[accountId] = record;
  await writeAccessMap(access);

  if (json.refresh_token) {
    const refresh = await readRefreshMap();
    refresh[accountId] = json.refresh_token;
    await writeRefreshMap(refresh);
  }

  return record;
}

export const tokenStore = {
  async getAccessToken(accountId: string): Promise<string> {
    const access = await readAccessMap();
    const cached = access[accountId];
    if (cached && cached.expiresAt - SKEW_MS > Date.now()) {
      return cached.accessToken;
    }

    const refresh = await readRefreshMap();
    const refreshToken = refresh[accountId];
    if (refreshToken) {
      try {
        const next = await refreshAccessToken(accountId, refreshToken);
        return next.accessToken;
      } catch {
        // Fall through to a silent Google token refresh.
      }
    }

    try {
      const { silentRefreshGoogleAccessToken } = await import("@/auth/oauth");
      const renewed = await silentRefreshGoogleAccessToken(accountId);
      if (renewed) return renewed;
    } catch {
      // User will be asked to reconnect.
    }

    throw await reauthError(accountId);
  },

  async setTokens(
    accountId: string,
    input: {
      accessToken: string;
      expiresAt: number;
      refreshToken?: string;
      scopes: string[];
    },
  ): Promise<void> {
    const access = await readAccessMap();
    access[accountId] = {
      accessToken: input.accessToken,
      expiresAt: input.expiresAt,
      scopes: input.scopes,
    };
    await writeAccessMap(access);

    if (input.refreshToken) {
      const refresh = await readRefreshMap();
      refresh[accountId] = input.refreshToken;
      await writeRefreshMap(refresh);
    }
  },

  async invalidateAccessToken(accountId: string): Promise<void> {
    const access = await readAccessMap();
    delete access[accountId];
    await writeAccessMap(access);
  },

  async getRefreshToken(accountId: string): Promise<string | undefined> {
    const refresh = await readRefreshMap();
    return refresh[accountId];
  },

  async clear(accountId: string): Promise<void> {
    const access = await readAccessMap();
    delete access[accountId];
    await writeAccessMap(access);
    const refresh = await readRefreshMap();
    delete refresh[accountId];
    await writeRefreshMap(refresh);
  },

  async clearAll(): Promise<void> {
    await writeAccessMap({});
    await writeRefreshMap({});
    if (hasSessionStore()) await chrome.storage.session.remove(ACCESS_KEY);
    await storageRemove(ACCESS_KEY);
    await storageRemove(REFRESH_KEY);
  },
};
