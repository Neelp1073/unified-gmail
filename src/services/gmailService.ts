import { googleFetch } from "@/api/googleClient";
import { DEFAULT_PAGE_SIZE, GOOGLE_APIS } from "@/config";
import {
  toDetail,
  toListItem,
  type GmailMessageResource,
} from "@/services/gmailParse";
import type { MessageDetail, MessagePage } from "@/types/message";
import { AppError, toUserError } from "@/utils/errors";

interface ListResponse {
  messages?: { id?: string; threadId?: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

const METADATA_HEADERS = ["From", "To", "Cc", "Subject", "Date"];

function messagesUrl(path = "", search?: Record<string, string | undefined>): string {
  const url = new URL(`${GOOGLE_APIS.gmail}/users/me/messages${path}`);
  if (search) {
    for (const [key, value] of Object.entries(search)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

async function getMetadata(accountId: string, id: string): Promise<GmailMessageResource> {
  const url = new URL(`${GOOGLE_APIS.gmail}/users/me/messages/${encodeURIComponent(id)}`);
  url.searchParams.set("format", "metadata");
  for (const name of METADATA_HEADERS) {
    url.searchParams.append("metadataHeaders", name);
  }
  try {
    const response = await googleFetch(accountId, url.toString());
    return (await response.json()) as GmailMessageResource;
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === "needs_reauth" ||
        error.code === "permission" ||
        error.code === "network" ||
        error.code === "rate_limited")
    ) {
      throw error;
    }
    const fallback = new URL(`${GOOGLE_APIS.gmail}/users/me/messages/${encodeURIComponent(id)}`);
    fallback.searchParams.set("format", "minimal");
    const response = await googleFetch(accountId, fallback.toString());
    return (await response.json()) as GmailMessageResource;
  }
}

async function mapPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function run(): Promise<void> {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

export const gmailService = {
  async getProfile(accountId: string): Promise<{ email: string; messagesTotal?: number }> {
    const response = await googleFetch(accountId, `${GOOGLE_APIS.gmail}/users/me/profile`);
    const json = (await response.json()) as { emailAddress?: string; messagesTotal?: number };
    return { email: json.emailAddress ?? "", messagesTotal: json.messagesTotal };
  },

  async listMessages(
    accountId: string,
    options?: { q?: string; pageToken?: string; maxResults?: number },
  ): Promise<MessagePage> {
    const maxResults = String(options?.maxResults ?? DEFAULT_PAGE_SIZE);
    const includeSpamTrash = options?.q?.includes("in:trash") ? "true" : undefined;
    const response = await googleFetch(
      accountId,
      messagesUrl("", {
        q: options?.q,
        pageToken: options?.pageToken,
        maxResults,
        includeSpamTrash,
      }),
    );
    const json = (await response.json()) as ListResponse;
    const ids = (json.messages ?? []).map((item) => item.id).filter((id): id is string => Boolean(id));
    const resources = await mapPool(ids, 5, (id) => getMetadata(accountId, id));
    return {
      items: resources
        .filter((message) => message.id)
        .map((message) => toListItem(accountId, message)),
      nextPageTokens: { [accountId]: json.nextPageToken },
    };
  },

  async listAcrossAccounts(
    accountIds: string[],
    options?: { q?: string; pageTokens?: Record<string, string | undefined>; maxResults?: number },
  ): Promise<MessagePage> {
    const pages = await Promise.allSettled(
      accountIds.map((accountId) =>
        gmailService.listMessages(accountId, {
          q: options?.q,
          pageToken: options?.pageTokens?.[accountId],
          maxResults: options?.maxResults,
        }),
      ),
    );
    const items: MessagePage["items"] = [];
    const nextPageTokens: Record<string, string | undefined> = {};
    const warnings: string[] = [];
    for (const [index, accountId] of accountIds.entries()) {
      const result = pages[index];
      if (result.status === "fulfilled") {
        items.push(...result.value.items);
        nextPageTokens[accountId] = result.value.nextPageTokens[accountId];
        if (result.value.warnings) warnings.push(...result.value.warnings);
      } else {
        warnings.push(toUserError(result.reason));
      }
    }
    if (items.length === 0 && warnings.length === accountIds.length) {
      const reason = pages[0];
      throw reason.status === "rejected"
        ? reason.reason
        : new AppError("unknown", "Gmail did not return messages.");
    }
    return { items, nextPageTokens, warnings };
  },

  async getMessage(accountId: string, messageId: string): Promise<MessageDetail> {
    const response = await googleFetch(
      accountId,
      `${GOOGLE_APIS.gmail}/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
    );
    const json = (await response.json()) as GmailMessageResource;
    return toDetail(accountId, json);
  },

  async searchMessages(
    accountId: string,
    query: string,
    options?: { pageToken?: string; maxResults?: number },
  ): Promise<MessagePage> {
    return gmailService.listMessages(accountId, { q: query, ...options });
  },

  async sendMessage(
    _accountId: string,
    _input: { to: string; subject: string; body: string; cc?: string },
  ): Promise<{ id: string }> {
    throw notReady("Sending mail needs a connected account and gmail.send.");
  },

  async modifyMessage(
    _accountId: string,
    _messageId: string,
    _patch: { addLabelIds?: string[]; removeLabelIds?: string[] },
  ): Promise<void> {
    throw notReady("Changing labels needs a connected account and gmail.modify.");
  },

  async trashMessages(accountId: string, ids: string[]): Promise<void> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return;
    await mapPool(unique, 4, async (id) => {
      await googleFetch(
        accountId,
        `${GOOGLE_APIS.gmail}/users/me/messages/${encodeURIComponent(id)}/trash`,
        { method: "POST" },
      );
    });
  },

  async getAttachment(
    _accountId: string,
    _messageId: string,
    _attachmentId: string,
  ): Promise<{ data: ArrayBuffer; size: number }> {
    throw notReady("Attachments are downloaded only when you ask.");
  },

  async getLabels(accountId: string): Promise<{ id: string; name: string }[]> {
    const response = await googleFetch(accountId, `${GOOGLE_APIS.gmail}/users/me/labels`);
    const json = (await response.json()) as { labels?: { id?: string; name?: string }[] };
    return (json.labels ?? [])
      .filter((label): label is { id: string; name: string } => Boolean(label.id && label.name))
      .map((label) => ({ id: label.id, name: label.name }));
  },
};

function notReady(message: string): AppError {
  return new AppError("not_connected", message);
}
