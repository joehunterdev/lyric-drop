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
  
  // Lyric Section operations
  const addLyricSection = useCallback((startTime: number = 0, endTime: number = 30) => {
    // Check if new section would overlap with existing sections
    const wouldOverlap = lyricSections.some(section => 
      (startTime >= section.startTime && startTime < section.endTime) ||
      (endTime > section.startTime && endTime <= section.endTime) ||
      (startTime <= section.startTime && endTime >= section.endTime)
    )
    
    if (wouldOverlap) {
      logger.warn('Cannot add lyric section - would overlap with existing section')
      return
    }
    
    const newSection: LyricSection = {
      id: uuidv4(),
      startTime,
      endTime,
    }
    
    setLyricSections(prev => [...prev, newSection].sort((a, b) => a.startTime - b.startTime))
    setSelectedSectionId(newSection.id)
    logger.info('Lyric section added:', newSection.id)
  }, [lyricSections])
  
  const removeLyricSection = useCallback((id: string) => {
    setLyricSections(prev => prev.filter(section => section.id !== id))
    if (selectedSectionId === id) {
      setSelectedSectionId(null)
    }
    logger.debug('Lyric section removed:', id)
  }, [selectedSectionId])
  
  const updateLyricSection = useCallback((id: string, updates: Partial<LyricSection>) => {
    // Get the current section to calculate redistribution
    const currentSection = lyricSections.find(s => s.id === id)
    if (!currentSection) return
    
    const newStartTime = updates.startTime ?? currentSection.startTime
    const newEndTime = updates.endTime ?? currentSection.endTime
    const oldStartTime = currentSection.startTime
    const oldEndTime = currentSection.endTime
    
    // Check if bounds actually changed
    const boundsChanged = newStartTime !== oldStartTime || newEndTime !== oldEndTime
    
    if (boundsChanged) {
      // Redistribute segments that fall within the section
      setSegments(prevSegments => {
        // Find segments within the OLD section bounds
        const segmentsInSection = prevSegments.filter(
          seg => seg.startTime >= oldStartTime && seg.endTime <= oldEndTime
        )
        
        if (segmentsInSection.length === 0) return prevSegments
        
        // Get the actual bounds of the segments (not the section)
        const actualFirstStart = Math.min(...segmentsInSection.map(s => s.startTime))
        const actualLastEnd = Math.max(...segmentsInSection.map(s => s.endTime))
        const actualSegmentsDuration = actualLastEnd - actualFirstStart
        
        const newDuration = newEndTime - newStartTime
        
        // Scale factor to fit segments into new section duration
        const scale = newDuration / actualSegmentsDuration
        
        // Redistribute each segment - snap to start and scale proportionally
        return prevSegments.map(seg => {
          if (seg.startTime >= oldStartTime && seg.endTime <= oldEndTime) {
            // Calculate position relative to the first segment (not section start)
            const relativeStart = seg.startTime - actualFirstStart
            const segmentDuration = seg.endTime - seg.startTime
            
            // Map to new section: start at newStartTime and scale
            const newSegStart = newStartTime + (relativeStart * scale)
            const newSegEnd = newSegStart + (segmentDuration * scale)
            
            return {
              ...seg,
              startTime: newSegStart,
              endTime: newSegEnd,
            }
          }
          return seg
        })
      })
    }
    
    // Update the section itself
    setLyricSections(prev => prev.map(section => {
      if (section.id !== id) return section
      return { ...section, ...updates }
    }).sort((a, b) => a.startTime - b.startTime))
  }, [lyricSections])
  
  const selectLyricSection = useCallback((id: string | null) => {
    setSelectedSectionId(id)
    // Deselect segment when selecting a section
    if (id !== null) {
      setSelectedSegmentId(null)
    }
  }, [])
  
  return {
    segments,
    lyricSections,
    selectedSegmentId,
    selectedSectionId,
    timelineState,
    activeSegment,
    addSegment,
    removeSegment,
    updateSegment,
    selectSegment,
    clearSegments,
    insertSpacer,
    addLyricSection,
    removeLyricSection,
    updateLyricSection,
    selectLyricSection,
    importLyrics,
    setZoom,
    setScrollPosition,
    getSegmentAtTime,
  }
}
