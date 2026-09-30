import { HardDrive } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAccountStore } from "@/store/accounts";
import { useUiStore } from "@/store/ui";
import { useStorageQuotas } from "@/hooks/useStorageQuotas";
import { formatBytes } from "@/utils/format";
import { LABEL_COLORS, accountBadgeText } from "@/types/account";

export function StoragePage() {
  const accounts = useAccountStore((state) => state.accounts);
  const storageByAccount = useAccountStore((state) => state.storageByAccount);
  const setConnectOpen = useUiStore((state) => state.setConnectOpen);
  useStorageQuotas();

  const known = accounts
    .map((account) => ({ account, storage: storageByAccount[account.id] }))
    .filter((row) => row.storage?.quotaAvailable);

  const used = known.reduce((sum, row) => sum + (row.storage?.usageBytes ?? 0), 0);
  const limit = known.reduce((sum, row) => sum + (row.storage?.limitBytes ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Storage</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
          Combined capacity across connected accounts. Google does not merge these
          quotas. Browse{" "}
          <Link to="/drive" className="text-ink underline underline-offset-2">
            Drive files and photos
          </Link>{" "}
          separately. If an account does not expose quota through the Drive about
          API, that row is labeled instead of guessed.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Connected capacity" value={known.length ? formatBytes(limit) : "—"} />
        <Stat label="Total used" value={known.length ? formatBytes(used) : "—"} />
        <Stat
          label="Total available"
          value={known.length ? formatBytes(Math.max(0, limit - used)) : "—"}
        />
      </div>

      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HardDrive className="size-5" />}
            title="No storage data yet"
            description="Quota is read per Google account. Connect accounts to see used, remaining, and combined totals."
            actionLabel="Connect a Gmail account"
            onAction={() => setConnectOpen(true)}
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {accounts.map((account) => {
            const storage = storageByAccount[account.id];
            const usage = storage?.usageBytes;
            const quota = storage?.limitBytes;
            const ratio =
              usage !== undefined && quota
                ? Math.min(100, Math.round((usage / quota) * 100))
                : 0;
            return (
              <Card key={account.id}>
                <CardHeader className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: LABEL_COLORS[account.label] }}
                  />
                  <h2 className="text-sm font-semibold">
                    {accountBadgeText(account)}
                  </h2>
                  <span className="text-sm text-muted">{account.email}</span>
                </CardHeader>
                <CardBody>
                  {storage?.quotaAvailable && quota !== undefined ? (
                    <>
                      <div className="h-2 overflow-hidden rounded-full bg-canvas-muted">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                      <p className="mt-3 text-sm text-ink-soft">
                        Used {formatBytes(usage)} · Quota {formatBytes(quota)} ·
                        Remaining {formatBytes(Math.max(0, quota - (usage ?? 0)))}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-ink-soft">
                      {storage?.quotaNote ??
                        "Storage quota is not loaded for this account yet. Numbers will not be invented."}
                    </p>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody className="pt-5">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardBody>
    </Card>
  );
}
