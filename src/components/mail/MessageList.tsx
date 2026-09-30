import { Link } from "react-router-dom";
import { Paperclip, Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useAccountStore } from "@/store/accounts";
import { LABEL_COLORS, accountBadgeText } from "@/types/account";
import { messageListKey, type MessageListItem } from "@/types/message";
import { formatMessageDate, initials } from "@/utils/format";
import { cn } from "@/utils/cn";

export function MessageList({
  items,
  onOpen,
  compact = false,
  selectedKeys,
  onToggleSelect,
}: {
  items: MessageListItem[];
  onOpen?: (item: MessageListItem) => void;
  compact?: boolean;
  selectedKeys?: Set<string>;
  onToggleSelect?: (item: MessageListItem) => void;
}) {
  const accounts = useAccountStore((state) => state.accounts);

  return (
    <ul className="divide-y divide-line">
      {items.map((item) => {
        const account = accounts.find((entry) => entry.id === item.accountId);
        const key = messageListKey(item);
        const selected = selectedKeys?.has(key) ?? false;
        const className = cn(
          "flex min-w-0 flex-1 items-start gap-3 text-left hover:bg-surface-2",
          compact ? "px-3 py-2" : "px-4 py-3",
          item.unread && "bg-accent-soft/40",
        );
        const body = (
          <>
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink-soft">
              {initials(item.fromName || item.fromEmail)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    "min-w-0 truncate text-sm",
                    item.unread ? "font-semibold text-ink" : "font-medium text-ink-soft",
                  )}
                >
                  {item.fromName}
                </p>
                {account ? (
                  <Badge color={LABEL_COLORS[account.label]} className="shrink-0">
                    {accountBadgeText(account)}
                  </Badge>
                ) : null}
                <span className="ml-auto shrink-0 text-xs text-muted">
                  {formatMessageDate(item.internalDate)}
                </span>
              </div>
              <p
                className={cn(
                  "truncate text-sm",
                  item.unread ? "font-medium text-ink" : "text-ink-soft",
                )}
              >
                {item.subject}
              </p>
              <p className="truncate text-xs text-muted">{item.snippet}</p>
            </div>
            <div className="mt-1 flex shrink-0 items-center gap-1 text-muted">
              {item.starred ? <Star className="size-3.5 fill-current text-accent" /> : null}
              {item.hasAttachment ? <Paperclip className="size-3.5" /> : null}
            </div>
          </>
        );

        return (
          <li key={key} className="flex items-stretch">
            {onToggleSelect ? (
              <label className="flex cursor-pointer items-start px-3 pt-3.5">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggleSelect(item)}
                  aria-label={`Select ${item.subject || "message"}`}
                  className="mt-1 size-4 accent-accent"
                />
              </label>
            ) : null}
            {onOpen ? (
              <button type="button" className={className} onClick={() => onOpen(item)}>
                {body}
              </button>
            ) : (
              <Link
                to={`/mail/${encodeURIComponent(item.accountId)}/${encodeURIComponent(item.id)}`}
                className={className}
              >
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
