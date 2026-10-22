import { Gauge, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { barLength, formatTime } from '@/utils'
import type { RetimeResult } from '@/utils'

interface RetimePanelProps {
  /** Preview of what Apply would do, or null if the selection can't be a reference */
  preview: RetimeResult | null
  /** 0-100 */
  cadence: number
  bpm: string
  onCadenceChange: (cadence: number) => void
  onBpmChange: (bpm: string) => void
  onApply: () => void
  onClose: () => void
}

function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(2)}s`
}

/**
 * Controls for retiming the lines after a reference line:
 * cadence (locked to bars ↔ follows words) and an optional BPM for beat snapping
 */
export function RetimePanel({
  preview,
  cadence,
  bpm,
  onCadenceChange,
  onBpmChange,
  onApply,
  onClose,
}: RetimePanelProps) {
  const bpmValue = parseFloat(bpm)
  const hasBpm = bpmValue > 0

  const referenceLength = preview
    ? preview.reference.endTime - preview.reference.startTime
    : 0
  const referenceBars = preview && hasBpm ? referenceLength / barLength(bpmValue) : null

  return (
    <div className="px-4 py-3 border-b border-border bg-black/20 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium flex items-center gap-2">
            <Gauge className="w-4 h-4 text-primary" />
            Retime from this line
          </p>
          {preview ? (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              "{preview.reference.text}" · {formatSeconds(referenceLength)} · {preview.referenceSyllables} syllables
              {referenceBars !== null && (
                <> · ≈ {referenceBars.toFixed(2)} bars</>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Select a lyric line inside a section to use as the reference.
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} title="Close">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Cadence */}
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <span className="text-xs text-muted-foreground shrink-0">Cadence</span>
          <span className="text-xs text-muted-foreground shrink-0">Locked</span>
          <Slider
            value={[cadence]}
            min={0}
            max={100}
            step={5}
            onValueChange={([value]) => onCadenceChange(value)}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground shrink-0">Follows words</span>
          <span className="text-xs font-mono w-10 text-right shrink-0">{cadence}%</span>
        </div>

        {/* BPM */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">BPM</span>
          <Input
            type="number"
            min={40}
            max={300}
            placeholder="optional"
            value={bpm}
            onChange={e => onBpmChange(e.target.value)}
            className="w-24 h-8"
            title="Snap line lengths to whole beats"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground space-y-0.5">
          {preview && preview.retimedCount > 0 && (
            <p>
              Retimes {preview.retimedCount} line{preview.retimedCount === 1 ? '' : 's'} · section ends at{' '}
              {formatTime(preview.section.endTime)}
              {Math.abs(preview.sectionDelta) >= 0.01 && (
                <> ({preview.sectionDelta > 0 ? '+' : ''}{preview.sectionDelta.toFixed(1)}s)</>
              )}
            </p>
          )}
          {preview && preview.retimedCount === 0 && (
            <p>No lines after this one in its section.</p>
          )}
          {preview && preview.compression < 1 && (
            <p className="text-orange-400">
              Doesn't fit before the next section / end of song - lines squeezed by{' '}
              {Math.round((1 - preview.compression) * 100)}%{hasBpm && ', so they no longer land on the beat'}.
            </p>
          )}
        </div>
        <Button
          size="sm"
          onClick={onApply}
          disabled={!preview || preview.retimedCount === 0}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
