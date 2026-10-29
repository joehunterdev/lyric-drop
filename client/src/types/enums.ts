/**
 * Segment status in the editing workflow
 */
export const SegmentStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETE: 'complete',
} as const
export type SegmentStatus = (typeof SegmentStatus)[keyof typeof SegmentStatus]

/**
 * Segment type - lyric or spacer (pause/instrumental)
 */
export const SegmentType = {
  LYRIC: 'lyric',
  SPACER: 'spacer',
} as const
export type SegmentType = (typeof SegmentType)[keyof typeof SegmentType]

/**
 * Video playback state
 */
export const PlaybackState = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ERROR: 'error',
} as const
export type PlaybackState = (typeof PlaybackState)[keyof typeof PlaybackState]

/**
 * Export status
 */
export const ExportStatus = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const
export type ExportStatus = (typeof ExportStatus)[keyof typeof ExportStatus]

/**
 * Background source for the editor - a video, or a still image plus an audio track
 */
export const SourceMode = {
  VIDEO: 'video',
  IMAGE: 'image',
} as const
export type SourceMode = (typeof SourceMode)[keyof typeof SourceMode]

/**
 * Output frame format for image mode
 */
export const OutputFormat = {
  REEL: 'reel',
  YOUTUBE: 'youtube',
} as const
export type OutputFormat = (typeof OutputFormat)[keyof typeof OutputFormat]

/**
 * How a still image is fitted to the output frame
 */
export const ImageFit = {
  COVER: 'cover',
  BLUR_FILL: 'blur-fill',
} as const
export type ImageFit = (typeof ImageFit)[keyof typeof ImageFit]

/**
 * Text alignment options for lyrics
 */
export const TextAlign = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
} as const
export type TextAlign = (typeof TextAlign)[keyof typeof TextAlign]

/**
 * What is drawn behind the lyric text
 */
export const BackgroundMode = {
  NONE: 'none',
  BOX: 'box',
  LINE: 'line',
  BAND: 'band',
} as const
export type BackgroundMode = (typeof BackgroundMode)[keyof typeof BackgroundMode]

/**
 * Text case transform for lyrics
 */
export const TextTransform = {
  NONE: 'none',
  UPPERCASE: 'uppercase',
} as const
export type TextTransform = (typeof TextTransform)[keyof typeof TextTransform]

/**
 * Vertical position for lyrics
 */
export const VerticalPosition = {
  TOP: 'top',
  CENTER: 'center',
  BOTTOM: 'bottom',
} as const
export type VerticalPosition = (typeof VerticalPosition)[keyof typeof VerticalPosition]
