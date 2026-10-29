import { useId, useState } from "react"

import { cn } from "@/utils/cn"

interface ColorFieldProps {
  label: string
  /** "#rrggbb" */
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

const HEX_PATTERN = /^#[0-9a-f]{6}$/i

/**
 * Colour swatch (native picker) with an editable hex value
 */
function ColorField({ label, value, onChange, disabled, className }: ColorFieldProps) {
  const id = useId()
  // Hex text being typed; null while it mirrors the value
  const [draft, setDraft] = useState<string | null>(null)

  const commitDraft = () => {
    if (draft !== null && HEX_PATTERN.test(draft)) onChange(draft.toLowerCase())
    setDraft(null)
  }

  return (
    <div className={cn("grid grid-cols-[5rem_1fr] items-center gap-3", className)}>
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          className="h-8 w-10 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <input
          type="text"
          value={draft ?? value}
          disabled={disabled}
          maxLength={7}
          spellCheck={false}
          aria-label={`${label} hex`}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={e => e.key === 'Enter' && commitDraft()}
          className="h-8 w-24 rounded-md border border-input bg-transparent px-2 font-mono text-xs uppercase focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
      </div>
    </div>
  )
}

export { ColorField }
