import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "subtle";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  leftIcon?: ReactNode;
}

export function Button({
  className,
  variant = "primary",
  leftIcon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
        variant === "subtle" && "border border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
        className,
      )}
      {...props}
    >
      {leftIcon ? <span className="text-zinc-500">{leftIcon}</span> : null}
      {children}
    </button>
  );
}
