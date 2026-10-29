import type { TextAlign, SegmentType, ImageFit, BackgroundMode, TextTransform } from './enums'

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

/*
 * Lyric overlay style.
 * Pixel values are "reference px" at a 1080px shorter side and scale with the
 * frame, so one style looks the same in Reel, YouTube and the preview canvas.
 */

export interface LyricTextStyle {
  /** CSS font family - a curated font, a system font or an uploaded font's family */
  fontFamily: string
  fontWeight: number
  /** Reference px */
  fontSize: number
  /** Shrink the text to fit the lyric box height */
  autoFit: boolean
  /** Hex colour */
  color: string
  align: TextAlign
  transform: TextTransform
  /** Line height multiplier */
  lineHeight: number
  /** Reference px */
  letterSpacing: number
}

export interface LyricBackgroundStyle {
  mode: BackgroundMode
  color: string
  /** 0-1 */
  opacity: number
  /** Reference px */
  radius: number
  /** Reference px */
  padding: number
}

export interface LyricOutlineStyle {
  enabled: boolean
  color: string
  /** Reference px */
  width: number
}

export interface LyricShadowStyle {
  enabled: boolean
  color: string
  /** Reference px */
  blur: number
  /** Reference px */
  offsetY: number
}

export interface LyricStyle {
  text: LyricTextStyle
  background: LyricBackgroundStyle
  outline: LyricOutlineStyle
  shadow: LyricShadowStyle
}

/**
 * A named, reusable style
 */
export interface StylePreset {
  id: string
  name: string
  style: LyricStyle
}

/**
 * A font the user uploaded, registered with the FontFace API
 */
export interface CustomFont {
  /** Namespaced CSS family, e.g. "LD Custom - MyFont" */
  family: string
  /** Display name (from the file name) */
  name: string
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
