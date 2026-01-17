import type { TextAlign, VerticalPosition, SegmentType } from './enums'

/**
 * A single lyric segment with timing information
 */
export interface LyricSegment {
  id: string
  text: string
  startTime: number  // in seconds
  endTime: number    // in seconds
  type: SegmentType  // 'lyric' or 'spacer'
}

/**
 * Video file state
 */
export interface VideoState {
  file: File | null
  url: string | null
  duration: number
  currentTime: number
  isPlaying: boolean
  isLoaded: boolean
}

/**
 * Complete project state
 */
export interface Project {
  video: VideoState
  segments: LyricSegment[]
  selectedSegmentId: string | null
}

/**
 * Style options for Lyric Drop
 */
export interface LyricStyle {
  fontSize: number
  fontFamily: string
  color: string
  backgroundColor: string
  backgroundOpacity: number
  textAlign: TextAlign
  verticalPosition: VerticalPosition
  padding: number
}

/**
 * Timeline state
 */
export interface TimelineState {
  zoom: number           // 1 = 100%, 2 = 200% etc
  scrollPosition: number // horizontal scroll in pixels
  pixelsPerSecond: number
}

/**
 * Export options
 */
export interface ExportOptions {
  quality: 'low' | 'medium' | 'high'
  format: 'mp4'
}

/**
 * Export progress tracking
 */
export interface ExportProgress {
  status: 'idle' | 'preparing' | 'processing' | 'complete' | 'error'
  progress: number  // 0-100
  message: string
}
