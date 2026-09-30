import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { MessageListSkeleton } from "@/components/ui/Skeleton";
import { MessageList } from "@/components/mail/MessageList";
import { AccountSwitcher } from "@/components/layout/AccountSwitcher";
import { useAccountStore } from "@/store/accounts";
import { useUiStore } from "@/store/ui";
import { useMessageFeed } from "@/hooks/useMessageFeed";
import { buildGmailQuery } from "@/services/gmailQuery";
import { SEARCH_DEBOUNCE_MS } from "@/config";

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [hasAttachment, setHasAttachment] = useState(false);
  const [from, setFrom] = useState("");
  const [after, setAfter] = useState("");
  const accounts = useAccountStore((state) => state.accounts);
  const setConnectOpen = useUiStore((state) => state.setConnectOpen);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = new URLSearchParams();
      if (draft.trim()) next.set("q", draft.trim());
      setParams(next, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [draft, setParams]);

  const gmailQuery = useMemo(
    () =>
      buildGmailQuery({
        query: q,
        unreadOnly,
        starredOnly,
        hasAttachment,
        from,
        after,
      }),
    [q, unreadOnly, starredOnly, hasAttachment, from, after],
  );

  const ready = Boolean(gmailQuery);
  const feed = useMessageFeed(gmailQuery, "newest", ready && accounts.length > 0);
  const showFeed = ready && accounts.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mx-auto w-full max-w-5xl p-6 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-ink-soft">
          One query is sent to each connected Gmail account using Gmail search
          operators. Results stay in this browser.
        </p>

        <div className="mt-5 grid gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-2">
          <label className="text-xs font-medium text-muted">
            Query
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="invoice, from:alice, subject:report"
              className="mt-1 h-9 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
            />
          </label>
          <label className="text-xs font-medium text-muted">
            Account
            <div className="mt-1">
              <AccountSwitcher compact />
            </div>
          </label>
          <label className="text-xs font-medium text-muted">
            Sender
            <input
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              placeholder="name or email"
              className="mt-1 h-9 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
            />
          </label>
          <label className="text-xs font-medium text-muted">
            After date
            <input
              type="date"
              value={after}
              onChange={(event) => setAfter(event.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
            <Toggle label="Unread" on={unreadOnly} setOn={setUnreadOnly} />
            <Toggle label="Starred" on={starredOnly} setOn={setStarredOnly} />
            <Toggle label="Has attachment" on={hasAttachment} setOn={setHasAttachment} />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {accounts.length === 0 ? (
          <EmptyState
            icon={<Search className="size-5" />}
            title="Search needs a connected account"
            description="When accounts are connected, this view paginates Gmail search results instead of downloading every message."
            actionLabel="Connect a Gmail account"
            onAction={() => setConnectOpen(true)}
          />
        ) : !ready ? (
          <p className="px-6 pb-8 text-sm text-ink-soft">Type a query to search connected accounts.</p>
        ) : showFeed && feed.loading ? (
          <MessageListSkeleton />
        ) : showFeed && feed.error ? (
          <EmptyState
            icon={<Search className="size-5" />}
            title="Search failed"
            description={feed.error}
            actionLabel="Try again"
            onAction={() => feed.reload()}
          />
        ) : showFeed && feed.items.length === 0 ? (
          <EmptyState
            icon={<Search className="size-5" />}
            title="No matches"
            description={`Gmail query: ${gmailQuery}`}
          />
        ) : showFeed ? (
          <>
            <MessageList items={feed.items} />
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
          </>
        ) : null}
      </div>
    </div>
  );
}

function Toggle({
  label,
  on,
  setOn,
}: {
  label: string;
  on: boolean;
  setOn: (value: boolean) => void;
}) {
  return (
    <Button variant={on ? "primary" : "secondary"} size="sm" onClick={() => setOn(!on)}>
      {label}
    </Button>
  );
}
