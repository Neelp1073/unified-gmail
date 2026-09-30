import { useToastStore } from "@/store/toasts";
import { cn } from "@/utils/cn";

export function ToastViewport() {
  const { toasts, dismiss } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismiss(toast.id)}
          className={cn(
            "pointer-events-auto rounded-xl border px-4 py-3 text-left shadow-[var(--shadow)]",
            "border-line bg-surface",
            toast.tone === "danger" && "border-danger/30",
            toast.tone === "success" && "border-ok/30",
          )}
        >
          <p className="text-sm font-medium">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-xs leading-5 text-ink-soft">{toast.description}</p>
          ) : null}
        </button>
      ))}
    </div>
  );
}
