export type MailboxId = "inbox" | "starred" | "sent" | "trash" | "all";

export interface MessageRef {
  accountId: string;
  id: string;
  threadId?: string;
}

export function messageListKey(item: { accountId: string; id: string }): string {
  return `${item.accountId}:${item.id}`;
}

export interface MessageListItem {
  accountId: string;
  id: string;
  threadId?: string;
  fromName: string;
  fromEmail: string;
  to: string[];
  subject: string;
  snippet: string;
  date: string;
  internalDate: number;
  unread: boolean;
  starred: boolean;
  hasAttachment: boolean;
  labelIds: string[];
}

export interface MessageAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface MessageDetail extends MessageListItem {
  to: string[];
  cc: string[];
  bcc: string[];
  bodyText?: string;
  bodyHtml?: string;
  attachments: MessageAttachment[];
}

export interface MessagePage {
  items: MessageListItem[];
  nextPageTokens: Record<string, string | undefined>;
  warnings?: string[];
}

export interface MailFilters {
  accountId: "all" | string;
  mailbox: MailboxId;
  unreadOnly: boolean;
  starredOnly: boolean;
  hasAttachment: boolean;
  sort: "newest" | "oldest";
  query: string;
  from?: string;
  after?: string;
  before?: string;
}
