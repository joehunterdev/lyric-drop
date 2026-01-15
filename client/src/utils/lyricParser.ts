import { v4 as uuidv4 } from 'uuid'

import type { LyricSegment } from '@/types'

/**
 * Parse a block of lyrics text into lines
 * Handles various line break formats and removes empty lines
 */
export function parseLyricsToLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
}

/**
 * Create lyric segments from lines with automatic timing
 * Distributes lyrics evenly across the video duration
 */
export function createSegmentsFromLines(
  lines: string[],
  videoDuration: number,
  startOffset: number = 0,
  endOffset: number = 0
): LyricSegment[] {
  if (lines.length === 0 || videoDuration <= 0) return []
  
  const effectiveDuration = videoDuration - startOffset - endOffset
  const segmentDuration = effectiveDuration / lines.length
  
  return lines.map((text, index) => ({
    id: uuidv4(),
    text,
    startTime: startOffset + (index * segmentDuration),
    endTime: startOffset + ((index + 1) * segmentDuration),
  }))
}

/**
 * Create an empty segment at a specific time
 */
export function createEmptySegment(startTime: number, endTime: number): LyricSegment {
  return {
    id: uuidv4(),
    text: '',
    startTime,
    endTime,
  }
}

/**
 * Update segment timing
 */
export function updateSegmentTiming(
  segment: LyricSegment,
  startTime: number,
  endTime: number
): LyricSegment {
  return {
    ...segment,
    startTime: Math.max(0, startTime),
    endTime: Math.max(startTime, endTime),
  }
}

/**
 * Update segment text
 */
export function updateSegmentText(segment: LyricSegment, text: string): LyricSegment {
  return {
    ...segment,
    text,
  }
}

/**
 * Sort segments by start time
 */
export function sortSegmentsByTime(segments: LyricSegment[]): LyricSegment[] {
  return [...segments].sort((a, b) => a.startTime - b.startTime)
}

/**
 * Find the segment active at a given time
 */
export function findActiveSegment(segments: LyricSegment[], time: number): LyricSegment | null {
  return segments.find(seg => time >= seg.startTime && time < seg.endTime) ?? null
}

/**
 * Split a segment at a specific time into two segments
 */
export function splitSegmentAtTime(
  segment: LyricSegment,
  splitTime: number
): [LyricSegment, LyricSegment] {
  const firstHalf: LyricSegment = {
    ...segment,
    endTime: splitTime,
  }
  
  const secondHalf: LyricSegment = {
    id: uuidv4(),
    text: '',
    startTime: splitTime,
    endTime: segment.endTime,
  }
  
  return [firstHalf, secondHalf]
}

/**
 * Merge two adjacent segments into one
 */
export function mergeSegments(first: LyricSegment, second: LyricSegment): LyricSegment {
  return {
    id: first.id,
    text: `${first.text} ${second.text}`.trim(),
    startTime: Math.min(first.startTime, second.startTime),
    endTime: Math.max(first.endTime, second.endTime),
  }
}

/**
 * Validate segment timing (no overlaps, valid ranges)
 */
export function validateSegments(segments: LyricSegment[]): boolean {
  const sorted = sortSegmentsByTime(segments)
  
  for (let i = 0; i < sorted.length; i++) {
    const segment = sorted[i]
    
    // Check valid range
    if (segment.startTime < 0 || segment.endTime <= segment.startTime) {
      return false
    }
    
    // Check no overlap with next segment
    if (i < sorted.length - 1) {
      const next = sorted[i + 1]
      if (segment.endTime > next.startTime) {
        return false
      }
    }
  }
  
  return true
}
