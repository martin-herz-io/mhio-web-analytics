import { Switch } from "@base-ui/react/switch";

import { cn } from "../../lib/cn";

interface SwitchInputProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function SwitchInput({ checked, onChange, label }: SwitchInputProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
      <Switch.Root
        checked={checked}
        onCheckedChange={onChange}
        className={cn(
          "inline-flex h-6 w-10 cursor-pointer items-center rounded-full border border-zinc-700 bg-zinc-800 p-0.5 transition-colors",
          "outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/30",
          "data-[checked]:border-zinc-200 data-[checked]:bg-zinc-200",
        )}
      >
        <Switch.Thumb
          className={cn(
            "block h-4 w-4 rounded-full bg-zinc-100 transition-transform",
            "data-[checked]:translate-x-4 data-[checked]:bg-zinc-900",
          )}
        />
      </Switch.Root>
      <span>{label}</span>
    </label>
  );
}
