import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { KNOWN_EXTENSION_CLIENT_ID } from "@/config";

export function ConnectAccountDialog({
  onClose,
  onConnect,
}: {
  initialClientId?: string;
  onClose: () => void;
  onConnect: (clientId: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-title"
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]"
      >
        <h2 id="connect-title" className="text-lg font-semibold tracking-tight">
          Connect a Gmail account
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Unified Gmail uses Google&apos;s official sign-in. You will never be
          asked for a Google password. Each account stays separate — this app
          only creates a shared inbox layer.
        </p>
        <p className="mt-4 rounded-xl bg-canvas-muted px-3 py-2 text-sm leading-6 text-ink-soft">
          Click Continue with Google, pick{" "}
          <span className="text-ink">neelp0300@gmail.com</span> or{" "}
          <span className="text-ink">neelp0300work@gmail.com</span>, then Allow.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onConnect(KNOWN_EXTENSION_CLIENT_ID).finally(() => setBusy(false));
            }}
          >
            {busy ? "Opening Google…" : "Continue with Google"}
          </Button>
        </div>
      </div>
    </div>
  );
}
