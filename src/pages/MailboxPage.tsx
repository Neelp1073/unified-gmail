import { useMemo, useState, type ReactNode } from "react";
import { Inbox, Paperclip, Star } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { AccountSwitcher } from "@/components/layout/AccountSwitcher";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { MessageListSkeleton } from "@/components/ui/Skeleton";
import { MessageList } from "@/components/mail/MessageList";
import { useAccountStore } from "@/store/accounts";
import { useUiStore } from "@/store/ui";
import { useMessageFeed } from "@/hooks/useMessageFeed";
import { buildGmailQuery } from "@/services/gmailQuery";
import type { MailboxId } from "@/types/message";
import { cn } from "@/utils/cn";

const MAILBOX_COPY: Record<MailboxId, { title: string; empty: string }> = {
  inbox: {
    title: "Unified inbox",
    empty: "No messages in inbox for the selected accounts.",
  },
  all: {
    title: "All mail",
    empty: "No messages for the selected accounts.",
  },
  starred: {
    title: "Starred",
    empty: "No starred messages for the selected accounts.",
  },
  sent: {
    title: "Sent",
    empty: "No sent messages for the selected accounts.",
  },
  trash: {
    title: "Trash",
    empty: "Trash is empty for the selected accounts.",
  },
};

export function MailboxPage({ mailbox }: { mailbox: MailboxId }) {
  const accounts = useAccountStore((state) => state.accounts);
  const selectedAccountId = useAccountStore((state) => state.selectedAccountId);
  const setConnectOpen = useUiStore((state) => state.setConnectOpen);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [hasAttachment, setHasAttachment] = useState(false);

  const query = useMemo(
    () =>
      buildGmailQuery({
        mailbox,
        unreadOnly,
        starredOnly,
        hasAttachment,
        sort,
      }),
    [mailbox, unreadOnly, starredOnly, hasAttachment, sort],
  );

  const feed = useMessageFeed(query, sort);
  const copy = MAILBOX_COPY[mailbox];
  const needsReauth = /signed in again|reconnect|connect this account/i.test(feed.error ?? "");

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <div className="mr-auto">
          <h1 className="text-sm font-semibold">{copy.title}</h1>
          <p className="text-xs text-muted">
            {selectedAccountId === "all"
              ? "All connected accounts"
              : "Filtered to one account"}
          </p>
        </div>
        <div className="sm:hidden">
          <AccountSwitcher compact />
        </div>
        <SegmentedControl
          ariaLabel="Sort"
          value={sort}
          onChange={setSort}
          options={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
          ]}
        />
        <FilterChip active={unreadOnly} onClick={() => setUnreadOnly((v) => !v)}>
          Unread
        </FilterChip>
        <FilterChip active={starredOnly} onClick={() => setStarredOnly((v) => !v)}>
          <Star className="size-3" /> Starred
        </FilterChip>
        <FilterChip active={hasAttachment} onClick={() => setHasAttachment((v) => !v)}>
          <Paperclip className="size-3" /> Attachment
        </FilterChip>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-5" />}
          title="Connect accounts to load mail"
          description="Mail from every connected Gmail account will appear here. Each message keeps an account badge."
          actionLabel="Connect a Gmail account"
          onAction={() => setConnectOpen(true)}
        />
      ) : feed.loading ? (
        <MessageListSkeleton />
      ) : feed.error ? (
        <EmptyState
          icon={<Inbox className="size-5" />}
          title="Could not load mail"
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
            <p className="border-b border-line bg-accent-soft px-4 py-2 text-xs leading-5 text-ink-soft">
              {feed.warnings.join(" ")}
            </p>
          ) : null}
          {feed.items.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-5" />}
              title={copy.empty}
              description={`Gmail query: ${query}`}
            />
          ) : (
            <div>
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
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant={active ? "primary" : "secondary"}
      size="sm"
      onClick={onClick}
      className={cn("rounded-full", active && "shadow-none")}
    >
      {children}
    </Button>
  );
}
