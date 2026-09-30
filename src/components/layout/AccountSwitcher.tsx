import { ChevronDown } from "lucide-react";
import { useAccountStore } from "@/store/accounts";
import { LABEL_COLORS, accountBadgeText } from "@/types/account";
import { cn } from "@/utils/cn";

export function AccountSwitcher({ compact = false }: { compact?: boolean }) {
  const accounts = useAccountStore((state) => state.accounts);
  const selectedAccountId = useAccountStore((state) => state.selectedAccountId);
  const setSelectedAccountId = useAccountStore((state) => state.setSelectedAccountId);

  const selected =
    selectedAccountId === "all"
      ? "All accounts"
      : accounts.find((account) => account.id === selectedAccountId)?.email ??
        "All accounts";

  return (
    <label className={cn("relative inline-flex", compact ? "w-full" : "min-w-44")}>
      <span className="sr-only">Filter by account</span>
      <select
        value={selectedAccountId}
        onChange={(event) => setSelectedAccountId(event.target.value)}
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-line bg-surface pr-8 pl-3 text-sm",
          "text-ink hover:border-line-strong",
        )}
      >
        <option value="all">All accounts</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {accountBadgeText(account)} · {account.email}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      {selectedAccountId !== "all" ? (
        <span className="sr-only">Showing {selected}</span>
      ) : null}
      {accounts[0] ? (
        <span
          className="pointer-events-none absolute top-1/2 left-2 hidden size-2 -translate-y-1/2 rounded-full"
          style={{ background: LABEL_COLORS[accounts[0].label] }}
        />
      ) : null}
    </label>
  );
}
