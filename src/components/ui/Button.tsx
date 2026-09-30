import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-white shadow-sm hover:bg-accent-hover dark:text-[#0c0b09]",
        secondary:
          "bg-surface-2 text-ink border border-line hover:border-line-strong",
        ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
        danger: "bg-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-3.5 text-sm",
        lg: "h-11 px-4 text-sm",
        icon: "size-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
