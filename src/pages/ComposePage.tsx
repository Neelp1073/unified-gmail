import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAccountStore } from "@/store/accounts";
import { useSettingsStore } from "@/store/settings";
import { useToastStore } from "@/store/toasts";
import { accountBadgeText } from "@/types/account";
import { gmailService } from "@/services/gmailService";
import { toUserError } from "@/utils/errors";

export function ComposePage() {
  const accounts = useAccountStore((state) => state.accounts);
  const defaultAccountId = useSettingsStore((state) => state.defaultAccountId);
  const [accountId, setAccountId] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const push = useToastStore((state) => state.push);
  const resolvedAccountId = accountId || defaultAccountId || accounts[0]?.id || "";
  const selected = accounts.find((account) => account.id === resolvedAccountId);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!resolvedAccountId) {
      push({
        title: "Choose a sending account",
        description: "Connect a Gmail account before sending.",
        tone: "danger",
      });
      return;
    }
    setSending(true);
    try {
      await gmailService.sendMessage(resolvedAccountId, { to, subject, body });
      push({ title: "Message sent", tone: "success" });
      setTo("");
      setSubject("");
      setBody("");
    } catch (error) {
      push({
        title: "Could not send",
        description: toUserError(error),
        tone: "danger",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Compose</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Mail is sent through the Gmail API of the account you select. It is not
        forwarded through a Unified Gmail server.
      </p>

      <Card className="mt-5">
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Mail className="size-4" />
            Sending as{" "}
            <span className="font-medium text-ink">
              {selected
                ? `${accountBadgeText(selected)} · ${selected.email}`
                : "no account selected"}
            </span>
          </div>
        </CardHeader>
        <CardBody>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-xs font-medium text-muted">
              From
              <select
                value={resolvedAccountId}
                onChange={(event) => setAccountId(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
              >
                {accounts.length === 0 ? (
                  <option value="">Connect a Gmail account first</option>
                ) : (
                  accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {accountBadgeText(account)} · {account.email}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="block text-xs font-medium text-muted">
              To
              <input
                required
                type="email"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-muted">
              Subject
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-muted">
              Message
              <textarea
                required
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={10}
                className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm"
              />
            </label>
            <div className="flex justify-end">
              <Button type="submit" disabled={sending || accounts.length === 0}>
                {sending ? "Sending…" : "Send"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
