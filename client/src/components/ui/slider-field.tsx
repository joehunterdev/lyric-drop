import { useId } from "react"

import { Slider } from "@/components/ui/slider"
import { cn } from "@/utils/cn"

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  /** Formats the readout, e.g. v => `${v} px` */
  format?: (value: number) => string
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
}

/**
 * Labelled slider with a value readout
 */
function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  format = v => String(v),
  onChange,
  disabled,
  className,
}: SliderFieldProps) {
  const id = useId()

  return (
    <div className={cn("grid grid-cols-[5rem_1fr_3.5rem] items-center gap-3", className)}>
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <Slider
        id={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([next]) => onChange(next)}
        aria-label={label}
      />
      <span className="text-xs font-mono text-right tabular-nums">{format(value)}</span>
    </div>
  )
}

export { SliderField }
