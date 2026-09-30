import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Mail, Paperclip } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { gmailService } from "@/services/gmailService";
import { sanitizeGmailHtml } from "@/services/gmailParse";
import { useAccountStore } from "@/store/accounts";
import { LABEL_COLORS, accountBadgeText } from "@/types/account";
import type { MessageDetail } from "@/types/message";
import { formatMessageDate } from "@/utils/format";
import { toUserError } from "@/utils/errors";

export function MessageViewerPage() {
  const { accountId, messageId } = useParams();
  const account = useAccountStore((state) =>
    state.accounts.find((item) => item.id === accountId),
  );
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountId || !messageId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMessage(null);
    void gmailService
      .getMessage(accountId, messageId)
      .then((detail) => {
        if (!cancelled) setMessage(detail);
      })
      .catch((cause) => {
        if (!cancelled) setError(toUserError(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, messageId]);

  if (!accountId || !messageId) {
    return (
      <EmptyState
        icon={<Mail className="size-5" />}
        title="No message selected"
        description="Open a message from the inbox or search results to read it here."
      />
    );
  }

  const gmailUrl = account
    ? `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(account.email)}#all/${messageId}`
    : `https://mail.google.com/mail/#all/${messageId}`;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center gap-2">
        {account ? (
          <Badge color={LABEL_COLORS[account.label]}>
            {accountBadgeText(account)}
          </Badge>
        ) : (
          <Badge className="bg-accent-soft text-accent">Unknown account</Badge>
        )}
        <span className="text-xs text-muted">{account?.email}</span>
        <Button
          variant="secondary"
          size="sm"
          className="ml-auto"
          onClick={() => window.open(gmailUrl, "_blank", "noreferrer")}
        >
          Open in Gmail
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <EmptyState
          icon={<Mail className="size-5" />}
          title="Could not open this message"
          description={error}
        />
      ) : message ? (
        <article className="rounded-2xl border border-line bg-surface p-5">
          <h1 className="text-xl font-semibold tracking-tight">{message.subject}</h1>
          <p className="mt-2 text-sm text-ink">
            {message.fromName}
            {message.fromEmail ? (
              <span className="text-muted"> &lt;{message.fromEmail}&gt;</span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-muted">
            {formatMessageDate(message.internalDate)}
            {message.to.length ? ` · To ${message.to.join(", ")}` : ""}
          </p>
          {message.attachments.length > 0 ? (
            <ul className="mt-4 space-y-1">
              {message.attachments.map((file) => (
                <li key={file.attachmentId} className="flex items-center gap-2 text-xs text-ink-soft">
                  <Paperclip className="size-3.5" />
                  {file.filename}
                </li>
              ))}
            </ul>
          ) : null}
          {message.bodyHtml ? (
            <div
              className="prose-gmail mt-5 max-w-none text-sm leading-6 text-ink [&_a]:text-accent [&_img]:max-w-full"
              dangerouslySetInnerHTML={{ __html: sanitizeGmailHtml(message.bodyHtml) }}
            />
          ) : (
            <pre className="mt-5 whitespace-pre-wrap font-sans text-sm leading-6 text-ink">
              {message.bodyText || message.snippet}
            </pre>
          )}
        </article>
      ) : null}
    </div>
  );
}
