import { useCallback, useEffect, useMemo, useState } from "react";
import { driveService } from "@/services/driveService";
import { selectVisibleAccounts, useAccountStore } from "@/store/accounts";
import { toUserError } from "@/utils/errors";
import type { DriveFileItem } from "@/types/drive";

export function useDriveFeed(query: string, enabled = true) {
  const accounts = useAccountStore((state) => state.accounts);
  const selectedAccountId = useAccountStore((state) => state.selectedAccountId);
  const visible = useMemo(
    () => selectVisibleAccounts(accounts, selectedAccountId),
    [accounts, selectedAccountId],
  );
  const accountKey = visible.map((account) => account.id).join(",");

  const [items, setItems] = useState<DriveFileItem[]>([]);
  const [tokens, setTokens] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const load = useCallback(
    async (pageTokens?: Record<string, string | undefined>) => {
      if (!enabled || visible.length === 0) {
        setItems([]);
        setTokens({});
        setError(null);
        setWarnings([]);
        setLoading(false);
        return;
      }
      const appending = Boolean(pageTokens);
      if (appending) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const page = await driveService.listAcrossAccounts(
          visible.map((account) => account.id),
          { q: query, pageTokens },
        );
        const ordered = [...page.items].sort((a, b) => {
          const aTime = a.modifiedTime ? Date.parse(a.modifiedTime) : 0;
          const bTime = b.modifiedTime ? Date.parse(b.modifiedTime) : 0;
          return bTime - aTime;
        });
        setItems((current) => (appending ? mergeFiles(current, ordered) : ordered));
        setTokens(page.nextPageTokens);
        setWarnings(page.warnings ?? []);
      } catch (cause) {
        setError(toUserError(cause));
        if (!appending) {
          setItems([]);
          setWarnings([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [enabled, query, visible],
  );

  useEffect(() => {
    void load();
  }, [load, accountKey]);

  const hasMore = Object.values(tokens).some(Boolean);

  return {
    items,
    loading,
    loadingMore,
    error,
    warnings,
    hasMore,
    reload: () => load(),
    loadMore: () => load(tokens),
    connected: visible.length > 0,
  };
}

function mergeFiles(current: DriveFileItem[], incoming: DriveFileItem[]): DriveFileItem[] {
  const seen = new Set(current.map((item) => `${item.accountId}:${item.id}`));
  const next = [...current];
  for (const item of incoming) {
    const key = `${item.accountId}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }
  return next;
}
