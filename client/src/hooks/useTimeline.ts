import { useState, useCallback, useMemo } from 'react'

import type { LyricSegment, TimelineState } from '@/types'
import {
  sortSegmentsByTime,
  findActiveSegment,
  updateSegmentTiming,
  updateSegmentText,
  createSegmentsFromLines,
  parseLyricsToLines,
  logger,
} from '@/utils'

interface UseTimelineReturn {
  segments: LyricSegment[]
  selectedSegmentId: string | null
  timelineState: TimelineState
  activeSegment: LyricSegment | null
  
  // Segment operations
  addSegment: (segment: LyricSegment) => void
  removeSegment: (id: string) => void
  updateSegment: (id: string, updates: Partial<LyricSegment>) => void
  selectSegment: (id: string | null) => void
  clearSegments: () => void
  
  // Bulk operations
  importLyrics: (text: string, videoDuration: number) => void
  
  // Timeline controls
  setZoom: (zoom: number) => void
  setScrollPosition: (position: number) => void
  
  // Queries
  getSegmentAtTime: (time: number) => LyricSegment | null
}

const initialTimelineState: TimelineState = {
  zoom: 1,
  scrollPosition: 0,
  pixelsPerSecond: 50,
}

export function useTimeline(currentTime: number = 0): UseTimelineReturn {
  const [segments, setSegments] = useState<LyricSegment[]>([])
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [timelineState, setTimelineState] = useState<TimelineState>(initialTimelineState)
  
  // Compute active segment based on current time
  const activeSegment = useMemo(() => {
    return findActiveSegment(segments, currentTime)
  }, [segments, currentTime])
  
  const addSegment = useCallback((segment: LyricSegment) => {
    setSegments(prev => sortSegmentsByTime([...prev, segment]))
    logger.debug('Segment added:', segment.id)
  }, [])
  
  const removeSegment = useCallback((id: string) => {
    setSegments(prev => prev.filter(seg => seg.id !== id))
    if (selectedSegmentId === id) {
      setSelectedSegmentId(null)
    }
    logger.debug('Segment removed:', id)
  }, [selectedSegmentId])
  
  const updateSegment = useCallback((id: string, updates: Partial<LyricSegment>) => {
    setSegments(prev => {
      const updated = prev.map(seg => {
        if (seg.id !== id) return seg
        
        let newSegment = { ...seg }
        
        if (updates.startTime !== undefined || updates.endTime !== undefined) {
          newSegment = updateSegmentTiming(
            newSegment,
            updates.startTime ?? seg.startTime,
            updates.endTime ?? seg.endTime
          )
        }
        
        if (updates.text !== undefined) {
          newSegment = updateSegmentText(newSegment, updates.text)
        }
        
        return newSegment
      })
      
      return sortSegmentsByTime(updated)
    })
  }, [])
  
  const selectSegment = useCallback((id: string | null) => {
    setSelectedSegmentId(id)
  }, [])
  
  const clearSegments = useCallback(() => {
    setSegments([])
    setSelectedSegmentId(null)
    logger.debug('All segments cleared')
  }, [])
  
  const importLyrics = useCallback((text: string, videoDuration: number) => {
    const lines = parseLyricsToLines(text)
    if (lines.length === 0) {
      logger.warn('No lyrics to import')
      return
    }
    
    const newSegments = createSegmentsFromLines(lines, videoDuration)
    setSegments(newSegments)
    setSelectedSegmentId(null)
    logger.info(`Imported ${newSegments.length} lyric segments`)
  }, [])
  
  const setZoom = useCallback((zoom: number) => {
    setTimelineState(prev => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(4, zoom)),
    }))
  }, [])
  
  const setScrollPosition = useCallback((position: number) => {
    setTimelineState(prev => ({
      ...prev,
      scrollPosition: Math.max(0, position),
    }))
  }, [])
  
  const getSegmentAtTime = useCallback((time: number) => {
    return findActiveSegment(segments, time)
  }, [segments])
  
  return {
    segments,
    selectedSegmentId,
    timelineState,
    activeSegment,
    addSegment,
    removeSegment,
    updateSegment,
    selectSegment,
    clearSegments,
    importLyrics,
    setZoom,
    setScrollPosition,
    getSegmentAtTime,
  }
}
