import { useRef } from 'react'

import { cn } from '@/utils/cn'
import { formatTime } from '@/utils'

interface TimelineTrimHandleProps {
  edge: 'start' | 'end'
  /** Current position, in seconds */
  time: number
  pixelsPerSecond: number
  /** Allowed range for this handle, in seconds */
  min: number
  max: number
  /** Converts a pointer x position to a time on the timeline */
  clientXToTime: (clientX: number) => number
  onChange: (time: number) => void
}

/**
 * Draggable export-range handle on the timeline ruler. The grab area is wider than the
 * bar and extends into the kept range, so it stays reachable at the very ends of the track.
 */
export function TimelineTrimHandle({
  edge,
  time,
  pixelsPerSecond,
  min,
  max,
  clientXToTime,
  onChange,
}: TimelineTrimHandleProps) {
  const draggingRef = useRef(false)
  const isStart = edge === 'start'

  const release = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <div
      role="slider"
      aria-label={isStart ? 'Export start' : 'Export end'}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={time}
      aria-valuetext={formatTime(time)}
      title={`${isStart ? 'Export starts' : 'Export ends'} at ${formatTime(time)} - drag to trim`}
      className={cn(
        'absolute top-0 z-20 flex h-6 w-6 cursor-ew-resize touch-none select-none',
        isStart ? 'justify-start' : '-translate-x-full justify-end'
      )}
      style={{ left: time * pixelsPerSecond }}
      onPointerDown={e => {
        if (e.button !== 0) return
        // Don't start a ruler scrub or a track click
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        draggingRef.current = true
      }}
      onPointerMove={e => {
        if (!draggingRef.current) return
        onChange(Math.max(min, Math.min(max, clientXToTime(e.clientX))))
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onClick={e => e.stopPropagation()}
    >
      <div className={cn('h-full w-1.5 bg-amber-400', isStart ? 'rounded-l-sm' : 'rounded-r-sm')} />
    </div>
  )
}
