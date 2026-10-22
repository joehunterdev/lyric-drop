import type { TextAlign, VerticalPosition, SegmentType, ImageFit } from './enums'

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
 * A lyric section - container for a group of lyric segments
 * Defines a time range where lyrics appear (e.g., a verse, chorus)
 */
export interface LyricSection {
  id: string
  startTime: number  // when this section starts
  endTime: number    // when this section ends
  color?: string     // optional custom color for visual distinction
}

/**
 * Media (video or audio) file state - the clock that drives the timeline
 */
export interface MediaState {
  file: File | null
  url: string | null
  duration: number
  currentTime: number
  isPlaying: boolean
  isLoaded: boolean
}

/**
 * A decoded still image used as the background in image mode
 */
export interface ImageBackground {
  file: File
  url: string
  bitmap: ImageBitmap
  width: number
  height: number
}

/**
 * Area the lyric is laid out in, as fractions (0-1) of the frame.
 * Text wraps to the box width and is centred inside it.
 */
export interface LyricBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Background drawn behind the lyrics on each frame
 */
export type FrameBackground =
  | { kind: 'video'; source: HTMLVideoElement }
  | { kind: 'image'; source: ImageBitmap; fit: ImageFit }

/**
 * Complete project state
 */
export interface Project {
  media: MediaState
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
