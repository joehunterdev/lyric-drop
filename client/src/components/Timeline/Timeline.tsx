import { useRef, useCallback, useMemo, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Space, ZoomIn, ZoomOut, Gauge, Undo2, ArrowRightFromLine, ArrowLeft, ArrowLeftToLine, ArrowRightToLine, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { TimelineSegment } from './TimelineSegment'
import { TimelineLyricSection } from './TimelineLyricSection'
import { StageSizeToggle } from '@/components/VideoPlayer/StageSizeToggle'
import { TimelineWaveform } from './TimelineWaveform'
import { cn } from '@/utils/cn'
import { formatTime } from '@/utils'
import type { Waveform } from '@/hooks'

/** While scrubbing, pointer within this many px of an edge auto-scrolls the timeline */
const SCRUB_EDGE_ZONE = 40
/** Fastest auto-scroll while scrubbing, in px per frame */
const SCRUB_MAX_SPEED = 30
/** Shortest export range, in seconds */
const MIN_TRIM_LENGTH = 1
/** Holding the track still this long turns the drag into a playhead scrub */
const LONG_PRESS_MS = 400
/** Movement (px) that counts as a drag rather than a press */
const DRAG_THRESHOLD = 8
import type { LyricSegment, LyricSection, TimelineState, StageSize, TrimRange } from '@/types'

/** A press on the track: undecided until it moves (pan) or is held (scrub) */
interface TrackGesture {
  pointerId: number
  pointerType: string
  startX: number
  startY: number
  startScroll: number
  mode: 'pending' | 'pan' | 'scrub' | 'native'
  timer: number
}

interface TimelineProps {
  segments: LyricSegment[]
  lyricSections: LyricSection[]
  selectedSegmentId: string | null
  selectedSectionId: string | null
  currentTime: number
  duration: number
  timelineState: TimelineState
  waveform: Waveform
  isPlaying?: boolean
  onSelectSegment: (id: string | null) => void
  onUpdateSegment: (id: string, updates: Partial<LyricSegment>) => void
  onInsertSpacer: (atTime: number, duration?: number) => void
  onSelectSection: (id: string | null) => void
  onUpdateSection: (id: string, updates: Partial<LyricSection>) => void
  onAddSection: (startTime: number, endTime: number) => void
  onSeek: (time: number) => void
  /** Pressing the timeline stops playback */
  onPause?: () => void
  onZoom: (zoom: number) => void
  onUndoRetime: () => void
  canUndoRetime: boolean
  /** Auto-time panel is open. On desktop `retimePanel` renders under the toolbar; on mobile
   * the parent shows it in the docked sheet instead and leaves `retimePanel` undefined. */
  retimeOpen: boolean
  onRetimeToggle: () => void
  retimePanel?: ReactNode
  /** Mobile: the stage has its own icon row, shown in the toolbar until the timeline is touched */
  hasMobileMenu?: boolean
  /** Mobile: extra buttons shown after the stage's icons in the menu row */
  mobileMenuExtra?: ReactNode
  /** Mobile: showing the timeline tools (true) or the stage icons (false) */
  toolsOpen?: boolean
  onToolsOpenChange?: (open: boolean) => void
  /** Mobile preview sizing, cycled by a button next to the zoom buttons */
  stageSize?: StageSize
  onStageSizeChange?: (size: StageSize) => void
  /** Part of the media that gets exported; set from the playhead with the trim buttons.
   * The timeline only shows this range - "Reset trim" brings the rest back. */
  trim?: TrimRange
  onTrimChange?: (range: TrimRange) => void
  /** Receives the toolbar element the stage's icon row is rendered into */
  onMenuSlotChange?: (element: HTMLDivElement | null) => void
}

export function Timeline({
  segments,
  lyricSections,
  selectedSegmentId,
  selectedSectionId,
  currentTime,
  duration,
  timelineState,
  waveform,
  isPlaying = false,
  onSelectSegment,
  onUpdateSegment,
  onInsertSpacer,
  onSelectSection,
  onUpdateSection,
  onAddSection,
  onSeek,
  onPause,
  onZoom,
  onUndoRetime,
  canUndoRetime,
  retimeOpen,
  onRetimeToggle,
  retimePanel,
  hasMobileMenu = false,
  mobileMenuExtra,
  toolsOpen = false,
  onToolsOpenChange,
  onMenuSlotChange,
  stageSize,
  onStageSizeChange,
  trim,
  onTrimChange,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Mobile toolbar: stage menu by default, timeline tools once the timeline is touched
  const showMenu = hasMobileMenu && !toolsOpen

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

  // Trim buttons only make sense once the media is loaded. The playhead picks the point.
  const showTrim = !!trim && !!onTrimChange && duration > 0
  const isTrimmed = showTrim && (trim.start > 0 || trim.end < duration)

  // Visible range: the trimmed-off parts are cut out of the timeline. Everything is still
  // laid out in media time; the track is shifted left by `viewOffset` and clipped to `viewWidth`.
  const viewStart = isTrimmed ? trim.start : 0
  const viewEnd = isTrimmed ? trim.end : effectiveDuration
  const viewOffset = viewStart * pixelsPerSecond
  const viewWidth = (viewEnd - viewStart) * pixelsPerSecond

  // Convert time to pixels
  const timeToPixels = useCallback((time: number) => {
    return time * pixelsPerSecond
  }, [pixelsPerSecond])
  
  // Convert pixels to time
  const pixelsToTime = useCallback((pixels: number) => {
    return pixels / pixelsPerSecond
  }, [pixelsPerSecond])
  
  // Convert a pointer position to a time on the timeline
  const clientXToTime = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return 0

    const rect = track.getBoundingClientRect()
    return pixelsToTime(clientX - rect.left + track.scrollLeft)
  }, [pixelsToTime])

  // Seek to the time under a pointer position
  const seekToClientX = useCallback((clientX: number) => {
    // Allow seeking up to the end of the visible range (including segments past video end)
    onSeek(Math.max(viewStart, Math.min(clientXToTime(clientX), viewEnd)))
  }, [clientXToTime, viewStart, viewEnd, onSeek])

  const getViewport = useCallback(() => (
    scrollAreaRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]') ?? null
  ), [])

  // A pan or scrub ends with a click on whatever is under the pointer - swallow it
  const suppressClickRef = useRef(false)
  const [trackGestureMode, setTrackGestureMode] = useState<TrackGesture['mode'] | null>(null)

  // Handle click on timeline track to seek
  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    seekToClientX(e.clientX)
  }, [seekToClientX])

  // Scrubbing (ruler drag or long-press on the track) - the playhead follows the pointer
  const scrubXRef = useRef<number | null>(null)
  const scrubFrameRef = useRef(0)

  const stopScrub = useCallback(() => {
    scrubXRef.current = null
    cancelAnimationFrame(scrubFrameRef.current)
  }, [])

  useEffect(() => stopScrub, [stopScrub])

  const startScrub = useCallback((clientX: number) => {
    scrubXRef.current = clientX
    seekToClientX(clientX)

    // Holding near (or past) either edge scrolls the timeline, faster the further out
    const viewport = getViewport()
    const tick = () => {
      const x = scrubXRef.current
      if (x === null) return
      if (viewport) {
        const rect = viewport.getBoundingClientRect()
        const intoRight = x - (rect.right - SCRUB_EDGE_ZONE)
        const intoLeft = rect.left + SCRUB_EDGE_ZONE - x
        const step = intoRight > 0 ? intoRight : intoLeft > 0 ? -intoLeft : 0
        if (step !== 0) {
          viewport.scrollLeft += Math.max(-SCRUB_MAX_SPEED, Math.min(SCRUB_MAX_SPEED, step * 0.3))
          // The track moved under the pointer - keep the playhead under it
          seekToClientX(x)
        }
      }
      scrubFrameRef.current = requestAnimationFrame(tick)
    }
    cancelAnimationFrame(scrubFrameRef.current)
    scrubFrameRef.current = requestAnimationFrame(tick)
  }, [seekToClientX, getViewport])

  const moveScrub = useCallback((clientX: number) => {
    scrubXRef.current = clientX
    seekToClientX(clientX)
  }, [seekToClientX])

  // Ruler: press or drag scrubs straight away. Capture the pointer so the drag keeps
  // tracking outside the ruler.
  const handleRulerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    // Not a track gesture as well
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    startScrub(e.clientX)
  }, [startScrub])

  const handleRulerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) moveScrub(e.clientX)
  }, [moveScrub])

  // Track: drag pans the timeline (a finger already scrolls it natively, so only the mouse
  // needs help), press-and-hold then drag scrubs the playhead. Resize handles stop their own
  // pointer events, so they never get here.
  const gestureRef = useRef<TrackGesture | null>(null)

  const endTrackGesture = useCallback(() => {
    const gesture = gestureRef.current
    if (!gesture) return
    clearTimeout(gesture.timer)
    if (gesture.mode === 'pan' || gesture.mode === 'scrub') suppressClickRef.current = true
    if (gesture.mode === 'scrub') stopScrub()
    gestureRef.current = null
    setTrackGestureMode(null)
  }, [stopScrub])

  useEffect(() => () => {
    if (gestureRef.current) clearTimeout(gestureRef.current.timer)
  }, [])

  const handleTrackPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !e.isPrimary) return
    endTrackGesture()
    suppressClickRef.current = false
    const target = e.currentTarget
    const pointerId = e.pointerId
    const gesture: TrackGesture = {
      pointerId,
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      startScroll: getViewport()?.scrollLeft ?? 0,
      mode: 'pending',
      timer: window.setTimeout(() => {
        if (gestureRef.current !== gesture || gesture.mode !== 'pending') return
        gesture.mode = 'scrub'
        setTrackGestureMode('scrub')
        try {
          target.setPointerCapture(pointerId)
        } catch {
          // Pointer already gone - the scrub ends on the next up/cancel
        }
        navigator.vibrate?.(10)
        startScrub(gesture.startX)
      }, LONG_PRESS_MS),
    }
    gestureRef.current = gesture
    setTrackGestureMode('pending')
  }, [endTrackGesture, getViewport, startScrub])

  const handleTrackPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== e.pointerId) return

    if (gesture.mode === 'pending') {
      const moved = Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY)
      if (moved < DRAG_THRESHOLD) return
      clearTimeout(gesture.timer)
      if (gesture.pointerType === 'mouse') {
        gesture.mode = 'pan'
        setTrackGestureMode('pan')
        e.currentTarget.setPointerCapture(e.pointerId)
      } else {
        // Touch/pen: the browser scrolls the timeline itself
        gesture.mode = 'native'
        setTrackGestureMode('native')
      }
    }

    if (gesture.mode === 'pan') {
      const viewport = getViewport()
      if (viewport) viewport.scrollLeft = gesture.startScroll - (e.clientX - gesture.startX)
    } else if (gesture.mode === 'scrub') {
      moveScrub(e.clientX)
    }
  }, [getViewport, moveScrub])

  const handleTrackClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return
    suppressClickRef.current = false
    e.stopPropagation()
  }, [])

  // Once a long-press scrub starts, the finger must move the playhead, not scroll the page.
  // Needs a non-passive native listener - React's touch listeners are passive.
  useEffect(() => {
    const viewport = getViewport()
    if (!viewport) return
    const blockScroll = (e: TouchEvent) => {
      if (gestureRef.current?.mode === 'scrub' && e.cancelable) e.preventDefault()
    }
    viewport.addEventListener('touchmove', blockScroll, { passive: false })
    return () => viewport.removeEventListener('touchmove', blockScroll)
  }, [getViewport])
  
  // Generate time markers across the visible range (media time, so they match the player)
  const timeMarkers = useMemo(() => {
    const markers: number[] = []
    const interval = timelineState.zoom >= 2 ? 1 : timelineState.zoom >= 1 ? 5 : 10

    for (let t = Math.ceil(viewStart / interval) * interval; t <= viewEnd; t += interval) {
      markers.push(t)
    }

    return markers
  }, [viewStart, viewEnd, timelineState.zoom])
  
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
    
    const playheadPosition = timeToPixels(currentTime) - viewOffset
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
  }, [currentTime, isPlaying, timeToPixels, viewOffset])
  
  // Scroll to selected segment when selection changes (from sidebar)
  useEffect(() => {
    if (!selectedSegmentId || !scrollAreaRef.current) return
    
    const selectedSegment = segments.find(s => s.id === selectedSegmentId)
    if (!selectedSegment) return
    
    const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollContainer) return
    
    const segmentPosition = selectedSegment.startTime * pixelsPerSecond - viewOffset
    const containerWidth = scrollContainer.clientWidth
    const scrollLeft = scrollContainer.scrollLeft
    
    // Check if segment is outside visible area
    if (segmentPosition < scrollLeft || segmentPosition > scrollLeft + containerWidth - 100) {
      // Scroll to put segment near the left side with some padding
      scrollContainer.scrollTo({
        left: Math.max(0, segmentPosition - 50),
        behavior: 'smooth'
      })
    }
  }, [selectedSegmentId, segments, pixelsPerSecond, viewOffset])
  
  // "Set start" acts on the selected section, or the one holding the selected line
  const selectedSegment = segments.find(s => s.id === selectedSegmentId)
  const targetSectionIndex = lyricSections.findIndex(section =>
    section.id === selectedSectionId ||
    (!!selectedSegment && selectedSegment.startTime >= section.startTime && selectedSegment.endTime <= section.endTime)
  )
  const targetSection = lyricSections[targetSectionIndex]
  // Before any lyrics, "Set start" creates the first section from the playhead to the end
  const createsSection = lyricSections.length === 0
  // Same limits as dragging the left edge: not before the previous section, and at least 1s long
  const startMin = targetSectionIndex > 0 ? lyricSections[targetSectionIndex - 1].endTime : 0
  const canSetStart = createsSection
    ? currentTime <= duration - 1
    : !!targetSection && currentTime >= startMin && currentTime <= targetSection.endTime - 1

  const handleSetStart = useCallback(() => {
    if (createsSection) {
      onAddSection(currentTime, duration)
    } else if (targetSection) {
      onUpdateSection(targetSection.id, { startTime: currentTime })
    }
  }, [createsSection, targetSection, currentTime, duration, onAddSection, onUpdateSection])

  const canSetTrimStart = showTrim && currentTime <= trim.end - MIN_TRIM_LENGTH
  const canSetTrimEnd = showTrim && currentTime >= trim.start + MIN_TRIM_LENGTH
  const handleSetTrimStart = () => {
    if (showTrim) onTrimChange({ ...trim, start: Math.max(0, currentTime) })
  }
  const handleSetTrimEnd = () => {
    if (showTrim) onTrimChange({ ...trim, end: Math.min(duration, currentTime) })
  }
  const handleResetTrim = () => {
    if (showTrim) onTrimChange({ start: 0, end: duration })
  }

  // if (duration === 0) {
  //   return (
  //     <div className="bg-timeline-bg rounded-lg p-4 text-center text-muted-foreground">
  //       Upload a video to see the timeline
  //     </div>
  //   )
  // }
  
  return (
    <div className="bg-timeline-bg rounded-lg overflow-hidden">
      {/* Mobile menu row: the stage's icons are portalled into the slot (kept mounted,
          just hidden), followed by the app-level buttons */}
      {hasMobileMenu && (
        <div
          className={cn(
            'flex items-center justify-center gap-2 px-3 py-2 border-b border-border lg:hidden',
            !showMenu && 'hidden'
          )}
        >
          <div ref={onMenuSlotChange} className="contents" />
          {mobileMenuExtra}
        </div>
      )}

      {/* Controls */}
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-border',
          showMenu && 'max-lg:hidden'
        )}
      >
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {hasMobileMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => onToolsOpenChange?.(false)}
              aria-label="Back to menu"
              title="Back to menu"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <span className="hidden sm:inline text-sm text-muted-foreground">Timeline</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSetStart}
            disabled={!canSetStart}
            aria-label="Set lyric start"
            title={
              createsSection
                ? `Start the lyrics at ${formatTime(currentTime)}`
                : !targetSection
                  ? 'Select a lyric section first'
                  : canSetStart
                    ? `Start this section at ${formatTime(currentTime)}`
                    : 'Move the playhead inside the section\'s allowed range'
            }
          >
            <ArrowRightFromLine className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Lyric start</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSetTrimStart}
            disabled={!canSetTrimStart}
            aria-label="Set export start"
            title={`Export from ${formatTime(currentTime)} (the playhead)`}
          >
            <ArrowLeftToLine className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Trim start</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSetTrimEnd}
            disabled={!canSetTrimEnd}
            aria-label="Set export end"
            title={`Export up to ${formatTime(currentTime)} (the playhead)`}
          >
            <ArrowRightToLine className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Trim end</span>
          </Button>
          {isTrimmed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetTrim}
              aria-label="Reset trim"
              title="Export the whole media again"
            >
              <RotateCcw className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Reset trim</span>
            </Button>
          )}
          <Button
            variant="outline" 
            size="sm" 
            onClick={() => onInsertSpacer(currentTime)}
            disabled={segments.length === 0}
            aria-label="Insert gap"
            title="Insert a gap in the lyrics at the playhead"
          >
            <Space className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Insert Gap</span>
          </Button>
          <Button
            variant={retimeOpen ? 'secondary' : 'outline'}
            size="sm"
            onClick={onRetimeToggle}
            disabled={segments.length === 0}
            data-docked-sheet-toggle
            aria-label="Auto-time"
            title="Time the following lines from the selected line"
          >
            <Gauge className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Auto-time</span>
          </Button>
          {canUndoRetime && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndoRetime}
              aria-label="Undo auto-time"
              title="Undo the last auto-time"
            >
              <Undo2 className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Undo auto-time</span>
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {stageSize && onStageSizeChange && (
            <StageSizeToggle size={stageSize} onChange={onStageSizeChange} />
          )}
          <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={timelineState.zoom <= 0.5} aria-label="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="hidden sm:block text-sm text-muted-foreground w-12 text-center">
            {Math.round(timelineState.zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={timelineState.zoom >= 4} aria-label="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {retimeOpen && retimePanel}

      {/* Touching the timeline swaps the mobile toolbar to the timeline tools and stops playback */}
      <ScrollArea
        className="w-full"
        ref={scrollAreaRef}
        onPointerDownCapture={() => {
          onToolsOpenChange?.(true)
          if (isPlaying) onPause?.()
        }}
      >
        {/* Visible range - clips the track to the trimmed part */}
        <div
          className="relative min-h-[160px] min-w-full overflow-hidden"
          style={{ width: viewWidth }}
        >
        <div
          ref={trackRef}
          className={cn(
            'absolute inset-y-0 select-none [-webkit-touch-callout:none]',
            (trackGestureMode === 'pending' || trackGestureMode === 'native') && 'cursor-grab',
            (trackGestureMode === 'pan' || trackGestureMode === 'scrub') && 'cursor-grabbing'
          )}
          style={{ left: -viewOffset, width: Math.max(totalWidth, viewOffset + viewWidth) }}
          onClick={handleTrackClick}
          onClickCapture={handleTrackClickCapture}
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={endTrackGesture}
          onPointerCancel={endTrackGesture}
          onContextMenu={e => e.preventDefault()}
        >
          {/* Time Markers - press or drag to scrub the playhead */}
          <div
            className="absolute top-0 left-0 h-6 border-b border-border/50 min-w-full cursor-crosshair select-none touch-none"
            style={{ width: totalWidth }}
            onPointerDown={handleRulerPointerDown}
            onPointerMove={handleRulerPointerMove}
            onLostPointerCapture={stopScrub}
          >
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
                  className="absolute top-0 bottom-0 bg-primary/20 border-x-2 border-primary pointer-events-none z-[5]"
                  style={{ 
                    left: timeToPixels(selectedSection.startTime), 
                    width: timeToPixels(selectedSection.endTime - selectedSection.startTime) 
                  }}
                >
                  {/* Left edge indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                  {/* Right edge indicator */}
                  <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary" />
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
            
            {segments.map(segment => {
              // Find the section this segment belongs to
              const containingSection = lyricSections.find(section =>
                segment.startTime >= section.startTime && segment.endTime <= section.endTime
              )
              // Clamp segment resize to its section bounds (or video bounds if orphan)
              const segMinTime = containingSection ? containingSection.startTime : 0
              // Not capped at the section end: stretching past it grows the section and pushes
              // the rest along (useTimeline limits how far)
              const segMaxTime = effectiveDuration
              
              return (
                <TimelineSegment
                  key={segment.id}
                  segment={segment}
                  isSelected={selectedSegmentId === segment.id}
                  pixelsPerSecond={pixelsPerSecond}
                  duration={effectiveDuration}
                  minTime={segMinTime}
                  maxTime={segMaxTime}
                  onSelect={onSelectSegment}
                  onUpdate={onUpdateSegment}
                />
              )
            })}
          </div>
          
          {/* Lyric Sections Track */}
          <div className="absolute top-[72px] left-0 h-[40px] bg-timeline-track/50 border-t border-border/30 min-w-full" style={{ width: totalWidth }}>
            {lyricSections.map((section, index) => {
              // Calculate bounds based on adjacent sections
              const prevSection = lyricSections[index - 1]
              const nextSection = lyricSections[index + 1]
              const minTime = prevSection ? prevSection.endTime : 0
              const maxTime = nextSection ? nextSection.startTime : duration
              
              return (
                <TimelineLyricSection
                  key={section.id}
                  section={section}
                  isSelected={selectedSectionId === section.id}
                  pixelsPerSecond={pixelsPerSecond}
                  minTime={minTime}
                  maxTime={maxTime}
                  onSelect={onSelectSection}
                  onUpdate={onUpdateSection}
                />
              )
            })}
          </div>

          {/* Waveform - read-only guide for placing edges; clicks fall through to seek */}
          <div className="absolute top-[116px] left-0 h-[40px] bg-timeline-track/30 min-w-full pointer-events-none" style={{ width: totalWidth }}>
            <TimelineWaveform waveform={waveform} pixelsPerSecond={pixelsPerSecond} width={totalWidth} />
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-timeline-playhead z-10 pointer-events-none"
            style={{ left: timeToPixels(currentTime) }}
          >
            <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-timeline-playhead rounded-full" />
          </div>
        </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
