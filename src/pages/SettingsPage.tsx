import { useEffect, type ReactNode } from "react";
import { useSettingsStore } from "@/store/settings";
import { useAccountStore } from "@/store/accounts";
import { useUiStore } from "@/store/ui";
import { useToastStore } from "@/store/toasts";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { storageClearAppData } from "@/lib/storage";
import { tokenStore } from "@/auth/tokenStore";
import {
  requestDisconnectGoogle,
  requestReauthGoogle,
} from "@/auth/bridge";
import { warmUpPkce } from "@/auth/oauth";
import { oauthRedirectUrl, AUTH_SCOPES, WRITE_SCOPES, APP_VERSION, runtimeExtensionId } from "@/config";
import { accountBadgeText } from "@/types/account";
import { toUserError } from "@/utils/errors";
import type { DefaultInbox, RefreshMinutes, ThemePreference } from "@/types/settings";

export function SettingsPage() {
  const settings = useSettingsStore();
  const accounts = useAccountStore((state) => state.accounts);
  const setAccounts = useAccountStore((state) => state.setAccounts);
  const upsertAccount = useAccountStore((state) => state.upsertAccount);
  const removeAccount = useAccountStore((state) => state.removeAccount);
  const setConnectOpen = useUiStore((state) => state.setConnectOpen);
  const askConfirm = useUiStore((state) => state.askConfirm);
  const push = useToastStore((state) => state.push);

  useEffect(() => {
    void warmUpPkce();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Preferences stay on this browser. Unified Gmail {APP_VERSION}.
        </p>
      </div>

      <Section title="Account management">
        {accounts.length === 0 ? (
          <p className="text-sm text-ink-soft">No Gmail accounts are connected.</p>
        ) : (
          <ul className="divide-y divide-line">
            {accounts.map((account) => (
              <li key={account.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {accountBadgeText(account)} · {account.email}
                  </p>
                  <p className="text-xs text-muted">
                    {account.status === "needs_reauth"
                      ? "Needs to be signed in again"
                      : "Connected with Google"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      void requestReauthGoogle(
                        account.id,
                        settings.googleClientId,
                        account.email,
                      )
                        .then((next) => {
                          void upsertAccount(next);
                          push({
                            title: "Account reconnected",
                            description: next.email,
                            tone: "success",
                          });
                        })
                        .catch((error) => {
                          push({
                            title: "Could not reconnect",
                            description: toUserError(error),
                            tone: "danger",
                          });
                        });
                    }}
                  >
                    Reconnect
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      askConfirm({
                        title: `Disconnect ${account.email}?`,
                        description:
                          "This only signs the account out of Unified Gmail. Mail stays in Google.",
                        actionLabel: "Disconnect",
                        tone: "danger",
                        onConfirm: async () => {
                          try {
                            await requestDisconnectGoogle(account.id);
                            await removeAccount(account.id);
                            push({ title: "Account disconnected", tone: "success" });
                          } catch (error) {
                            push({
                              title: "Could not disconnect",
                              description: toUserError(error),
                              tone: "danger",
                            });
                          }
                        },
                      })
                    }
                  >
                    Disconnect
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Button className="mt-3" onClick={() => setConnectOpen(true)}>
          Add account
        </Button>
      </Section>

      <Section title="Appearance">
        <label className="block text-xs font-medium text-muted">
          Theme
          <div className="mt-2">
            <SegmentedControl<ThemePreference>
              ariaLabel="Theme"
              value={settings.theme}
              onChange={(theme) => void settings.update({ theme })}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
            />
          </div>
        </label>
      </Section>

      <Section title="General">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-muted">
            Default account
            <select
              value={settings.defaultAccountId ?? ""}
              onChange={(event) =>
                void settings.update({
                  defaultAccountId: event.target.value || null,
                })
              }
              className="mt-1 h-9 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
            >
              <option value="">None</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.email}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-muted">
            Default inbox
            <select
              value={settings.defaultInbox}
              onChange={(event) =>
                void settings.update({
                  defaultInbox: event.target.value as DefaultInbox,
                })
              }
              className="mt-1 h-9 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
            >
              <option value="inbox">Inbox</option>
              <option value="starred">Starred</option>
              <option value="unread">Unread</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(event) =>
                void settings.update({
                  notificationsEnabled: event.target.checked,
                })
              }
            />
            Unread notifications
          </label>
          <label className="text-xs font-medium text-muted">
            Refresh interval
            <select
              value={settings.refreshMinutes}
              onChange={(event) =>
                void settings.update({
                  refreshMinutes: Number(event.target.value) as RefreshMinutes,
                })
              }
              className="mt-1 h-9 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
            >
              <option value={5}>Every 5 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 60 minutes</option>
            </select>
          </label>
        </div>
      </Section>

      <Section title="Google API">
        <p className="text-sm leading-6 text-ink-soft">
          Paste the OAuth 2.0 Client ID from Google Cloud Console. This value is
          public by design. Never paste a client secret into the extension.
        </p>
        <label className="mt-3 block text-xs font-medium text-muted">
          OAuth client ID
          <input
            value={settings.googleClientId}
            onChange={(event) =>
              void settings.update({ googleClientId: event.target.value.trim() })
            }
            placeholder="Chrome extension Client ID"
            className="mt-1 h-9 w-full rounded-lg border border-line bg-canvas px-3 font-mono text-xs text-ink"
          />
        </label>
        <p className="mt-3 text-xs leading-5 text-muted">
          Use a <span className="text-ink">Chrome extension</span> OAuth client with
          Item ID{" "}
          <span className="font-mono text-ink">{runtimeExtensionId()}</span>.
          Web application clients need a secret this extension will not store.
          Redirect:{" "}
          <span className="font-mono text-ink">{oauthRedirectUrl()}</span>
        </p>
      </Section>

      <Section title="Privacy">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-ink-soft">
          <li>
            Data accessed: Gmail message metadata and bodies you open, Drive file
            names and types you browse, photo thumbnails when Google provides them,
            plus storage quota via Drive <code>about.get</code>. Files you add here
            are uploaded to that Google account&apos;s Drive. Existing file contents
            are opened in Google Drive, not stored here. Google Photos library items
            that are not in Drive cannot be listed by third-party apps.
          </li>
          <li>
            Stored locally: connected account profiles, settings, and short-lived
            OAuth tokens. Tokens are never shown in the UI or written to logs.
          </li>
          <li>
            Sent to a backend: nothing. Requests go from this extension to Google
            APIs only.
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          Requested on connect: {AUTH_SCOPES.join(", ")}. Send later:{" "}
          {WRITE_SCOPES.join(", ")}.
        </p>
      </Section>

      <Section title="Security">
        <p className="text-sm text-ink-soft">
          OAuth status: {settings.googleClientId ? "Client ID saved locally" : "Not configured"}.
          Connected accounts: {accounts.length}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              askConfirm({
                title: "Clear local cached data?",
                description:
                  "This removes settings, account list, and any cached tokens from this browser. Google accounts themselves are unchanged.",
                actionLabel: "Clear data",
                tone: "danger",
                onConfirm: async () => {
                  await tokenStore.clearAll();
                  await storageClearAppData();
                  await setAccounts([]);
                  await settings.hydrate();
                  push({ title: "Local data cleared", tone: "success" });
                },
              })
            }
          >
            Clear local cached data
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              askConfirm({
                title: "Sign out of all accounts?",
                description:
                  "Unified Gmail will forget connected accounts on this device. Sign-in with Google is required to use mail again.",
                actionLabel: "Sign out",
                tone: "danger",
                onConfirm: async () => {
                  for (const account of [...accounts]) {
                    await requestDisconnectGoogle(account.id).catch(() => undefined);
                    await removeAccount(account.id);
                  }
                  await tokenStore.clearAll();
                  push({ title: "Signed out", tone: "success" });
                },
              })
            }
          >
            Sign out
          </Button>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold tracking-wide uppercase">{title}</h2>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}
