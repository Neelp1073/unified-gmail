import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Badge({
  className,
  color,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { color?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
        className,
      )}
      style={
        color
          ? {
              background: `color-mix(in srgb, ${color} 16%, transparent)`,
              color,
            }
          : undefined
      }
      {...props}
    />
  );
}
