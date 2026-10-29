import { useState, useMemo } from 'react'
import { Plus, X, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOverlay } from '@/contexts'
import { BUILT_IN_PRESETS } from '@/utils'
import { cn } from '@/utils/cn'
import type { StylePreset } from '@/types'

/**
 * One-click style presets: built-ins plus the user's saved ones
 */
export function PresetBar() {
  const { style, presets, setStyle, savePreset, deletePreset } = useOverlay()
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')

  // The preset matching the current style exactly, if any
  const activeId = useMemo(() => {
    const current = JSON.stringify(style)
    return [...BUILT_IN_PRESETS, ...presets].find(p => JSON.stringify(p.style) === current)?.id ?? null
  }, [style, presets])

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    savePreset(trimmed)
    setName('')
    setNaming(false)
  }

  const renderChip = (preset: StylePreset, removable: boolean) => (
    <div key={preset.id} className="group relative">
      <button
        type="button"
        onClick={() => setStyle(preset.style)}
        className={cn(
          'h-7 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          activeId === preset.id
            ? 'border-primary bg-primary/15 text-primary'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
          removable && 'pr-6'
        )}
      >
        {preset.name}
      </button>
      {removable && (
        <button
          type="button"
          onClick={() => deletePreset(preset.id)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground opacity-60 hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
          aria-label={`Delete preset ${preset.name}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {BUILT_IN_PRESETS.map(preset => renderChip(preset, false))}
        {presets.map(preset => renderChip(preset, true))}
        {!naming && (
          <button
            type="button"
            onClick={() => setNaming(true)}
            disabled={activeId !== null}
            title={activeId !== null ? 'Change the style to save it as a new preset' : 'Save the current style'}
            className="h-7 rounded-full border border-dashed border-border px-3 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Save
          </button>
        )}
      </div>

      {naming && (
        <form
          className="flex items-center gap-1.5"
          onSubmit={e => {
            e.preventDefault()
            handleSave()
          }}
        >
          <Input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setNaming(false)}
            placeholder="Preset name"
            maxLength={30}
            className="h-8"
          />
          <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={!name.trim()} title="Save preset">
            <Check className="w-4 h-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setNaming(false)} title="Cancel">
            <X className="w-4 h-4" />
          </Button>
        </form>
      )}
    </div>
  )
}
