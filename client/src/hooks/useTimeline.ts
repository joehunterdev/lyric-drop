import { useState, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'

import type { LyricSegment, LyricSection, TimelineState } from '@/types'
import {
  sortSegmentsByTime,
  findActiveSegment,
  updateSegmentTiming,
  updateSegmentText,
  createSegmentsFromLines,
  createSpacerSegment,
  parseLyricsToLines,
  logger,
} from '@/utils'

interface UseTimelineReturn {
  segments: LyricSegment[]
  lyricSections: LyricSection[]
  selectedSegmentId: string | null
  selectedSectionId: string | null
  timelineState: TimelineState
  activeSegment: LyricSegment | null
  
  // Segment operations
  addSegment: (segment: LyricSegment) => void
  removeSegment: (id: string) => void
  updateSegment: (id: string, updates: Partial<LyricSegment>) => void
  selectSegment: (id: string | null) => void
  clearSegments: () => void
  insertSpacer: (atTime: number, duration?: number) => void
  
  // Lyric section operations
  addLyricSection: (startTime?: number, endTime?: number) => void
  removeLyricSection: (id: string) => void
  updateLyricSection: (id: string, updates: Partial<LyricSection>) => void
  selectLyricSection: (id: string | null) => void
  
  // Bulk operations
  importLyrics: (text: string, videoDuration: number, startTime?: number, endTime?: number) => void
  
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
  const [lyricSections, setLyricSections] = useState<LyricSection[]>([])
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
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
      // Find the index of the segment being updated
      const segmentIndex = prev.findIndex(seg => seg.id === id)
      if (segmentIndex === -1) return prev
      
      const currentSegment = prev[segmentIndex]
      
      // Calculate the new timing
      const newStartTime = updates.startTime ?? currentSegment.startTime
      const newEndTime = updates.endTime ?? currentSegment.endTime
      
      // Calculate how much the end time shifted (for cascading to following segments)
      const endTimeShift = newEndTime - currentSegment.endTime
      
      // Update all segments
      const updated = prev.map((seg, index) => {
        if (seg.id === id) {
          // Update the target segment
          let newSegment = { ...seg }
          
          if (updates.startTime !== undefined || updates.endTime !== undefined) {
            newSegment = updateSegmentTiming(newSegment, newStartTime, newEndTime)
          }
          
          if (updates.text !== undefined) {
            newSegment = updateSegmentText(newSegment, updates.text)
          }
          
          return newSegment
        }
        
        // Shift all following segments by the same amount the end time changed
        if (index > segmentIndex && endTimeShift !== 0) {
          const shiftedStart = seg.startTime + endTimeShift
          const shiftedEnd = seg.endTime + endTimeShift
          
          // Only shift if times remain valid (not negative)
          if (shiftedStart >= 0) {
            return updateSegmentTiming(seg, shiftedStart, shiftedEnd)
          }
        }
        
        return seg
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
  
  const importLyrics = useCallback((text: string, videoDuration: number, startTime: number = 0, endTime?: number) => {
    const lines = parseLyricsToLines(text)
    if (lines.length === 0) {
      logger.warn('No lyrics to import')
      return
    }
    
    const effectiveEndTime = endTime ?? videoDuration
    const endOffset = videoDuration - effectiveEndTime
    
    const newSegments = createSegmentsFromLines(lines, videoDuration, startTime, endOffset)
    setSegments(newSegments)
    setSelectedSegmentId(null)
    logger.info(`Imported ${newSegments.length} lyric segments from ${startTime}s to ${effectiveEndTime}s`)
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
  
  // Insert a spacer at a given time, shifting all following segments
  // If cursor is over a segment, snap to left or right edge based on position
  const insertSpacer = useCallback((atTime: number, duration: number = 2) => {
    setSegments(prev => {
      // Check if cursor is inside a segment
      const segmentAtCursor = prev.find(seg => atTime >= seg.startTime && atTime < seg.endTime)
      
      let insertionPoint = atTime
      
      if (segmentAtCursor) {
        // Determine if cursor is on left or right half of the segment
        const segmentMidpoint = (segmentAtCursor.startTime + segmentAtCursor.endTime) / 2
        
        if (atTime < segmentMidpoint) {
          // Insert BEFORE this segment (at its start)
          insertionPoint = segmentAtCursor.startTime
        } else {
          // Insert AFTER this segment (at its end)
          insertionPoint = segmentAtCursor.endTime
        }
      }
      
      // Now shift all segments that start at or after the insertion point
      const updated = prev.map(seg => {
        if (seg.startTime >= insertionPoint) {
          // Shift this segment forward by spacer duration
          return updateSegmentTiming(seg, seg.startTime + duration, seg.endTime + duration)
        }
        return seg
      })
      
      // Add the spacer at the insertion point
      const spacer = createSpacerSegment(insertionPoint, insertionPoint + duration)
      
      return sortSegmentsByTime([...updated, spacer])
    })
    
    logger.debug('Spacer inserted at:', atTime, 'duration:', duration)
  }, [])
  
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
    insertSpacer,
    importLyrics,
    setZoom,
    setScrollPosition,
    getSegmentAtTime,
  }
}
