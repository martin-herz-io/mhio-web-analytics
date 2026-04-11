import { Select } from "@base-ui/react/select";
import { IconChevronDown, IconCheck } from "@tabler/icons-react";

import { cn } from "../../lib/cn";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
  size?: "sm" | "md";
}

export function SelectInput({
  label,
  value,
  options,
  onChange,
  className,
  triggerClassName,
  placeholder,
  size = "md",
}: SelectInputProps) {
  return (
    <label className={cn("flex flex-col gap-2", className)}>
      {label ? <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span> : null}

      <Select.Root value={value} onValueChange={(nextValue) => onChange(String(nextValue ?? ""))}>
        <Select.Trigger
          className={cn(
            "inline-flex w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100",
            "outline-none transition-colors focus-visible:border-zinc-600 focus-visible:ring-2 focus-visible:ring-zinc-500/20",
            size === "md" && "h-11",
            size === "sm" && "h-9 text-xs",
            triggerClassName,
          )}
        >
          <Select.Value>
            {(selected) => {
              if (selected == null || String(selected).length === 0) {
                return <span className="text-zinc-500">{placeholder || "Select..."}</span>;
              }

              const selectedOption = options.find((option) => option.value === String(selected));
              return selectedOption?.label || String(selected);
            }}
          </Select.Value>
          <Select.Icon className="text-zinc-500">
            <IconChevronDown size={14} />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Positioner sideOffset={8} className="z-50">
            <Select.Popup className="min-w-[220px] rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-xl shadow-black/40">
              <Select.List>
                {options.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-200",
                      "outline-none transition-colors data-[highlighted]:bg-zinc-800 data-[highlighted]:text-zinc-100",
                    )}
                  >
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator className="text-zinc-300">
                      <IconCheck size={14} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </label>
  );
}
