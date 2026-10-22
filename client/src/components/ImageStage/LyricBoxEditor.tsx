import { useRef, useState, useCallback } from 'react'

import { cn } from '@/utils/cn'
import type { LyricBox } from '@/types'

interface LyricBoxEditorProps {
  box: LyricBox
  onChange: (box: LyricBox) => void
  /** Fade the outline out while playing so it doesn't distract */
  isPlaying: boolean
  /** Show a hint label when no lyric is on screen */
  showHint: boolean
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se'

interface DragState {
  mode: DragMode
  startX: number
  startY: number
  startBox: LyricBox
}

/** Smallest box, as a fraction of the frame */
const MIN_SIZE = 0.1

/** Distance from centre (fraction of the frame) at which the box snaps to it */
const SNAP_DISTANCE = 0.015

const CORNERS: { mode: Exclude<DragMode, 'move'>; className: string }[] = [
  { mode: 'nw', className: '-top-1.5 -left-1.5 cursor-nwse-resize' },
  { mode: 'ne', className: '-top-1.5 -right-1.5 cursor-nesw-resize' },
  { mode: 'sw', className: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
  { mode: 'se', className: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Apply a drag delta (fractions of the frame) to the box for the given mode
 */
function dragBox(mode: DragMode, start: LyricBox, dx: number, dy: number): LyricBox {
  if (mode === 'move') {
    return {
      ...start,
      x: clamp(start.x + dx, 0, 1 - start.width),
      y: clamp(start.y + dy, 0, 1 - start.height),
    }
  }

  const right = start.x + start.width
  const bottom = start.y + start.height
  const next = { ...start }

  if (mode === 'nw' || mode === 'sw') {
    next.x = clamp(start.x + dx, 0, right - MIN_SIZE)
    next.width = right - next.x
  } else {
    next.width = clamp(start.width + dx, MIN_SIZE, 1 - start.x)
  }

  if (mode === 'nw' || mode === 'ne') {
    next.y = clamp(start.y + dy, 0, bottom - MIN_SIZE)
    next.height = bottom - next.y
  } else {
    next.height = clamp(start.height + dy, MIN_SIZE, 1 - start.y)
  }

  return next
}

/**
 * Outlined, draggable/resizable lyric area drawn over the image-mode preview.
 * Must be placed in a container that exactly matches the frame's aspect ratio.
 */
export function LyricBoxEditor({ box, onChange, isPlaying, showHint }: LyricBoxEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [guides, setGuides] = useState({ vertical: false, horizontal: false })
  const [isDragging, setIsDragging] = useState(false)

  const handlePointerDown = useCallback((mode: DragMode) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, startBox: box }
    setIsDragging(true)
  }, [box])

  // Handles bubble their captured move/up events up to the box
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const rect = rootRef.current?.getBoundingClientRect()
    if (!drag || !rect) return

    const dx = (e.clientX - drag.startX) / rect.width
    const dy = (e.clientY - drag.startY) / rect.height
    const next = dragBox(drag.mode, drag.startBox, dx, dy)

    // Snap the box centre to the frame centre while moving
    let vertical = false
    let horizontal = false
    if (drag.mode === 'move') {
      if (Math.abs(next.x + next.width / 2 - 0.5) < SNAP_DISTANCE) {
        next.x = 0.5 - next.width / 2
        vertical = true
      }
      if (Math.abs(next.y + next.height / 2 - 0.5) < SNAP_DISTANCE) {
        next.y = 0.5 - next.height / 2
        horizontal = true
      }
    }

    setGuides({ vertical, horizontal })
    onChange(next)
  }, [onChange])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    setIsDragging(false)
    setGuides({ vertical: false, horizontal: false })
  }, [])

  return (
    <div ref={rootRef} className="absolute inset-0 pointer-events-none">
      {guides.vertical && (
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-primary/80" />
      )}
      {guides.horizontal && (
        <div className="absolute left-0 right-0 top-1/2 h-px bg-primary/80" />
      )}

      <div
        className={cn(
          'absolute pointer-events-auto cursor-move touch-none border-2 border-dashed rounded-sm transition-opacity',
          isDragging ? 'border-primary' : 'border-white/40 hover:border-primary',
          isPlaying && !isDragging && 'opacity-0 hover:opacity-100'
        )}
        style={{
          left: `${box.x * 100}%`,
          top: `${box.y * 100}%`,
          width: `${box.width * 100}%`,
          height: `${box.height * 100}%`,
        }}
        title="Drag to move the lyrics, drag corners to resize"
        onPointerDown={handlePointerDown('move')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {showHint && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-white/60 select-none">
            Lyrics appear here
          </div>
        )}

        {CORNERS.map(({ mode, className }) => (
          <div
            key={mode}
            className={cn('absolute w-3 h-3 bg-primary rounded-sm', className)}
            onPointerDown={handlePointerDown(mode)}
          />
        ))}
      </div>
    </div>
  )
}
