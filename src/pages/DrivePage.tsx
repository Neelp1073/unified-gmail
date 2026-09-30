import { useEffect, useMemo, useRef, useState } from "react";
import { FolderOpen, Image, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { MessageListSkeleton } from "@/components/ui/Skeleton";
import { AccountSwitcher } from "@/components/layout/AccountSwitcher";
import { selectVisibleAccounts, useAccountStore } from "@/store/accounts";
import { useUiStore } from "@/store/ui";
import { useToastStore } from "@/store/toasts";
import { useSettingsStore } from "@/store/settings";
import { useDriveFeed } from "@/hooks/useDriveFeed";
import { driveService } from "@/services/driveService";
import { requestReauthGoogle } from "@/auth/bridge";
import {
  SEARCH_DEBOUNCE_MS,
  hasDriveContentScope,
  hasDriveListScope,
  hasDriveWriteScope,
} from "@/config";
import { accountBadgeText, LABEL_COLORS, type Account } from "@/types/account";
import {
  buildDriveQuery,
  driveFileKey,
  driveOpenUrl,
  isDriveFolder,
  isDriveMedia,
  type DriveFileItem,
} from "@/types/drive";
import { formatBytes, formatMessageDate } from "@/utils/format";
import { toUserError } from "@/utils/errors";
import { cn } from "@/utils/cn";

type DriveTab = "files" | "photos";

export function DrivePage() {
  const accounts = useAccountStore((state) => state.accounts);
  const selectedAccountId = useAccountStore((state) => state.selectedAccountId);
  const upsertAccount = useAccountStore((state) => state.upsertAccount);
  const setConnectOpen = useUiStore((state) => state.setConnectOpen);
  const googleClientId = useSettingsStore((state) => state.googleClientId);
  const push = useToastStore((state) => state.push);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<DriveTab>("files");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [uploadAccountId, setUploadAccountId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchDraft.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchDraft]);

  const query = useMemo(() => buildDriveQuery(tab, search), [tab, search]);
  const feed = useDriveFeed(query, accounts.length > 0);
  const visibleAccounts = useMemo(
    () => selectVisibleAccounts(accounts, selectedAccountId),
    [accounts, selectedAccountId],
  );

  useEffect(() => {
    if (selectedAccountId !== "all" && visibleAccounts.some((account) => account.id === selectedAccountId)) {
      setUploadAccountId(selectedAccountId);
      return;
    }
    setUploadAccountId((current) =>
      visibleAccounts.some((account) => account.id === current)
        ? current
        : (visibleAccounts[0]?.id ?? ""),
    );
  }, [selectedAccountId, visibleAccounts]);

  const uploadAccount = visibleAccounts.find((account) => account.id === uploadAccountId);
  const missingList = visibleAccounts.filter((account) => !hasDriveListScope(account.scopes));
  const missingWrite = visibleAccounts.filter((account) => !hasDriveWriteScope(account.scopes));
  const missingContent = visibleAccounts.filter((account) => !hasDriveContentScope(account.scopes));
  const reconnectAccounts = missingList.length > 0 ? missingList : missingWrite.length > 0 ? missingWrite : missingContent;
  const canUpload = Boolean(uploadAccount && hasDriveWriteScope(uploadAccount.scopes) && !uploading);
  const needsReauth = /signed in again|reconnect|permission|Drive access/i.test(feed.error ?? "");

  async function uploadFiles(fileList: FileList | File[]) {
    const files = [...fileList].filter((file) => file.size >= 0);
    if (files.length === 0) return;
    if (!uploadAccount) {
      push({ title: "Choose an account to upload to", tone: "danger" });
      return;
    }
    if (!hasDriveWriteScope(uploadAccount.scopes)) {
      push({
        title: "Reconnect to add files",
        description: uploadAccount.email,
        tone: "danger",
      });
      return;
    }

    setUploading(true);
    let uploaded = 0;
    const failures: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        setProgress(`Uploading ${index + 1} of ${files.length} · ${file.name}`);
        try {
          await driveService.uploadFile(uploadAccount.id, file);
          uploaded += 1;
        } catch (error) {
          failures.push(`${file.name}: ${toUserError(error)}`);
        }
      }
      if (uploaded > 0) {
        if (files.some((file) => !isDriveMedia(file.type || "application/octet-stream"))) {
          setTab("files");
        }
        await feed.reload();
        push({
          title: `Uploaded ${uploaded} file${uploaded === 1 ? "" : "s"} to ${uploadAccount.email}`,
          tone: "success",
        });
      }
      if (failures.length > 0) {
        push({
          title: "Some files did not upload",
          description: failures.slice(0, 3).join(" · "),
          tone: "danger",
        });
      }
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div
      className={cn("mx-auto max-w-6xl space-y-6 p-6", dragOver && "rounded-3xl outline-2 outline-dashed outline-accent")}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setDragOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        void uploadFiles(event.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Drive</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
            Add photos, videos, or any file to the selected Google account. Files
            go to that account&apos;s Drive, not a shared bucket. Google Photos
            library items that are not in Drive cannot be listed by third-party
            apps;{" "}
            <a
              href="https://photos.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-ink underline underline-offset-2"
            >
              open Google Photos
            </a>{" "}
            for those.
          </p>
        </div>
        <AccountSwitcher />
      </div>

      {reconnectAccounts.length > 0 ? (
        <ReconnectBanner
          accounts={reconnectAccounts}
          message={
            missingList.length > 0
              ? "Reconnect so Google can list Drive files for this account."
              : missingWrite.length > 0
                ? "Reconnect to allow adding photos, videos, and other files to Drive."
                : "Reconnect to allow photo previews. File names still load with current Drive metadata access."
          }
          clientId={googleClientId}
          onReconnected={(next) => {
            void upsertAccount(next);
            push({ title: "Account reconnected", description: next.email, tone: "success" });
          }}
          onError={(error) =>
            push({ title: "Reconnect failed", description: toUserError(error), tone: "danger" })
          }
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={tab === "files" ? "primary" : "secondary"} onClick={() => setTab("files")}>
          All files
        </Button>
        <Button size="sm" variant={tab === "photos" ? "primary" : "secondary"} onClick={() => setTab("photos")}>
          Photos & videos
        </Button>
        {visibleAccounts.length > 1 ? (
          <label className="flex items-center gap-2 text-xs text-muted">
            Upload to
            <select
              value={uploadAccountId}
              onChange={(event) => setUploadAccountId(event.target.value)}
              className="h-8 rounded-lg border border-line bg-surface px-2 text-sm text-ink"
            >
              {visibleAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {accountBadgeText(account)} · {account.email}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void uploadFiles(event.target.files);
          }}
        />
        <Button
          size="sm"
          disabled={!canUpload}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          {uploading ? "Uploading…" : "Add files"}
        </Button>
        <input
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search by name"
          className="ml-auto h-9 w-full max-w-xs rounded-lg border border-line bg-canvas px-3 text-sm"
        />
      </div>

      {progress ? <p className="text-xs text-ink-soft">{progress}</p> : null}

      {accounts.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-5" />}
          title="Connect accounts first"
          description="Drive files stay in their Google account. Unified Gmail only lists them together."
          actionLabel="Connect a Gmail account"
          onAction={() => setConnectOpen(true)}
        />
      ) : feed.loading ? (
        <MessageListSkeleton />
      ) : feed.error ? (
        <EmptyState
          icon={<FolderOpen className="size-5" />}
          title="Could not list Drive files"
          description={feed.error}
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
            <p className="rounded-xl border border-line bg-accent-soft px-4 py-2 text-xs leading-5 text-ink-soft">
              {feed.warnings.join(" ")}
            </p>
          ) : null}
          {feed.items.length === 0 ? (
            <EmptyState
              icon={tab === "photos" ? <Image className="size-5" /> : <FolderOpen className="size-5" />}
              title={tab === "photos" ? "No photos or videos in Drive" : "No Drive files found"}
              description={
                canUpload
                  ? "Drop files here or click Add files. Photos, videos, and any other type go to the selected account."
                  : tab === "photos"
                    ? "This tab only shows images and videos stored in Drive, not the full Google Photos library."
                    : `Drive query: ${query}`
              }
              actionLabel={canUpload ? "Add files" : undefined}
              onAction={canUpload ? () => fileInputRef.current?.click() : undefined}
            />
          ) : tab === "photos" ? (
            <PhotoGrid items={feed.items} />
          ) : (
            <FileTable items={feed.items} />
          )}
          {feed.hasMore ? (
            <div className="flex justify-center">
              <Button variant="secondary" disabled={feed.loadingMore} onClick={() => feed.loadMore()}>
                {feed.loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <p className="text-xs text-muted">
        Storage quotas are on the{" "}
        <Link to="/storage" className="underline underline-offset-2">
          Storage
        </Link>{" "}
        page. Drop files onto this page to upload them.
      </p>
    </div>
  );
}

function ReconnectBanner({
  accounts,
  message,
  clientId,
  onReconnected,
  onError,
}: {
  accounts: Account[];
  message: string;
  clientId: string;
  onReconnected: (account: Account) => void;
  onError: (error: unknown) => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-accent-soft px-4 py-3">
      <p className="text-sm text-ink">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {accounts.map((account) => (
          <Button
            key={account.id}
            size="sm"
            variant="secondary"
            onClick={() => {
              void requestReauthGoogle(account.id, clientId, account.email).then(onReconnected, onError);
            }}
          >
            Reconnect {account.email}
          </Button>
        ))}
      </div>
    </div>
  );
}

function FileTable({ items }: { items: DriveFileItem[] }) {
  const accounts = useAccountStore((state) => state.accounts);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-canvas-muted text-xs text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Account</th>
            <th className="px-4 py-3 font-medium">Modified</th>
            <th className="px-4 py-3 font-medium">Size</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((item) => {
            const account = accounts.find((entry) => entry.id === item.accountId);
            return (
              <tr key={driveFileKey(item)} className="hover:bg-surface-2">
                <td className="px-4 py-3">
                  <a
                    href={driveOpenUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-ink hover:underline"
                  >
                    {item.iconLink ? <img src={item.iconLink} alt="" className="size-4" /> : null}
                    <span className="min-w-0 truncate">{item.name}</span>
                  </a>
                </td>
                <td className="px-4 py-3 capitalize text-ink-soft">{mimeLabel(item.mimeType)}</td>
                <td className="px-4 py-3">
                  {account ? (
                    <Badge color={LABEL_COLORS[account.label]}>{accountBadgeText(account)}</Badge>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted">
                  {item.modifiedTime ? formatMessageDate(item.modifiedTime) : "—"}
                </td>
                <td className="px-4 py-3 text-muted">
                  {isDriveFolder(item.mimeType) ? "—" : formatBytes(item.size)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PhotoGrid({ items }: { items: DriveFileItem[] }) {
  const accounts = useAccountStore((state) => state.accounts);
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const account = accounts.find((entry) => entry.id === item.accountId);
        return (
          <li key={driveFileKey(item)}>
            <a
              href={driveOpenUrl(item)}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-2xl border border-line bg-surface hover:border-line-strong"
            >
              <div className="relative aspect-[4/3] bg-canvas-muted">
                {item.thumbnailLink ? (
                  <img
                    src={item.thumbnailLink}
                    alt=""
                    className="size-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted">
                    <Image className="size-8" />
                  </div>
                )}
              </div>
              <div className="space-y-1 px-3 py-2">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <div className="flex items-center gap-2">
                  {account ? (
                    <Badge color={LABEL_COLORS[account.label]}>{accountBadgeText(account)}</Badge>
                  ) : null}
                  <span className="ml-auto text-[11px] text-muted">{formatBytes(item.size)}</span>
                </div>
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function mimeLabel(mimeType: string): string {
  if (mimeType.startsWith("application/vnd.google-apps.")) {
    return mimeType.replace("application/vnd.google-apps.", "").replaceAll("-", " ");
  }
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  const subtype = mimeType.split("/")[1];
  return subtype || mimeType;
}
