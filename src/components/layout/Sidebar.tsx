import { NavLink } from "react-router-dom";
import {
  Inbox,
  LayoutDashboard,
  Mails,
  Star,
  Send,
  Paperclip,
  Trash2,
  PieChart,
  FolderOpen,
  WandSparkles,
  Settings,
  Plus,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { useAccountStore } from "@/store/accounts";
import { useUiStore } from "@/store/ui";
import { LABEL_COLORS, accountBadgeText } from "@/types/account";
import { formatBytes } from "@/utils/format";
import { cn } from "@/utils/cn";

const MAIL_LINKS = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/all", label: "All mail", icon: Mails },
  { to: "/starred", label: "Starred", icon: Star },
  { to: "/sent", label: "Sent", icon: Send },
  { to: "/files", label: "Attachments", icon: Paperclip },
  { to: "/trash", label: "Trash", icon: Trash2 },
] as const;

const INSIGHT_LINKS = [
  { to: "/storage", label: "Storage", icon: PieChart },
  { to: "/drive", label: "Drive", icon: FolderOpen },
  { to: "/cleanup", label: "Cleanup", icon: WandSparkles },
] as const;

export function Sidebar() {
  const accounts = useAccountStore((state) => state.accounts);
  const storageByAccount = useAccountStore((state) => state.storageByAccount);
  const selectedAccountId = useAccountStore((state) => state.selectedAccountId);
  const setSelectedAccountId = useAccountStore((state) => state.setSelectedAccountId);
  const setConnectOpen = useUiStore((state) => state.setConnectOpen);

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-line bg-canvas-muted/80">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <Logo size={26} />
        <div>
          <p className="text-sm font-semibold tracking-tight">Unified Gmail</p>
          <p className="text-[11px] text-muted">Separate accounts, one view</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        <p className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
          Mail
        </p>
        {MAIL_LINKS.map((link) => (
          <SideLink key={link.to} {...link} />
        ))}

        <p className="px-2 pt-4 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
          Insights
        </p>
        {INSIGHT_LINKS.map((link) => (
          <SideLink key={link.to} {...link} />
        ))}

        <p className="px-2 pt-4 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
          Connected accounts
        </p>
        {accounts.length === 0 ? (
          <p className="px-2 py-2 text-xs leading-5 text-ink-soft">
            None yet. Connect Gmail accounts to search and read them together.
          </p>
        ) : (
          <ul className="space-y-1">
            {accounts.map((account) => {
              const storage = storageByAccount[account.id];
              const active = selectedAccountId === account.id;
              return (
                <li key={account.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedAccountId(active ? "all" : account.id)
                    }
                    className={cn(
                      "w-full rounded-xl px-2 py-2 text-left hover:bg-surface",
                      active && "bg-surface",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: LABEL_COLORS[account.label] }}
                      />
                      <span className="truncate text-xs font-medium">
                        {accountBadgeText(account)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate pl-4 text-[11px] text-muted">
                      {account.email}
                    </span>
                    {storage?.quotaAvailable ? (
                      <span className="mt-0.5 block pl-4 text-[11px] text-muted">
                        {formatBytes(storage.usageBytes)} /{" "}
                        {formatBytes(storage.limitBytes)}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="mt-2 w-full"
          onClick={() => setConnectOpen(true)}
        >
          <Plus className="size-3.5" />
          Connect account
        </Button>
      </nav>

      <div className="border-t border-line p-3">
        <SideLink to="/settings" label="Settings" icon={Settings} />
      </div>
    </aside>
  );
}

function SideLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: typeof Inbox;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-soft hover:bg-surface hover:text-ink",
          isActive && "bg-surface text-ink font-medium shadow-sm",
        )
      }
    >
      <Icon className="size-4" />
      {label}
    </NavLink>
  );
}
