import { useState, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'

import type { LyricSegment, LyricSection, TimelineState } from '@/types'
import { SegmentType } from '@/types/enums'
import {
  sortSegmentsByTime,
  findActiveSegment,
  updateSegmentTiming,
  updateSegmentText,
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
  appendLyrics: (text: string, sectionStart: number, sectionEnd: number, existingSegmentIds: string[]) => void
  
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
    // Get segment info before modifying state
    const segmentToRemove = segments.find(seg => seg.id === id)
    if (!segmentToRemove) return
    
    // Find which section this segment belongs to (if any)
    const containingSection = lyricSections.find(section =>
      segmentToRemove.startTime >= section.startTime && segmentToRemove.endTime <= section.endTime
    )
    
    // If it's a spacer, remove it and close the gap (only within the same section)
    if (segmentToRemove.type === SegmentType.SPACER) {
      const spacerDuration = segmentToRemove.endTime - segmentToRemove.startTime
      const spacerEnd = segmentToRemove.endTime
      
      // Remove the spacer and shift following segments backward (only within the same section)
      setSegments(prev => prev
        .filter(seg => seg.id !== id)
        .map(seg => {
          // Only shift segments that are after the spacer AND within the same section
          if (seg.startTime >= spacerEnd) {
            // Check if this segment is in the same section
            const segInSameSection = containingSection
              ? seg.startTime >= containingSection.startTime && seg.endTime <= containingSection.endTime
              : !lyricSections.some(s => seg.startTime >= s.startTime && seg.endTime <= s.endTime)
            
            if (segInSameSection) {
              return updateSegmentTiming(seg, seg.startTime - spacerDuration, seg.endTime - spacerDuration)
            }
          }
          return seg
        })
      )
    } else {
      // If it's a lyric segment, replace it with a spacer (don't leave empty space)
      setSegments(prev => prev.map(seg => {
        if (seg.id === id) {
          return {
            ...seg,
            type: SegmentType.SPACER,
            text: '',
          }
        }
        return seg
      }))
    }
    
    if (selectedSegmentId === id) {
      setSelectedSegmentId(null)
    }
    logger.debug('Segment removed/converted:', id)
  }, [segments, lyricSections, selectedSegmentId])
  
  const updateSegment = useCallback((id: string, updates: Partial<LyricSegment>) => {
    setSegments(prev => {
      // Find the index of the segment being updated
      const segmentIndex = prev.findIndex(seg => seg.id === id)
      if (segmentIndex === -1) return prev
      
      const currentSegment = prev[segmentIndex]
      
      // Find which section this segment belongs to
      const containingSection = lyricSections.find(section =>
        currentSegment.startTime >= section.startTime && currentSegment.endTime <= section.endTime
      )
      
      // Calculate the new timing
      const newStartTime = updates.startTime ?? currentSegment.startTime
      let newEndTime = updates.endTime ?? currentSegment.endTime
      
      // Calculate how much the end time would shift
      let endTimeShift = newEndTime - currentSegment.endTime
      
      // If extending and in a section, clamp so last segment doesn't exceed section end
      if (containingSection && endTimeShift > 0) {
        // Find all segments in this section after the current one
        const segmentsAfter = prev.filter((seg, idx) => 
          idx > segmentIndex &&
          seg.startTime >= containingSection.startTime && 
          seg.endTime <= containingSection.endTime
        )
        
        // Find the last segment in the section
        const lastSegmentInSection = segmentsAfter.length > 0
          ? segmentsAfter[segmentsAfter.length - 1]
          : currentSegment
        
        // Calculate max allowed shift
        const maxShift = containingSection.endTime - lastSegmentInSection.endTime
        if (endTimeShift > maxShift) {
          endTimeShift = Math.max(0, maxShift)
          newEndTime = currentSegment.endTime + endTimeShift
        }
      }
      
      // If no actual shift, just update text if needed
      if (endTimeShift === 0 && updates.startTime === undefined && updates.text !== undefined) {
        return prev.map(seg => 
          seg.id === id ? updateSegmentText(seg, updates.text!) : seg
        )
      }
      
      // Update all segments
      const updated = prev.map((seg, index) => {
        if (seg.id === id) {
          let newSegment = { ...seg }
          
          if (updates.startTime !== undefined || updates.endTime !== undefined) {
            newSegment = updateSegmentTiming(newSegment, newStartTime, newEndTime)
          }
          
          if (updates.text !== undefined) {
            newSegment = updateSegmentText(newSegment, updates.text)
          }
          
          return newSegment
        }
        
        // Only shift segments that are after AND in the same section
        if (index > segmentIndex && endTimeShift !== 0 && containingSection) {
          const isInSameSection = seg.startTime >= containingSection.startTime && seg.endTime <= containingSection.endTime
          
          if (isInSameSection) {
            const shiftedStart = seg.startTime + endTimeShift
            const shiftedEnd = seg.endTime + endTimeShift
            
            if (shiftedStart >= 0) {
              return updateSegmentTiming(seg, shiftedStart, shiftedEnd)
            }
          }
        }
        
        return seg
      })
      
      return sortSegmentsByTime(updated)
    })
  }, [lyricSections])
  
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
    const sectionDuration = effectiveEndTime - startTime
    const segmentDuration = sectionDuration / lines.length
    
    // Create segments for this section
    const newSegments: LyricSegment[] = lines.map((line, index) => ({
      id: uuidv4(),
      text: line,
      startTime: startTime + (index * segmentDuration),
      endTime: startTime + ((index + 1) * segmentDuration),
      type: SegmentType.LYRIC,
    }))
    
    // Merge with existing segments - keep segments outside this section's time range
    setSegments(prev => {
      const segmentsOutsideSection = prev.filter(seg => 
        seg.endTime <= startTime || seg.startTime >= effectiveEndTime
      )
      return sortSegmentsByTime([...segmentsOutsideSection, ...newSegments])
    })
    
    setSelectedSegmentId(null)
    logger.info(`Imported ${newSegments.length} lyric segments from ${startTime}s to ${effectiveEndTime}s`)
  }, [])
  
  // Append lyrics to existing segments (redistributes all segments in section)
  const appendLyrics = useCallback((text: string, sectionStart: number, sectionEnd: number, existingSegmentIds: string[]) => {
    const newLines = parseLyricsToLines(text)
    if (newLines.length === 0) {
      logger.warn('No lyrics to append')
      return
    }
    
    setSegments(prev => {
      // Get existing segments in this section (preserve their text)
      const existingSegments = prev.filter(seg => existingSegmentIds.includes(seg.id))
      const otherSegments = prev.filter(seg => !existingSegmentIds.includes(seg.id))
      
      // Combine existing texts with new lines
      const allTexts = [
        ...existingSegments.map(seg => seg.text),
        ...newLines
      ]
      
      // Calculate new timing for all segments
      const sectionDuration = sectionEnd - sectionStart
      const segmentDuration = sectionDuration / allTexts.length
      
      // Create redistributed segments
      const redistributedSegments: LyricSegment[] = allTexts.map((text, index) => {
        const existingSeg = existingSegments[index]
        return {
          id: existingSeg?.id ?? uuidv4(),
          text,
          startTime: sectionStart + (index * segmentDuration),
          endTime: sectionStart + ((index + 1) * segmentDuration),
          type: existingSeg?.type ?? SegmentType.LYRIC,
        }
      })
      
      logger.info(`Redistributed ${redistributedSegments.length} segments (${existingSegments.length} existing + ${newLines.length} new) in section`)
      
      return sortSegmentsByTime([...otherSegments, ...redistributedSegments])
    })
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
    let insertionPoint = atTime
    
    // First, determine the insertion point based on segments
    const segmentAtCursor = segments.find(seg => atTime >= seg.startTime && atTime < seg.endTime)
    
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
    
    // Update segments
    setSegments(prev => {
      // Shift all segments that start at or after the insertion point
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
    
    // Update lyric sections - extend sections that contain the insertion point,
    // shift sections that start after the insertion point
    setLyricSections(prev => {
      return prev.map(section => {
        // Use <= for endTime to include insertion at the section's end boundary
        if (insertionPoint >= section.startTime && insertionPoint <= section.endTime) {
          // Insertion point is inside this section (or at its end) - extend the section
          return { ...section, endTime: section.endTime + duration }
        } else if (section.startTime > insertionPoint) {
          // Section starts after insertion point - shift it forward
          return { 
            ...section, 
            startTime: section.startTime + duration, 
            endTime: section.endTime + duration 
          }
        }
        return section
      })
    })
    
    logger.debug('Spacer inserted at:', atTime, 'duration:', duration)
  }, [segments])
  
  // Lyric Section operations
  const addLyricSection = useCallback((startTime: number = 0, endTime: number = 30) => {
    // Check if new section would overlap with existing sections
    // Note: adjacent sections (startTime === section.endTime) are allowed
    const wouldOverlap = lyricSections.some(section => 
      (startTime >= section.startTime && startTime < section.endTime) ||
      (endTime > section.startTime && endTime <= section.endTime) ||
      (startTime < section.startTime && endTime > section.endTime)
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
    logger.info('Lyric section added:', newSection.id, 'from', startTime, 'to', endTime)
  }, [lyricSections])
  
  const removeLyricSection = useCallback((id: string) => {
    // Find the section to get its time range
    const sectionToRemove = lyricSections.find(s => s.id === id)
    
    if (sectionToRemove) {
      // Remove all segments within this section's time range
      setSegments(prev => prev.filter(seg => 
        seg.endTime <= sectionToRemove.startTime || seg.startTime >= sectionToRemove.endTime
      ))
    }
    
    // Remove the section itself
    setLyricSections(prev => prev.filter(section => section.id !== id))
    
    if (selectedSectionId === id) {
      setSelectedSectionId(null)
    }
    setSelectedSegmentId(null)
    logger.debug('Lyric section and its segments removed:', id)
  }, [selectedSectionId, lyricSections])
  
  const updateLyricSection = useCallback((id: string, updates: Partial<LyricSection>) => {
    // Update section first, then redistribute segments based on new bounds
    setLyricSections(prev => {
      const currentSection = prev.find(s => s.id === id)
      if (!currentSection) return prev
      
      const newStartTime = updates.startTime ?? currentSection.startTime
      const newEndTime = updates.endTime ?? currentSection.endTime
      
      // Update segments to fit new section bounds
      setSegments(prevSegments => {
        // Find segments that overlap with the CURRENT section bounds
        const segmentsInSection = prevSegments.filter(seg => 
          seg.startTime < currentSection.endTime && seg.endTime > currentSection.startTime
        )
        
        if (segmentsInSection.length === 0) return prevSegments
        
        // Get the actual bounds of the segments
        const actualFirstStart = Math.min(...segmentsInSection.map(s => s.startTime))
        const actualLastEnd = Math.max(...segmentsInSection.map(s => s.endTime))
        const actualSegmentsDuration = actualLastEnd - actualFirstStart
        
        // Prevent division by zero
        if (actualSegmentsDuration === 0) return prevSegments
        
        // Get IDs of segments in section
        const segmentIdsInSection = new Set(segmentsInSection.map(s => s.id))
        
        // New section duration
        const newSectionDuration = newEndTime - newStartTime
        
        // Redistribute each segment proportionally to fill new section bounds
        return prevSegments.map(seg => {
          if (segmentIdsInSection.has(seg.id)) {
            // Calculate relative position (0 to 1) within the current segment span
            const relativeStart = (seg.startTime - actualFirstStart) / actualSegmentsDuration
            const relativeEnd = (seg.endTime - actualFirstStart) / actualSegmentsDuration
            
            // Map to new section bounds - segments always fill from start to end
            const newSegStart = newStartTime + (relativeStart * newSectionDuration)
            const newSegEnd = newStartTime + (relativeEnd * newSectionDuration)
            
            return {
              ...seg,
              startTime: newSegStart,
              endTime: newSegEnd,
            }
          }
          return seg
        })
      })
      
      // Update section
      return prev.map(section => {
        if (section.id !== id) return section
        return { ...section, ...updates }
      }).sort((a, b) => a.startTime - b.startTime)
    })
  }, [])
  
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
    appendLyrics,
    setZoom,
    setScrollPosition,
    getSegmentAtTime,
  }
}
