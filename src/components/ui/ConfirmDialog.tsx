import { useUiStore } from "@/store/ui";
import { Button } from "@/components/ui/Button";

export function ConfirmDialog() {
  const {
    confirmOpen,
    confirmTitle,
    confirmDescription,
    confirmActionLabel,
    confirmTone,
    onConfirm,
    closeConfirm,
  } = useUiStore();

  if (!confirmOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)]"
      >
        <h2 id="confirm-title" className="text-base font-semibold">
          {confirmTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{confirmDescription}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={closeConfirm}>
            Cancel
          </Button>
          <Button
            variant={confirmTone === "danger" ? "danger" : "primary"}
            onClick={() => {
              void onConfirm?.();
              closeConfirm();
            }}
          >
            {confirmActionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
