import { useRef, useCallback, useState } from 'react'
import { cn } from '@/utils'
import type { LyricSegment } from '@/types'
import { SegmentType } from '@/types/enums'

interface TimelineSegmentProps {
  segment: LyricSegment
  isSelected: boolean
  pixelsPerSecond: number
  duration: number
  minTime?: number
  maxTime?: number
  onSelect: (id: string) => void
  onUpdate: (id: string, updates: Partial<LyricSegment>) => void
}

type DragType = 'left' | 'right' | null

interface DragState {
  type: 'left' | 'right'
  startX: number
  startStartTime: number
  startEndTime: number
  lowerBound: number
  upperBound: number
}

const HANDLE_WIDTH = 12 // pixels - wide enough for a finger
const SEGMENT_MARGIN = 2 // pixels between segments

export function TimelineSegment({
  segment,
  isSelected,
  pixelsPerSecond,
  duration,
  minTime = 0,
  maxTime,
  onSelect,
  onUpdate,
}: TimelineSegmentProps) {
  const segmentRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [dragType, setDragType] = useState<DragType>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // Calculate position and width
  const left = segment.startTime * pixelsPerSecond
  const width = Math.max((segment.endTime - segment.startTime) * pixelsPerSecond, 20)
  
  // Pointer events (not mouse events) so resizing works with mouse, touch and pen.
  // The handle captures the pointer, so the drag keeps tracking outside it.
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, type: 'left' | 'right') => {
    if (e.button !== 0) return
    if (!isSelected) {
      onSelect(segment.id)
      return
    }
    
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    
    dragRef.current = {
      type,
      startX: e.clientX,
      startStartTime: segment.startTime,
      startEndTime: segment.endTime,
      lowerBound: minTime,
      upperBound: maxTime ?? duration,
    }
    setDragType(type)
    setIsDragging(true)
  }, [isSelected, segment.id, segment.startTime, segment.endTime, duration, minTime, maxTime, onSelect])
  
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    
    const deltaTime = (e.clientX - drag.startX) / pixelsPerSecond
    
    if (drag.type === 'left') {
      // Adjust start time
      const newStartTime = Math.max(drag.lowerBound, Math.min(drag.startStartTime + deltaTime, drag.startEndTime - 0.1))
      onUpdate(segment.id, { startTime: newStartTime })
    } else {
      // Adjust end time
      const newEndTime = Math.max(drag.startStartTime + 0.1, Math.min(drag.startEndTime + deltaTime, drag.upperBound))
      onUpdate(segment.id, { endTime: newEndTime })
    }
  }, [pixelsPerSecond, segment.id, onUpdate])
  
  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    setDragType(null)
    setIsDragging(false)
  }, [])
  
  // Handle click to select
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isDragging) {
      onSelect(segment.id)
    }
  }, [isDragging, segment.id, onSelect])
  
  const isSpacer = segment.type === SegmentType.SPACER
  
  return (
    <div
      ref={segmentRef}
      className={cn(
        'absolute top-2 bottom-2 rounded cursor-pointer transition-colors',
        isSpacer 
          ? 'bg-muted/50 border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50'
          : 'bg-timeline-segment hover:brightness-110',
        isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-timeline-bg',
        isDragging && 'opacity-80'
      )}
      style={{
        left: left + SEGMENT_MARGIN,
        width: Math.max(width - SEGMENT_MARGIN * 2, 20),
      }}
      onClick={handleClick}
    >
      {/* Segment Text - only show for lyrics */}
      {!isSpacer && (
        <div className="px-2 py-1 text-xs text-white truncate select-none h-full flex items-center">
          {segment.text}
        </div>
      )}
      
      {/* Spacer indicator */}
      {isSpacer && (
        <div className="px-2 py-1 text-xs text-muted-foreground truncate select-none h-full flex items-center justify-center">
          ⏸
        </div>
      )}
      
      {/* Left Resize Handle - only show when selected */}
      {isSelected && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 cursor-ew-resize touch-none',
            'bg-primary/50 hover:bg-primary/80 rounded-l transition-colors',
            dragType === 'left' && 'bg-primary'
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
            'bg-primary/50 hover:bg-primary/80 rounded-r transition-colors',
            dragType === 'right' && 'bg-primary'
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
