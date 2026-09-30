import { AppError } from "@/utils/errors";
import { tokenStore } from "@/auth/tokenStore";

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as {
      error?: { message?: string; status?: string };
    };
    return json.error?.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

function shouldDefaultJsonContentType(body: BodyInit | null | undefined): boolean {
  if (!body) return false;
  if (typeof body === "string") return true;
  if (typeof Blob !== "undefined" && body instanceof Blob) return false;
  if (typeof FormData !== "undefined" && body instanceof FormData) return false;
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return false;
  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) return false;
  return true;
}

export async function googleFetch(
  accountId: string,
  url: string,
  init: RequestInit & { okStatuses?: number[] } = {},
  retried = false,
): Promise<Response> {
  const { okStatuses, ...requestInit } = init;
  const token = await tokenStore.getAccessToken(accountId);
  const headers = new Headers(requestInit.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (
    requestInit.body &&
    !headers.has("Content-Type") &&
    shouldDefaultJsonContentType(requestInit.body)
  ) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, { ...requestInit, headers });
  } catch (cause) {
    throw new AppError("network", "Network error talking to Google.", {
      retryable: true,
      cause,
    });
  }

  if (response.status === 401 && !retried) {
    const refresh = await tokenStore.getRefreshToken(accountId);
    if (refresh) {
      await tokenStore.invalidateAccessToken(accountId);
      return googleFetch(accountId, url, init, true);
    }
  }

  if (okStatuses?.includes(response.status)) return response;

  if (response.status === 401) {
    throw new AppError(
      "needs_reauth",
      "This Gmail account needs to be signed in again.",
      { retryable: true },
    );
  }
  if (response.status === 403) {
    const details = await readErrorMessage(response);
    throw new AppError(
      "permission",
      details.includes("insufficient") || details.toLowerCase().includes("scope")
        ? "Google access was denied. Connect this account again and allow the requested permissions."
        : details || "This account does not have permission for that Google API call.",
    );
  }
  if (response.status === 404) {
    throw new AppError("not_found", "That Google resource was not found.");
  }
  if (response.status === 429) {
    throw new AppError("rate_limited", "Google is rate-limiting requests. Try again shortly.", {
      retryable: true,
    });
  }
  if (!response.ok) {
    const details = await readErrorMessage(response);
    throw new AppError("unknown", details || "Google API request failed.");
  }

  return response;
}
