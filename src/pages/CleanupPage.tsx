import { useEffect, useMemo, useState } from "react";
import { WandSparkles } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MessageListSkeleton } from "@/components/ui/Skeleton";
import { MessageList } from "@/components/mail/MessageList";
import { AccountSwitcher } from "@/components/layout/AccountSwitcher";
import { selectVisibleAccounts, useAccountStore } from "@/store/accounts";
import { useUiStore } from "@/store/ui";
import { useToastStore } from "@/store/toasts";
import { useSettingsStore } from "@/store/settings";
import { useMessageFeed } from "@/hooks/useMessageFeed";
import { gmailService } from "@/services/gmailService";
import { requestReauthGoogle } from "@/auth/bridge";
import { SEARCH_DEBOUNCE_MS, hasGmailModifyScope } from "@/config";
import { accountBadgeText, type Account } from "@/types/account";
import { messageListKey, type MessageListItem } from "@/types/message";
import { toUserError } from "@/utils/errors";

const PRESETS = [
  {
    id: "large",
    label: "Emails with large attachments",
    query: "has:attachment larger:10M",
  },
  {
    id: "old",
    label: "Emails older than 1 year",
    query: "older_than:1y",
  },
  {
    id: "attachments",
    label: "Emails containing attachments",
    query: "has:attachment",
  },
] as const;

interface DeleteStep {
  accountId: string;
  email: string;
  label: string;
  ids: string[];
}

export function CleanupPage() {
  const accounts = useAccountStore((state) => state.accounts);
  const selectedAccountId = useAccountStore((state) => state.selectedAccountId);
  const upsertAccount = useAccountStore((state) => state.upsertAccount);
  const setConnectOpen = useUiStore((state) => state.setConnectOpen);
  const googleClientId = useSettingsStore((state) => state.googleClientId);
  const push = useToastStore((state) => state.push);
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("large");
  const [senderDraft, setSenderDraft] = useState("");
  const [sender, setSender] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<DeleteStep[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [movedCount, setMovedCount] = useState(0);
  const selected = PRESETS.find((item) => item.id === preset)!;

  useEffect(() => {
    const handle = window.setTimeout(() => setSender(senderDraft.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [senderDraft]);

  const query = useMemo(() => {
    const parts: string[] = [selected.query];
    if (sender) parts.push(`from:${sender}`);
    return parts.join(" ");
  }, [selected.query, sender]);

  useEffect(() => {
    setSelectedKeys(new Set());
    setRemovedKeys(new Set());
  }, [query, selectedAccountId]);

  const feed = useMessageFeed(query, "newest", accounts.length > 0);
  const needsReauth = /signed in again|reconnect|connect this account/i.test(feed.error ?? "");
  const visibleAccounts = useMemo(
    () => selectVisibleAccounts(accounts, selectedAccountId),
    [accounts, selectedAccountId],
  );
  const items = useMemo(
    () => feed.items.filter((item) => !removedKeys.has(messageListKey(item))),
    [feed.items, removedKeys],
  );
  const missingModify = visibleAccounts.filter(
    (account) => account.status !== "connecting" && !hasGmailModifyScope(account.scopes),
  );

  function toggleSelect(item: MessageListItem) {
    const key = messageListKey(item);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    const keys = items.map(messageListKey);
    const allSelected = keys.length > 0 && keys.every((key) => selectedKeys.has(key));
    setSelectedKeys(allSelected ? new Set() : new Set(keys));
  }

  function startDelete() {
    const chosen = items.filter((item) => selectedKeys.has(messageListKey(item)));
    if (chosen.length === 0) return;

    const grouped = groupSelectedByAccount(chosen, accounts);
    const blocked = grouped.filter((step) => {
      const account = accounts.find((entry) => entry.id === step.accountId);
      return !account || !hasGmailModifyScope(account.scopes);
    });
    if (blocked.length > 0) {
      push({
        title: "Reconnect to allow Trash",
        description: blocked.map((step) => step.email).join(", "),
        tone: "danger",
      });
      return;
    }

    setMovedCount(0);
    setQueue(grouped);
  }

  async function confirmCurrentAccount() {
    if (!queue || deleting) return;
    const current = queue[0];
    setDeleting(true);
    try {
      await gmailService.trashMessages(current.accountId, current.ids);
      const keys = current.ids.map((id) => `${current.accountId}:${id}`);
      setRemovedKeys((currentKeys) => new Set([...currentKeys, ...keys]));
      setSelectedKeys((currentKeys) => {
        const next = new Set(currentKeys);
        for (const key of keys) next.delete(key);
        return next;
      });
      const nextMoved = movedCount + current.ids.length;
      setMovedCount(nextMoved);
      const rest = queue.slice(1);
      if (rest.length === 0) {
        setQueue(null);
        push({
          title: `Moved ${nextMoved} message${nextMoved === 1 ? "" : "s"} to Trash`,
          tone: "success",
        });
        await feed.reload();
        setRemovedKeys(new Set());
      } else {
        setQueue(rest);
      }
    } catch (error) {
      push({
        title: "Could not move mail to Trash",
        description: toUserError(error),
        tone: "danger",
      });
    } finally {
      setDeleting(false);
    }
  }

  function cancelQueue() {
    if (deleting) return;
    const finished = movedCount;
    setQueue(null);
    if (finished > 0) {
      push({
        title: `Moved ${finished} message${finished === 1 ? "" : "s"} to Trash`,
        description: "Remaining accounts were left unchanged.",
        tone: "success",
      });
      void feed.reload().then(() => setRemovedKeys(new Set()));
    }
  }

  const currentStep = queue?.[0];
  const remainingSteps = queue?.length ?? 0;
  const selectedOnPage = items.filter((item) => selectedKeys.has(messageListKey(item))).length;
  const allOnPageSelected = items.length > 0 && selectedOnPage === items.length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cleanup</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
            Find large or old mail, then move selected messages to Gmail Trash.
            Each account is confirmed separately. Nothing is deleted automatically.
          </p>
        </div>
        <AccountSwitcher />
      </div>

      <Card>
        <CardBody className="space-y-4 pt-5">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={preset === item.id ? "primary" : "secondary"}
                onClick={() => setPreset(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <label className="block text-xs font-medium text-muted">
            From specific sender
            <input
              value={senderDraft}
              onChange={(event) => setSenderDraft(event.target.value)}
              placeholder="optional"
              className="mt-1 h-9 w-full max-w-md rounded-lg border border-line bg-canvas px-3 text-sm"
            />
          </label>
          <p className="text-xs text-muted">Gmail query: {query}</p>
        </CardBody>
      </Card>

      {missingModify.length > 0 ? (
        <div className="rounded-2xl border border-line bg-accent-soft px-4 py-3">
          <p className="text-sm text-ink">
            Trash needs a reconnect so Google can grant permission to move mail.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {missingModify.map((account) => (
              <Button
                key={account.id}
                size="sm"
                variant="secondary"
                onClick={() => {
                  void requestReauthGoogle(account.id, googleClientId, account.email)
                    .then((next) => {
                      void upsertAccount(next);
                      push({
                        title: "Account reconnected",
                        description: next.email,
                        tone: "success",
                      });
                    })
                    .catch((error) => {
                      push({
                        title: "Reconnect failed",
                        description: toUserError(error),
                        tone: "danger",
                      });
                    });
                }}
              >
                Reconnect {account.email}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {accounts.length === 0 ? (
        <EmptyState
          icon={<WandSparkles className="size-5" />}
          title="Connect accounts first"
          description="This tool lists large or old messages with Gmail search. Selected mail can then be moved to Trash."
          actionLabel="Connect a Gmail account"
          onAction={() => setConnectOpen(true)}
        />
      ) : feed.loading ? (
        <MessageListSkeleton />
      ) : feed.error ? (
        <EmptyState
          icon={<WandSparkles className="size-5" />}
          title="Could not run analysis"
          description={feed.error ?? ""}
          actionLabel={needsReauth ? "Connect again" : "Try again"}
          onAction={() => {
            if (needsReauth) {
              setConnectOpen(true);
              return;
            }
            feed.reload();
          }}
        />
      ) : (
        <>
          {feed.warnings.length > 0 ? (
            <p className="rounded-xl border border-line bg-accent-soft px-4 py-2 text-xs leading-5 text-ink-soft">
              {feed.warnings.join(" ")}
            </p>
          ) : null}
          {items.length === 0 ? (
            <EmptyState
              icon={<WandSparkles className="size-5" />}
              title="No messages match this analysis"
              description={`Gmail query: ${query}`}
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2">
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="size-4 accent-accent"
                  />
                  Select all on this page
                </label>
                <p className="text-xs text-muted">
                  {items.length} message{items.length === 1 ? "" : "s"} · {selectedOnPage} selected
                </p>
                <Button
                  size="sm"
                  variant="danger"
                  className="ml-auto"
                  disabled={selectedOnPage === 0 || deleting}
                  onClick={startDelete}
                >
                  Move selected to Trash
                </Button>
              </div>
              <MessageList
                items={items}
                selectedKeys={selectedKeys}
                onToggleSelect={toggleSelect}
              />
              {feed.hasMore ? (
                <div className="flex justify-center py-4">
                  <Button
                    variant="secondary"
                    disabled={feed.loadingMore}
                    onClick={() => feed.loadMore()}
                  >
                    {feed.loadingMore ? "Loading…" : "Load more"}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      {currentStep ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cleanup-delete-title"
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)]"
          >
            <h2 id="cleanup-delete-title" className="text-base font-semibold">
              Move {currentStep.label} mail to Trash?
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {currentStep.ids.length} message{currentStep.ids.length === 1 ? "" : "s"} from{" "}
              {currentStep.email} will go to Gmail Trash. They stay recoverable there for about
              30 days. This is not a permanent delete.
              {remainingSteps > 1
                ? ` You will confirm the remaining ${remainingSteps - 1} account${remainingSteps - 1 === 1 ? "" : "s"} next.`
                : ""}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" disabled={deleting} onClick={cancelQueue}>
                Cancel
              </Button>
              <Button variant="danger" disabled={deleting} onClick={() => void confirmCurrentAccount()}>
                {deleting ? "Moving…" : "Move to Trash"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function groupSelectedByAccount(items: MessageListItem[], accounts: Account[]): DeleteStep[] {
  const idsByAccount = new Map<string, string[]>();
  for (const item of items) {
    const ids = idsByAccount.get(item.accountId) ?? [];
    ids.push(item.id);
    idsByAccount.set(item.accountId, ids);
  }
  return [...idsByAccount.entries()].map(([accountId, ids]) => {
    const account = accounts.find((entry) => entry.id === accountId);
    return {
      accountId,
      email: account?.email ?? accountId,
      label: account ? accountBadgeText(account) : accountId,
      ids,
    };
  });
}
