const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(bytes?: number, fractionDigits = 1): string {
  if (bytes === undefined || Number.isNaN(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const exp = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const value = bytes / 1024 ** exp;
  const digits = value >= 10 || exp === 0 ? 0 : fractionDigits;
  return `${value.toFixed(digits)} ${BYTE_UNITS[exp]}`;
}

export function formatMessageDate(isoOrMs: string | number): string {
  const date = typeof isoOrMs === "number" ? new Date(isoOrMs) : new Date(isoOrMs);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function initials(nameOrEmail: string): string {
  const cleaned = nameOrEmail.trim();
  if (!cleaned) return "?";
  if (cleaned.includes("@") && !cleaned.includes(" ")) {
    return cleaned.slice(0, 2).toUpperCase();
  }
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}
