import { useRef, useCallback, useState } from 'react'
import { cn } from '@/utils'
import type { LyricSegment } from '@/types'
import { SegmentType } from '@/types/enums'

interface TimelineSegmentProps {
  segment: LyricSegment
  isSelected: boolean
  pixelsPerSecond: number
  duration: number
  minTime: number  // Section start (can't resize left edge before this)
  maxTime: number  // Section end (can't resize right edge past this)
  onSelect: (id: string) => void
  onUpdate: (id: string, updates: Partial<LyricSegment>) => void
}

type DragType = 'left' | 'right' | null

const HANDLE_WIDTH = 8 // pixels
const SEGMENT_GAP = 3 // pixels gap between segments

export function TimelineSegment({
  segment,
  isSelected,
  pixelsPerSecond,
  duration,
  minTime,
  maxTime,
  onSelect,
  onUpdate,
}: TimelineSegmentProps) {
  const segmentRef = useRef<HTMLDivElement>(null)
  const [dragType, setDragType] = useState<DragType>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // Calculate position and width
  const left = segment.startTime * pixelsPerSecond
  const width = Math.max((segment.endTime - segment.startTime) * pixelsPerSecond, 20)
  
  // Handle mouse down on resize handles
  const handleMouseDown = useCallback((e: React.MouseEvent, type: DragType) => {
    if (!isSelected) {
      onSelect(segment.id)
      return
    }
    
    e.stopPropagation()
    e.preventDefault()
    
    setDragType(type)
    setIsDragging(true)
    
    const startX = e.clientX
    const startStartTime = segment.startTime
    const startEndTime = segment.endTime
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaTime = deltaX / pixelsPerSecond
      
      if (type === 'left') {
        // Adjust start time - clamp to section bounds
        const newStartTime = Math.max(minTime, Math.min(startStartTime + deltaTime, startEndTime - 0.1))
        onUpdate(segment.id, { startTime: newStartTime })
      } else if (type === 'right') {
        // Adjust end time - clamp to section bounds
        const newEndTime = Math.max(startStartTime + 0.1, Math.min(startEndTime + deltaTime, maxTime))
        onUpdate(segment.id, { endTime: newEndTime })
      }
    }
    
    const handleMouseUp = () => {
      setDragType(null)
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [isSelected, segment, pixelsPerSecond, duration, onSelect, onUpdate])
  
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
        'border-r border-r-black/40', // Right border creates visual separation between segments
        isSpacer 
          ? 'bg-muted/50 border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50'
          : 'bg-timeline-segment hover:brightness-110',
        isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-timeline-bg',
        isDragging && 'opacity-80'
      )}
      style={{
        left: left + SEGMENT_GAP / 2,
        width: Math.max(width - SEGMENT_GAP, 16),
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
            'absolute left-0 top-0 bottom-0 cursor-ew-resize',
            'bg-primary/50 hover:bg-primary/80 rounded-l transition-colors',
            dragType === 'left' && 'bg-primary'
          )}
          style={{ width: HANDLE_WIDTH }}
          onMouseDown={(e) => handleMouseDown(e, 'left')}
        />
      )}
      
      {/* Right Resize Handle - only show when selected */}
      {isSelected && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 cursor-ew-resize',
            'bg-primary/50 hover:bg-primary/80 rounded-r transition-colors',
            dragType === 'right' && 'bg-primary'
          )}
          style={{ width: HANDLE_WIDTH }}
          onMouseDown={(e) => handleMouseDown(e, 'right')}
        />
      )}
    </div>
  )
}
