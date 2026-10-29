import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Layers, Maximize2, Pause, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatTime } from '@/utils'
import type { LyricSegment, LyricSection } from '@/types'
import { SegmentType } from '@/types/enums'

interface LyricStripProps {
  segments: LyricSegment[]
  lyricSections: LyricSection[]
  selectedSegmentId: string | null
  selectedSectionId: string | null
  videoDuration: number
  onSelectSegment: (id: string | null) => void
  onUpdateSegment: (id: string, updates: Partial<LyricSegment>) => void
  onRemoveSegment: (id: string) => void
  onImportLyrics: (text: string, duration: number, startTime?: number, endTime?: number) => void
  onAppendLyrics: (text: string, sectionStart: number, sectionEnd: number, existingSegmentIds: string[]) => void
  onAddLyricSection: (startTime?: number, endTime?: number) => void
  onSeek: (time: number) => void
  /** Opens the full lyric editor (sections, paste, spaces) */
  onOpenFull: () => void
  className?: string
}

/**
 * Compact inline lyric editor for mobile, shown under the timeline: a sideways row of
 * line chips, an editor for the selected line, and a box to type new lines by hand.
 * The full sectioned editor stays available through the expand button.
 */
export function LyricStrip({
  segments,
  lyricSections,
  selectedSegmentId,
  selectedSectionId,
  videoDuration,
  onSelectSegment,
  onUpdateSegment,
  onRemoveSegment,
  onImportLyrics,
  onAppendLyrics,
  onAddLyricSection,
  onSeek,
  onOpenFull,
  className,
}: LyricStripProps) {
  const [newLine, setNewLine] = useState('')
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const selectedIndex = segments.findIndex(seg => seg.id === selectedSegmentId)
  const selected = selectedIndex >= 0 ? segments[selectedIndex] : null
  const lineCount = segments.filter(seg => seg.type === SegmentType.LYRIC).length

  // New lines go to the selected section, else the one holding the selected line, else the last
  const targetSection = useMemo(() => {
    const byId = lyricSections.find(section => section.id === selectedSectionId)
    if (byId) return byId
    if (selected) {
      const holding = lyricSections.find(
        section => selected.startTime >= section.startTime && selected.endTime <= section.endTime
      )
      if (holding) return holding
    }
    return lyricSections[lyricSections.length - 1]
  }, [lyricSections, selectedSectionId, selected])

  // Keep the selected chip in view when it changes from elsewhere (timeline, arrows)
  useEffect(() => {
    if (!selectedSegmentId) return
    chipRefs.current.get(selectedSegmentId)?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: 'smooth',
    })
  }, [selectedSegmentId])

  const selectSegment = (segment: LyricSegment) => {
    onSelectSegment(segment.id)
    onSeek(segment.startTime)
  }

  const step = (delta: number) => {
    const next = segments[(selectedIndex < 0 ? (delta > 0 ? -1 : segments.length) : selectedIndex) + delta]
    if (next) selectSegment(next)
  }

  const addLines = () => {
    if (!newLine.trim() || !targetSection) return
    const inSection = segments.filter(
      seg => seg.startTime >= targetSection.startTime && seg.endTime <= targetSection.endTime
    )
    if (inSection.length > 0) {
      onAppendLyrics(newLine, targetSection.startTime, targetSection.endTime, inSection.map(seg => seg.id))
    } else {
      onImportLyrics(newLine, videoDuration, targetSection.startTime, targetSection.endTime)
    }
    setNewLine('')
  }

  // No section yet - lines need one to live in
  if (lyricSections.length === 0) {
    return (
      <div className={cn('rounded-lg bg-card border border-border p-3', className)}>
        <p className="mb-2 text-sm text-muted-foreground">
          Add a lyric section, then type or paste your lines.
        </p>
        <Button
          className="w-full"
          disabled={videoDuration === 0}
          onClick={() => onAddLyricSection(0, videoDuration)}
        >
          <Layers className="w-4 h-4 mr-2" />
          Add Lyric Section
        </Button>
        {videoDuration === 0 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">Upload media first to add lyrics.</p>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2 rounded-lg bg-card border border-border p-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Lyrics ({lineCount})</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onOpenFull}
          data-docked-sheet-toggle
          aria-label="Open full lyric editor"
          title="Open full lyric editor"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Horizontal line chips */}
      {segments.length > 0 && (
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
          {segments.map((segment, index) => {
            const isSpacer = segment.type === SegmentType.SPACER
            return (
              <button
                key={segment.id}
                type="button"
                ref={el => {
                  if (el) chipRefs.current.set(segment.id, el)
                  else chipRefs.current.delete(segment.id)
                }}
                onClick={() => selectSegment(segment)}
                className={cn(
                  'w-32 shrink-0 rounded-md border p-2 text-left transition-colors',
                  selectedSegmentId === segment.id
                    ? 'border-primary bg-primary/10'
                    : isSpacer
                      ? 'border-dashed border-muted-foreground/30 bg-muted/20'
                      : 'border-border bg-card/50'
                )}
              >
                <div className="text-[10px] text-muted-foreground">
                  {index + 1}. {formatTime(segment.startTime)}
                </div>
                {isSpacer ? (
                  <div className="flex items-center gap-1 text-xs italic text-muted-foreground">
                    <Pause className="w-3 h-3" /> Pause
                  </div>
                ) : (
                  <div className="line-clamp-2 text-xs">
                    {segment.text || <span className="italic text-muted-foreground">Empty</span>}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Selected line */}
      {selected && selected.type === SegmentType.LYRIC ? (
        <div className="flex items-start gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => step(-1)} aria-label="Previous line">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Textarea
            value={selected.text}
            onChange={e => onUpdateSegment(selected.id, { text: e.target.value })}
            className="min-h-[40px] flex-1 text-sm"
            placeholder="Enter lyrics..."
            rows={2}
          />
          <div className="flex shrink-0 flex-col">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => step(1)} aria-label="Next line">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onRemoveSegment(selected.id)}
              aria-label="Delete line"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        segments.length > 0 && (
          <p className="text-xs text-muted-foreground">Tap a line to edit it.</p>
        )
      )}

      {/* Add by hand */}
      <div className="flex items-end gap-2 border-t border-border pt-2">
        <Textarea
          value={newLine}
          onChange={e => setNewLine(e.target.value)}
          onKeyDown={e => {
            // Enter adds the line; paste still takes several lines at once
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              addLines()
            }
          }}
          className="min-h-[40px] flex-1 resize-none text-sm"
          placeholder="Type or paste a line..."
          rows={1}
        />
        <Button size="icon" onClick={addLines} disabled={!newLine.trim()} aria-label="Add line" title="Add line">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
