import { Paperclip } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { AccountSwitcher } from "@/components/layout/AccountSwitcher";
import { useAccountStore } from "@/store/accounts";
import { useUiStore } from "@/store/ui";
import { useState } from "react";
import { cn } from "@/utils/cn";

const FILE_FILTERS = [
  "all",
  "pdf",
  "images",
  "documents",
  "videos",
  "large",
] as const;

type FileFilter = (typeof FILE_FILTERS)[number];

export function AttachmentsPage() {
  const accounts = useAccountStore((state) => state.accounts);
  const setConnectOpen = useUiStore((state) => state.setConnectOpen);
  const [filter, setFilter] = useState<FileFilter>("all");

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attachments</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
            Find files across connected accounts. Attachments are listed from Gmail
            metadata and downloaded only when you request them.
          </p>
        </div>
        <AccountSwitcher />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILE_FILTERS.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={filter === item ? "primary" : "secondary"}
            className={cn("capitalize")}
            onClick={() => setFilter(item)}
          >
            {item === "all" ? "All types" : item === "large" ? "Large files" : item}
          </Button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas-muted text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Filename</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Sender</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Size</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7}>
                <EmptyState
                  icon={<Paperclip className="size-5" />}
                  title={
                    accounts.length
                      ? "No attachments loaded yet"
                      : "Connect accounts to browse attachments"
                  }
                  description="This table stays empty until Gmail search returns messages with attachments. Files are not pre-downloaded."
                  actionLabel={accounts.length ? undefined : "Connect a Gmail account"}
                  onAction={accounts.length ? undefined : () => setConnectOpen(true)}
                  className="py-12"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
