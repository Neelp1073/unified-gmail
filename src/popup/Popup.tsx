import { ChevronRight, LayoutDashboard, PenLine, Plus, Settings } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { MessageListSkeleton } from "@/components/ui/Skeleton";
import { MessageList } from "@/components/mail/MessageList";
import { useHydrateApp } from "@/hooks/useHydrateApp";
import { useThemeSync } from "@/hooks/useThemeSync";
import { useMessageFeed } from "@/hooks/useMessageFeed";
import { useAccountStore } from "@/store/accounts";
import { openDashboard } from "@/lib/openDashboard";
import { LABEL_COLORS, accountBadgeText } from "@/types/account";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConnectAccountDialogHost } from "@/components/accounts/ConnectAccountDialogHost";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { useUiStore } from "@/store/ui";

export function Popup() {
  const ready = useHydrateApp();
  useThemeSync();
  const accounts = useAccountStore((state) => state.accounts);
  const setSelectedAccountId = useAccountStore((state) => state.setSelectedAccountId);
  const setConnectOpen = useUiStore((state) => state.setConnectOpen);
  const feed = useMessageFeed("in:inbox", "newest", ready && accounts.length > 0, 8);

  if (!ready) {
    return (
      <div className="popup-root space-y-3 p-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="popup-root flex flex-col">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Logo size={24} />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Unified Gmail</p>
          <p className="text-[11px] text-muted">
            {accounts.length
              ? `${accounts.length} connected account${accounts.length === 1 ? "" : "s"}`
              : "No accounts connected"}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {accounts.length === 0 ? (
          <div className="p-4">
            <div className="rounded-xl border border-dashed border-line-strong bg-canvas-muted px-3 py-4 text-sm leading-6 text-ink-soft">
              Connect Gmail accounts in the dashboard. Each Google account stays
              separate; this extension only unifies the interface.
            </div>
          </div>
        ) : (
          <>
            <ul className="space-y-2 p-3 pb-1">
              {accounts.map((account) => (
                <li key={account.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-left hover:bg-surface-2"
                    onClick={() => {
                      setSelectedAccountId(account.id);
                      openDashboard("/inbox");
                    }}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: LABEL_COLORS[account.label] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {accountBadgeText(account)} · {account.email}
                    </span>
                    <ChevronRight className="size-4 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-line">
              {feed.loading ? (
                <MessageListSkeleton />
              ) : feed.error ? (
                <p className="px-4 py-3 text-xs leading-5 text-ink-soft">{feed.error}</p>
              ) : feed.items.length === 0 ? (
                <p className="px-4 py-3 text-xs text-muted">
                  {feed.warnings[0] ?? "No inbox messages yet."}
                </p>
              ) : (
                <MessageList
                  compact
                  items={feed.items.slice(0, 8)}
                  onOpen={(item) =>
                    openDashboard(
                      `/mail/${encodeURIComponent(item.accountId)}/${encodeURIComponent(item.id)}`,
                    )
                  }
                />
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
        <Button variant="secondary" onClick={() => openDashboard("/inbox")}>
          <LayoutDashboard className="size-4" />
          Inbox
        </Button>
        <Button variant="secondary" onClick={() => openDashboard("/compose")}>
          <PenLine className="size-4" />
          Compose
        </Button>
        <Button variant="secondary" onClick={() => openDashboard("/settings")}>
          <Settings className="size-4" />
          Settings
        </Button>
        <Button onClick={() => setConnectOpen(true)}>
          <Plus className="size-4" />
          Connect
        </Button>
      </div>
      <ConnectAccountDialogHost />
      <ToastViewport />
    </div>
  );
}
