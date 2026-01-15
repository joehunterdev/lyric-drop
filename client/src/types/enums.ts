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
 * Text alignment options for lyrics
 */
export const TextAlign = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
} as const
export type TextAlign = (typeof TextAlign)[keyof typeof TextAlign]

/**
 * Vertical position for lyrics
 */
export const VerticalPosition = {
  TOP: 'top',
  CENTER: 'center',
  BOTTOM: 'bottom',
} as const
export type VerticalPosition = (typeof VerticalPosition)[keyof typeof VerticalPosition]
