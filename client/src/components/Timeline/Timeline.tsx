import { useRef, useCallback, useMemo, useEffect } from 'react'
import { Pause, ZoomIn, ZoomOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { TimelineSegment } from './TimelineSegment'
import { TimelineLyricSection } from './TimelineLyricSection'
import { formatTime } from '@/utils'
import type { LyricSegment, LyricSection, TimelineState } from '@/types'

interface TimelineProps {
  segments: LyricSegment[]
  lyricSections: LyricSection[]
  selectedSegmentId: string | null
  selectedSectionId: string | null
  currentTime: number
  duration: number
  timelineState: TimelineState
  isPlaying?: boolean
  onSelectSegment: (id: string | null) => void
  onUpdateSegment: (id: string, updates: Partial<LyricSegment>) => void
  onInsertSpacer: (atTime: number, duration?: number) => void
  onSelectSection: (id: string | null) => void
  onUpdateSection: (id: string, updates: Partial<LyricSection>) => void
  onSeek: (time: number) => void
  onZoom: (zoom: number) => void
}

export function Timeline({
  segments,
  lyricSections,
  selectedSegmentId,
  selectedSectionId,
  currentTime,
  duration,
  timelineState,
  isPlaying = false,
  onSelectSegment,
  onUpdateSegment,
  onInsertSpacer,
  onSelectSection,
  onUpdateSection,
  onSeek,
  onZoom,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  const pixelsPerSecond = timelineState.pixelsPerSecond * timelineState.zoom
  
  // Calculate the effective duration (max of video duration or last segment end)
  const lastSegmentEnd = segments.length > 0 
    ? Math.max(...segments.map(s => s.endTime)) 
    : 0
  const firstSegmentStart = segments.length > 0
    ? Math.min(...segments.map(s => s.startTime))
    : 0
  const effectiveDuration = Math.max(duration, lastSegmentEnd)
  
  const totalWidth = effectiveDuration * pixelsPerSecond
  
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
    
    // Allow seeking up to the effective duration (including segments past video end)
    onSeek(Math.max(0, Math.min(time, effectiveDuration)))
  }, [pixelsToTime, effectiveDuration, onSeek])
  
  // Generate time markers - extend to cover all segments
  const timeMarkers = useMemo(() => {
    const markers: number[] = []
    const interval = timelineState.zoom >= 2 ? 1 : timelineState.zoom >= 1 ? 5 : 10
    
    for (let t = 0; t <= effectiveDuration; t += interval) {
      markers.push(t)
    }
    
    return markers
  }, [effectiveDuration, timelineState.zoom])
  
  const handleZoomIn = useCallback(() => {
    onZoom(timelineState.zoom + 0.5)
  }, [onZoom, timelineState.zoom])
  
  const handleZoomOut = useCallback(() => {
    onZoom(timelineState.zoom - 0.5)
  }, [onZoom, timelineState.zoom])
  
  // Auto-scroll to keep playhead visible during playback
  useEffect(() => {
    if (!isPlaying || !scrollAreaRef.current) return
    
    const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollContainer) return
    
    const playheadPosition = timeToPixels(currentTime)
    const containerWidth = scrollContainer.clientWidth
    const scrollLeft = scrollContainer.scrollLeft
    
    // Keep playhead in the middle third of the visible area
    const leftBound = scrollLeft + containerWidth * 0.25
    const rightBound = scrollLeft + containerWidth * 0.75
    
    if (playheadPosition < leftBound || playheadPosition > rightBound) {
      // Scroll to center the playhead
      const targetScroll = playheadPosition - containerWidth / 2
      scrollContainer.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth'
      })
    }
  }, [currentTime, isPlaying, timeToPixels])
  
  if (duration === 0) {
    return (
      <div className="bg-timeline-bg rounded-lg p-4 text-center text-muted-foreground">
        Upload a video to see the timeline
      </div>
    )
  }
  
  return (
    <div className="bg-timeline-bg rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Timeline</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onInsertSpacer(currentTime)}
            disabled={segments.length === 0}
            title="Insert space at playhead"
          >
            <Pause className="w-4 h-4 mr-1" />
            Insert Space
          </Button>
        </div>
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
      
      <ScrollArea className="w-full" ref={scrollAreaRef}>
        <div 
          ref={trackRef}
          className="relative min-h-[160px] cursor-crosshair min-w-full"
          style={{ width: totalWidth }}
          onClick={handleTrackClick}
        >
          {/* Time Markers */}
          <div className="absolute top-0 left-0 h-6 border-b border-border/50 min-w-full" style={{ width: totalWidth }}>
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
          <div className="absolute top-8 left-0 h-[56px] bg-timeline-track min-w-full" style={{ width: totalWidth }}>
            {/* Selected section overlay indicator */}
            {selectedSectionId && lyricSections.find(s => s.id === selectedSectionId) && (() => {
              const selectedSection = lyricSections.find(s => s.id === selectedSectionId)!
              return (
                <div 
                  className="absolute top-0 bottom-0 bg-emerald-500/20 border-x-2 border-emerald-400 pointer-events-none z-[5]"
                  style={{ 
                    left: timeToPixels(selectedSection.startTime), 
                    width: timeToPixels(selectedSection.endTime - selectedSection.startTime) 
                  }}
                >
                  {/* Left edge indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-400" />
                  {/* Right edge indicator */}
                  <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-emerald-400" />
                </div>
              )
            })()}
            
            {/* Pre-lyrics zone indicator (before first segment) */}
            {firstSegmentStart > 0 && (
              <div 
                className="absolute top-0 bottom-0 bg-black/20 border-r border-dashed border-muted-foreground/40"
                style={{ left: 0, width: timeToPixels(firstSegmentStart) }}
              />
            )}
            
            {/* Post-video zone indicator (after video duration) */}
            {lastSegmentEnd > duration && (
              <div 
                className="absolute top-0 bottom-0 bg-orange-500/10 border-l border-dashed border-orange-500/40"
                style={{ left: timeToPixels(duration), width: timeToPixels(lastSegmentEnd - duration) }}
                title="Segments extend past video duration"
              />
            )}
            
            {segments.map(segment => (
              <TimelineSegment
                key={segment.id}
                segment={segment}
                isSelected={selectedSegmentId === segment.id}
                pixelsPerSecond={pixelsPerSecond}
                duration={effectiveDuration}
                onSelect={onSelectSegment}
                onUpdate={onUpdateSegment}
              />
            ))}
          </div>
          
          {/* Lyric Sections Track */}
          <div className="absolute top-[72px] left-0 h-[40px] bg-timeline-track/50 border-t border-border/30 min-w-full" style={{ width: totalWidth }}>
            {lyricSections.map(section => (
              <TimelineLyricSection
                key={section.id}
                section={section}
                isSelected={selectedSectionId === section.id}
                pixelsPerSecond={pixelsPerSecond}
                onSelect={onSelectSection}
                onUpdate={onUpdateSection}
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
