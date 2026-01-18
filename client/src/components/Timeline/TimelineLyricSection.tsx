import { useRef, useCallback, useState } from 'react'
import { cn } from '@/utils'
import type { LyricSection } from '@/types'

interface TimelineLyricSectionProps {
  section: LyricSection
  isSelected: boolean
  pixelsPerSecond: number
  duration: number
  onSelect: (id: string) => void
  onUpdate: (id: string, updates: Partial<LyricSection>) => void
}

type DragType = 'left' | 'right' | null

const HANDLE_WIDTH = 10 // pixels

export function TimelineLyricSection({
  section,
  isSelected,
  pixelsPerSecond,
  duration,
  onSelect,
  onUpdate,
}: TimelineLyricSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [dragType, setDragType] = useState<DragType>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // Calculate position and width
  const left = section.startTime * pixelsPerSecond
  const width = Math.max((section.endTime - section.startTime) * pixelsPerSecond, 40)
  
  // Handle mouse down on resize handles
  const handleMouseDown = useCallback((e: React.MouseEvent, type: DragType) => {
    if (!isSelected) {
      onSelect(section.id)
      return
    }
    
    e.stopPropagation()
    e.preventDefault()
    
    setDragType(type)
    setIsDragging(true)
    
    const startX = e.clientX
    const startStartTime = section.startTime
    const startEndTime = section.endTime
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaTime = deltaX / pixelsPerSecond
      
      if (type === 'left') {
        // Adjust start time - minimum 0, can't go past end
        const newStartTime = Math.max(0, Math.min(startStartTime + deltaTime, startEndTime - 1))
        onUpdate(section.id, { startTime: newStartTime })
      } else if (type === 'right') {
        // Adjust end time - can't go before start, can't exceed video duration
        const newEndTime = Math.max(startStartTime + 1, Math.min(startEndTime + deltaTime, duration))
        onUpdate(section.id, { endTime: newEndTime })
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
  }, [isSelected, section, pixelsPerSecond, onSelect, onUpdate])
  
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
            'absolute left-0 top-0 bottom-0 cursor-ew-resize',
            'bg-emerald-500/50 hover:bg-emerald-500/80 rounded-l transition-colors',
            dragType === 'left' && 'bg-emerald-500'
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
            'bg-emerald-500/50 hover:bg-emerald-500/80 rounded-r transition-colors',
            dragType === 'right' && 'bg-emerald-500'
          )}
          style={{ width: HANDLE_WIDTH }}
          onMouseDown={(e) => handleMouseDown(e, 'right')}
        />
      )}
    </div>
  )
}
