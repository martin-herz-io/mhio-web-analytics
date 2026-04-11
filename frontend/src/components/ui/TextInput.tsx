import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function TextInput({ label, className, id, ...props }: TextInputProps) {
  return (
    <label className="flex flex-col gap-2">
      {label ? <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span> : null}
      <input
        id={id}
        className={cn(
          "h-12 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-100 placeholder:text-zinc-500",
          "outline-none transition-colors focus:border-zinc-600 focus:ring-2 focus:ring-zinc-500/20",
          className,
        )}
        {...props}
      />
    </label>
  );
}
