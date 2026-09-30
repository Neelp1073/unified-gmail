import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-line bg-surface-2 text-ink-soft">
          {icon}
        </div>
      ) : null}
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-soft">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
