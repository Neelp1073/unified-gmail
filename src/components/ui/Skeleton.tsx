import { cn } from "@/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-line/80 dark:bg-line",
        className,
      )}
    />
  );
}

export function MessageListSkeleton() {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
