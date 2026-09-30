import type { MailFilters, MailboxId } from "@/types/message";

const MAILBOX_QUERY: Record<MailboxId, string> = {
  inbox: "in:inbox",
  starred: "is:starred",
  sent: "in:sent",
  trash: "in:trash",
  all: "",
};

function quoteTerm(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[^\s"]+$/.test(trimmed)) return trimmed;
  return `"${trimmed.replaceAll('"', '\\"')}"`;
}

export function buildGmailQuery(filters: Partial<MailFilters>): string {
  const parts: string[] = [];

  if (filters.mailbox && filters.mailbox !== "all") {
    parts.push(MAILBOX_QUERY[filters.mailbox]);
  }
  if (filters.unreadOnly) parts.push("is:unread");
  if (filters.starredOnly) parts.push("is:starred");
  if (filters.hasAttachment) parts.push("has:attachment");
  if (filters.from?.trim()) parts.push(`from:${quoteTerm(filters.from)}`);
  if (filters.after?.trim()) parts.push(`after:${filters.after.trim()}`);
  if (filters.before?.trim()) parts.push(`before:${filters.before.trim()}`);
  if (filters.query?.trim()) parts.push(filters.query.trim());

  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
