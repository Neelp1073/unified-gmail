export type AppErrorCode =
  | "not_configured"
  | "not_connected"
  | "needs_reauth"
  | "oauth_denied"
  | "network"
  | "rate_limited"
  | "permission"
  | "not_found"
  | "invalid_message"
  | "quota"
  | "unknown";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly accountEmail?: string;
  readonly retryable: boolean;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { accountEmail?: string; retryable?: boolean; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.accountEmail = options?.accountEmail;
    this.retryable = options?.retryable ?? false;
  }
}

export function toUserError(error: unknown): string {
  if (error instanceof AppError) return error.message;

  if (error instanceof Error) {
    const text = error.message.toLowerCase();
    if (text.includes("failed to fetch") || text.includes("network")) {
      return "Network error. Check your connection and try again.";
    }
    if (text.includes("429") || text.includes("rate")) {
      return "Gmail is rate-limiting requests. Wait a moment, then retry.";
    }
    if (text.includes("401") || text.includes("invalid_grant")) {
      return "A connected account needs to be signed in again.";
    }
    if (text.includes("403")) {
      return "This account does not have permission for that action.";
    }
  }

  return "Something went wrong. Try again.";
}
