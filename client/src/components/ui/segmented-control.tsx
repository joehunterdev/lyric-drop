import type { ReactNode } from "react"

import { cn } from "@/utils/cn"

interface SegmentedOption<T extends string | number> {
  value: T
  label: ReactNode
  /** Accessible name / tooltip, required when label is an icon */
  title?: string
  disabled?: boolean
}

interface SegmentedControlProps<T extends string | number> {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  /** Accessible name for the group */
  label: string
  size?: "sm" | "md"
  className?: string
}

/**
 * Single-choice button group (radio group semantics)
 */
function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  label,
  size = "sm",
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex rounded-md bg-muted p-0.5", className)}
    >
      {options.map(option => {
        const active = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.title}
            title={option.title}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1 rounded-[5px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }
export type { SegmentedOption }
