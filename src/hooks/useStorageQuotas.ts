import { useEffect } from "react";
import { driveService } from "@/services/driveService";
import { useAccountStore } from "@/store/accounts";

const MAX_AGE_MS = 15 * 60 * 1000;

export function useStorageQuotas(): void {
  const accounts = useAccountStore((state) => state.accounts);

  useEffect(() => {
    if (accounts.length === 0) return;
    let cancelled = false;

    void (async () => {
      const { storageByAccount, upsertStorage } = useAccountStore.getState();
      for (const account of accounts) {
        const existing = storageByAccount[account.id];
        const fetchedAt = existing?.fetchedAt
          ? new Date(existing.fetchedAt).getTime()
          : 0;
        if (fetchedAt && Date.now() - fetchedAt < MAX_AGE_MS) continue;
        try {
          const quota = await driveService.getStorageQuota(account.id);
          if (!cancelled) await upsertStorage(quota);
        } catch {
          // Leave the row unlabeled rather than inventing quota.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accounts]);
}
