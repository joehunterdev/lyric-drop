import { useRef, useCallback, useMemo } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { TimelineSegment } from './TimelineSegment'
import { formatTime } from '@/utils'
import type { LyricSegment, TimelineState } from '@/types'

interface TimelineProps {
  segments: LyricSegment[]
  selectedSegmentId: string | null
  currentTime: number
  duration: number
  timelineState: TimelineState
  onSelectSegment: (id: string | null) => void
  onUpdateSegment: (id: string, updates: Partial<LyricSegment>) => void
  onSeek: (time: number) => void
  onZoom: (zoom: number) => void
}

export function Timeline({
  segments,
  selectedSegmentId,
  currentTime,
  duration,
  timelineState,
  onSelectSegment,
  onUpdateSegment,
  onSeek,
  onZoom,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  
  const pixelsPerSecond = timelineState.pixelsPerSecond * timelineState.zoom
  const totalWidth = duration * pixelsPerSecond
  
  // Convert time to pixels
  const timeToPixels = useCallback((time: number) => {
    return time * pixelsPerSecond
  }, [pixelsPerSecond])
  
  // Convert pixels to time
  const pixelsToTime = useCallback((pixels: number) => {
    return pixels / pixelsPerSecond
  }, [pixelsPerSecond])
  
  // Handle click on timeline track to seek
  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track) return
    
    const rect = track.getBoundingClientRect()
    const x = e.clientX - rect.left + track.scrollLeft
    const time = pixelsToTime(x)
    
    onSeek(Math.max(0, Math.min(time, duration)))
  }, [pixelsToTime, duration, onSeek])
  
  // Generate time markers
  const timeMarkers = useMemo(() => {
    const markers: number[] = []
    const interval = timelineState.zoom >= 2 ? 1 : timelineState.zoom >= 1 ? 5 : 10
    
    for (let t = 0; t <= duration; t += interval) {
      markers.push(t)
    }
    
    return markers
  }, [duration, timelineState.zoom])
  
  const handleZoomIn = useCallback(() => {
    onZoom(timelineState.zoom + 0.5)
  }, [onZoom, timelineState.zoom])
  
  const handleZoomOut = useCallback(() => {
    onZoom(timelineState.zoom - 0.5)
  }, [onZoom, timelineState.zoom])
  
  if (duration === 0) {
    return (
      <div className="bg-timeline-bg rounded-lg p-4 text-center text-muted-foreground">
        Upload a video to see the timeline
      </div>
    )
  }
  
  return (
    <div className="bg-timeline-bg rounded-lg overflow-hidden">
      {/* Zoom Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-sm text-muted-foreground">Timeline</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={timelineState.zoom <= 0.5}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">
            {Math.round(timelineState.zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={timelineState.zoom >= 4}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="w-full">
        <div 
          ref={trackRef}
          className="relative min-h-[120px] cursor-crosshair"
          style={{ width: totalWidth + 100 }}
          onClick={handleTrackClick}
        >
          {/* Time Markers */}
          <div className="absolute top-0 left-0 right-0 h-6 border-b border-border/50">
            {timeMarkers.map(time => (
              <div
                key={time}
                className="absolute top-0 h-full flex flex-col items-center"
                style={{ left: timeToPixels(time) }}
              >
                <div className="h-2 w-px bg-border" />
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {formatTime(time)}
                </span>
              </div>
            ))}
          </div>
          
          {/* Segments Track */}
          <div className="absolute top-8 left-0 right-0 bottom-0 bg-timeline-track">
            {segments.map(segment => (
              <TimelineSegment
                key={segment.id}
                segment={segment}
                isSelected={selectedSegmentId === segment.id}
                pixelsPerSecond={pixelsPerSecond}
                duration={duration}
                onSelect={onSelectSegment}
                onUpdate={onUpdateSegment}
              />
            ))}
          </div>
          
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-timeline-playhead z-10 pointer-events-none"
            style={{ left: timeToPixels(currentTime) }}
          >
            <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-timeline-playhead rounded-full" />
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
