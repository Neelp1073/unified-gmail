import { Inbox, Plus } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useAccountStore } from "@/store/accounts";
import { useUiStore } from "@/store/ui";
import { useStorageQuotas } from "@/hooks/useStorageQuotas";
import { formatBytes } from "@/utils/format";
import { LABEL_COLORS, accountBadgeText } from "@/types/account";

export function DashboardPage() {
  const accounts = useAccountStore((state) => state.accounts);
  const storageByAccount = useAccountStore((state) => state.storageByAccount);
  const setConnectOpen = useUiStore((state) => state.setConnectOpen);
  useStorageQuotas();

  const quotas = accounts
    .map((account) => storageByAccount[account.id])
    .filter((entry) => entry?.quotaAvailable && entry.limitBytes !== undefined);

  const used = quotas.reduce((sum, entry) => sum + (entry.usageBytes ?? 0), 0);
  const limit = quotas.reduce((sum, entry) => sum + (entry.limitBytes ?? 0), 0);
  const available = Math.max(0, limit - used);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
            Combined capacity across connected accounts. This is an aggregation of
            separate Google accounts, not a single Gmail storage quota.
          </p>
        </div>
        <Button onClick={() => setConnectOpen(true)}>
          <Plus className="size-4" />
          Connect Gmail
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Connected accounts" value={String(accounts.length)} />
        <Metric
          label="Combined capacity"
          value={quotas.length ? formatBytes(limit) : "—"}
          hint={quotas.length ? undefined : "Available after accounts connect"}
        />
        <Metric
          label="Used"
          value={quotas.length ? formatBytes(used) : "—"}
        />
        <Metric
          label="Available"
          value={quotas.length ? formatBytes(available) : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Connected accounts</h2>
        </CardHeader>
        <CardBody>
          {accounts.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-5" />}
              title="No Gmail accounts yet"
              description="Connect each Google account separately. Mail stays in its original account; Unified Gmail only gives you one place to read, search, and send."
              actionLabel="Connect a Gmail account"
              onAction={() => setConnectOpen(true)}
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-line">
              {accounts.map((account) => {
                const storage = storageByAccount[account.id];
                return (
                  <li key={account.id} className="flex items-center gap-3 py-3">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: LABEL_COLORS[account.label] }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {accountBadgeText(account)} · {account.email}
                      </p>
                      <p className="text-xs text-muted">
                        {storage?.quotaAvailable
                          ? `${formatBytes(storage.usageBytes)} / ${formatBytes(storage.limitBytes)}`
                          : (storage?.quotaNote ?? "Storage quota not loaded")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardBody className="pt-5">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </CardBody>
    </Card>
  );
}
