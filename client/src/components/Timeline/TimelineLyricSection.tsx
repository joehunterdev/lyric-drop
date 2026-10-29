import { useRef, useCallback, useState } from 'react'
import { cn } from '@/utils'
import type { LyricSection } from '@/types'

interface TimelineLyricSectionProps {
  section: LyricSection
  isSelected: boolean
  pixelsPerSecond: number
  minTime: number  // Can't resize left edge before this (end of previous section or 0)
  maxTime: number  // Can't resize right edge past this (start of next section or duration)
  onSelect: (id: string) => void
  onUpdate: (id: string, updates: Partial<LyricSection>) => void
}

type DragType = 'left' | 'right' | null

interface DragState {
  type: 'left' | 'right'
  startX: number
  startStartTime: number
  startEndTime: number
}

const HANDLE_WIDTH = 12 // pixels - wide enough for a finger

export function TimelineLyricSection({
  section,
  isSelected,
  pixelsPerSecond,
  minTime,
  maxTime,
  onSelect,
  onUpdate,
}: TimelineLyricSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [dragType, setDragType] = useState<DragType>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // Calculate position and width
  const left = section.startTime * pixelsPerSecond
  const width = Math.max((section.endTime - section.startTime) * pixelsPerSecond, 40)
  
  // Pointer events (not mouse events) so resizing works with mouse, touch and pen.
  // The handle captures the pointer, so the drag keeps tracking outside it.
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, type: 'left' | 'right') => {
    if (e.button !== 0) return
    if (!isSelected) {
      onSelect(section.id)
      return
    }
    
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    
    dragRef.current = {
      type,
      startX: e.clientX,
      startStartTime: section.startTime,
      startEndTime: section.endTime,
    }
    setDragType(type)
    setIsDragging(true)
  }, [isSelected, section.id, section.startTime, section.endTime, onSelect])
  
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    
    const deltaTime = (e.clientX - drag.startX) / pixelsPerSecond
    
    if (drag.type === 'left') {
      // Adjust start time - can't go before minTime, can't go past end - 1
      const newStartTime = Math.max(minTime, Math.min(drag.startStartTime + deltaTime, drag.startEndTime - 1))
      onUpdate(section.id, { startTime: newStartTime })
    } else {
      // Adjust end time - can't go before start + 1, can't exceed maxTime
      const newEndTime = Math.max(drag.startStartTime + 1, Math.min(drag.startEndTime + deltaTime, maxTime))
      onUpdate(section.id, { endTime: newEndTime })
    }
  }, [pixelsPerSecond, minTime, maxTime, section.id, onUpdate])
  
  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    setDragType(null)
    setIsDragging(false)
  }, [])
  
  // Handle click to select
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isDragging) {
      onSelect(section.id)
    }
  }, [isDragging, section.id, onSelect])
  
  return (
    <div
      ref={sectionRef}
      className={cn(
        'absolute top-1 bottom-1 rounded-md cursor-pointer transition-colors',
        'bg-emerald-600/30 border-2 border-emerald-500/50 hover:border-emerald-400',
        isSelected && 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-timeline-bg border-emerald-400',
        isDragging && 'opacity-80'
      )}
      style={{
        left,
        width,
      }}
      onClick={handleClick}
    >
      {/* Section label */}
      <div className="px-2 py-0.5 text-xs text-emerald-200 truncate select-none h-full flex items-center">
        Lyric Section
      </div>
      
      {/* Left Resize Handle - only show when selected */}
      {isSelected && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 cursor-ew-resize touch-none',
            'bg-emerald-500/50 hover:bg-emerald-500/80 rounded-l transition-colors',
            dragType === 'left' && 'bg-emerald-500'
          )}
          style={{ width: HANDLE_WIDTH }}
          onPointerDown={(e) => handlePointerDown(e, 'left')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      )}
      
      {/* Right Resize Handle - only show when selected */}
      {isSelected && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 cursor-ew-resize touch-none',
            'bg-emerald-500/50 hover:bg-emerald-500/80 rounded-r transition-colors',
            dragType === 'right' && 'bg-emerald-500'
          )}
          style={{ width: HANDLE_WIDTH }}
          onPointerDown={(e) => handlePointerDown(e, 'right')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      )}
    </div>
  )
}
