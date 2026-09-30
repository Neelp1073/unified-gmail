import type { MessageAttachment, MessageDetail, MessageListItem } from "@/types/message";

interface GmailHeader {
  name?: string;
  value?: string;
}

interface GmailBody {
  data?: string;
  size?: number;
  attachmentId?: string;
}

interface GmailPayload {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailBody;
  parts?: GmailPayload[];
}

export interface GmailMessageResource {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPayload;
}

function header(headers: GmailHeader[] | undefined, name: string): string {
  const match = headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase());
  return match?.value?.trim() ?? "";
}

export function parseAddress(raw: string): { name: string; email: string } {
  const value = raw.trim();
  if (!value) return { name: "(no sender)", email: "" };
  const angled = value.match(/^(.*)<([^>]+)>$/);
  if (angled) {
    const email = angled[2].trim();
    const name = angled[1].replaceAll('"', "").trim() || email;
    return { name, email };
  }
  return { name: value, email: value.includes("@") ? value : "" };
}

function splitAddresses(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((part) => parseAddress(part).email || parseAddress(part).name)
    .filter(Boolean);
}

function walkParts(payload: GmailPayload | undefined, visit: (part: GmailPayload) => void): void {
  if (!payload) return;
  visit(payload);
  payload.parts?.forEach((part) => walkParts(part, visit));
}

export function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(data.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function collectBodies(payload: GmailPayload | undefined): { text?: string; html?: string } {
  let text: string | undefined;
  let html: string | undefined;
  walkParts(payload, (part) => {
    const mime = part.mimeType ?? "";
    const data = part.body?.data;
    if (!data) return;
    if (mime === "text/plain" && !text) text = decodeBase64Url(data);
    if (mime === "text/html" && !html) html = decodeBase64Url(data);
  });
  return { text, html };
}

function collectAttachments(payload: GmailPayload | undefined): MessageAttachment[] {
  const attachments: MessageAttachment[] = [];
  walkParts(payload, (part) => {
    if (!part.filename || !part.body?.attachmentId) return;
    attachments.push({
      attachmentId: part.body.attachmentId,
      filename: part.filename,
      mimeType: part.mimeType ?? "application/octet-stream",
      size: part.body.size ?? 0,
    });
  });
  return attachments;
}

function hasFilenamePart(payload: GmailPayload | undefined): boolean {
  let found = false;
  walkParts(payload, (part) => {
    if (part.filename) found = true;
  });
  return found;
}

export function sanitizeGmailHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, iframe, object, embed, link, meta, form").forEach((node) => {
    node.remove();
  });
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith("on") || name === "srcdoc" || value.startsWith("javascript:")) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return doc.body.innerHTML;
}

export function toListItem(accountId: string, message: GmailMessageResource): MessageListItem {
  const headers = message.payload?.headers;
  const from = parseAddress(header(headers, "From"));
  const labelIds = message.labelIds ?? [];
  const internalDate = Number(message.internalDate ?? Date.now());
  return {
    accountId,
    id: message.id ?? "",
    threadId: message.threadId,
    fromName: from.name,
    fromEmail: from.email,
    to: splitAddresses(header(headers, "To")),
    subject: header(headers, "Subject") || "(no subject)",
    snippet: message.snippet ?? "",
    date: new Date(internalDate).toISOString(),
    internalDate,
    unread: labelIds.includes("UNREAD"),
    starred: labelIds.includes("STARRED"),
    hasAttachment: hasFilenamePart(message.payload),
    labelIds,
  };
}

export function toDetail(accountId: string, message: GmailMessageResource): MessageDetail {
  const headers = message.payload?.headers;
  const bodies = collectBodies(message.payload);
  return {
    ...toListItem(accountId, message),
    to: splitAddresses(header(headers, "To")),
    cc: splitAddresses(header(headers, "Cc")),
    bcc: splitAddresses(header(headers, "Bcc")),
    bodyText: bodies.text,
    bodyHtml: bodies.html,
    attachments: collectAttachments(message.payload),
  };
}
