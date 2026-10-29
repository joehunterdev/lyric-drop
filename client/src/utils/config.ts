/**
 * Application Configuration
 * Reads from environment variables with sensible defaults
 */

import type { OutputFormat } from '@/types/enums'
import type { LyricBox } from '@/types'

// ===========================================
// Export Settings
// ===========================================

/** Video bitrate in bits per second */
export const EXPORT_BITRATE = parseInt(
  import.meta.env.VITE_EXPORT_BITRATE || '15000000',
  10
)

/** Export frame rate (fps) */
export const EXPORT_FRAMERATE = parseInt(
  import.meta.env.VITE_EXPORT_FRAMERATE || '30',
  10
)

export type ExportFileFormat = 'mp4' | 'webm'

/** Default export container - MP4 is what phones and every social platform take */
export const DEFAULT_EXPORT_FORMAT: ExportFileFormat =
  import.meta.env.VITE_EXPORT_FORMAT === 'webm' ? 'webm' : 'mp4'

/**
 * Recorder types per format, best first. MP4 asks for AAC audio explicitly -
 * Instagram is fussy about Opus. Plain 'video/mp4' is a last resort for Safari.
 */
const EXPORT_MIME_TYPES: Record<ExportFileFormat, string[]> = {
  mp4: [
    'video/mp4;codecs=avc1.640028,mp4a.40.2',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
  ],
  webm: ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'],
}

/**
 * Whether this browser can record the given format directly
 */
export function canRecordFormat(format: ExportFileFormat): boolean {
  return typeof MediaRecorder !== 'undefined' &&
    EXPORT_MIME_TYPES[format].some(type => MediaRecorder.isTypeSupported(type))
}

/**
 * Recorder type for an export - the preferred format if the browser can record
 * it, otherwise the other one. Empty means let the browser pick.
 */
export function pickExportMimeType(preferred: ExportFileFormat): string {
  const fallback: ExportFileFormat = preferred === 'mp4' ? 'webm' : 'mp4'
  return [...EXPORT_MIME_TYPES[preferred], ...EXPORT_MIME_TYPES[fallback]]
    .find(type => MediaRecorder.isTypeSupported(type)) ?? ''
}

// ===========================================
// File Upload Settings
// ===========================================

/** Allowed video file extensions */
export const ALLOWED_VIDEO_EXTENSIONS = (
  import.meta.env.VITE_ALLOWED_VIDEO_EXTENSIONS || '.mp4,.webm'
).split(',').map((ext: string) => ext.trim().toLowerCase())

/** Allowed video MIME types */
export const ALLOWED_VIDEO_TYPES = (
  import.meta.env.VITE_ALLOWED_VIDEO_TYPES || 'video/mp4,video/webm'
).split(',').map((type: string) => type.trim())

/** Maximum file size in bytes (default 1GB) */
export const MAX_FILE_SIZE = parseInt(
  import.meta.env.VITE_MAX_FILE_SIZE || '1073741824',
  10
)

/** Allowed image file extensions (image mode background) */
export const ALLOWED_IMAGE_EXTENSIONS = (
  import.meta.env.VITE_ALLOWED_IMAGE_EXTENSIONS || '.jpg,.jpeg,.png,.webp'
).split(',').map((ext: string) => ext.trim().toLowerCase())

/** Allowed image MIME types */
export const ALLOWED_IMAGE_TYPES = (
  import.meta.env.VITE_ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp'
).split(',').map((type: string) => type.trim())

/** Allowed audio file extensions (image mode soundtrack) */
export const ALLOWED_AUDIO_EXTENSIONS = (
  import.meta.env.VITE_ALLOWED_AUDIO_EXTENSIONS || '.mp3,.m4a,.aac,.wav,.ogg,.webm'
).split(',').map((ext: string) => ext.trim().toLowerCase())

/** Allowed audio MIME types */
export const ALLOWED_AUDIO_TYPES = (
  import.meta.env.VITE_ALLOWED_AUDIO_TYPES ||
  'audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm'
).split(',').map((type: string) => type.trim())

// ===========================================
// Output Formats (image mode)
// ===========================================

export interface OutputFormatSpec {
  width: number
  height: number
  label: string
  /** Default lyric area for this format */
  lyricBox: LyricBox
}

/**
 * Fixed export sizes for image mode.
 * Reels keep lyrics higher so platform UI (captions, buttons) doesn't cover them.
 */
export const OUTPUT_FORMATS: Record<OutputFormat, OutputFormatSpec> = {
  reel: {
    width: 1080,
    height: 1920,
    label: 'Reel 9:16',
    lyricBox: { x: 0.075, y: 0.58, width: 0.85, height: 0.2 },
  },
  youtube: {
    width: 1920,
    height: 1080,
    label: 'YouTube 16:9',
    lyricBox: { x: 0.075, y: 0.6, width: 0.85, height: 0.28 },
  },
}

// ===========================================
// Lyric Settings
// ===========================================

/** Maximum number of lyric segments */
export const MAX_SEGMENTS = parseInt(
  import.meta.env.VITE_MAX_SEGMENTS || '500',
  10
)

/** Default font size as percentage of video height */
export const LYRIC_FONT_SIZE_PERCENT = parseFloat(
  import.meta.env.VITE_LYRIC_FONT_SIZE_PERCENT || '5'
)

/** Default background opacity (0-1) */
export const LYRIC_BG_OPACITY = parseFloat(
  import.meta.env.VITE_LYRIC_BG_OPACITY || '0.7'
)

// ===========================================
// Helpers
// ===========================================

/**
 * Check if a file extension is allowed
 */
export function isAllowedExtension(filename: string): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  return ALLOWED_VIDEO_EXTENSIONS.includes(ext)
}

/**
 * Check if a MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType)
}

/**
 * Check if file size is within limit
 */
export function isFileSizeAllowed(sizeBytes: number): boolean {
  return sizeBytes <= MAX_FILE_SIZE
}

/**
 * Format file size for display
 */
export function formatMaxFileSize(): string {
  const mb = MAX_FILE_SIZE / (1024 * 1024)
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`
  }
  return `${mb.toFixed(0)} MB`
}

/**
 * Validate a video file for upload
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  // Check MIME type
  if (!isAllowedMimeType(file.type)) {
    // Fallback to extension check
    if (!isAllowedExtension(file.name)) {
      return {
        valid: false,
        error: `Only ${ALLOWED_VIDEO_EXTENSIONS.join(', ')} files are supported`,
      }
    }
  }

  // Check file size
  if (!isFileSizeAllowed(file.size)) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatMaxFileSize()}`,
    }
  }

  return { valid: true }
}

/**
 * Validate a file against allowed MIME types / extensions and the size limit
 */
function validateFile(
  file: File,
  types: string[],
  extensions: string[]
): { valid: boolean; error?: string } {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!types.includes(file.type) && !extensions.includes(ext)) {
    return {
      valid: false,
      error: `Only ${extensions.join(', ')} files are supported`,
    }
  }

  if (!isFileSizeAllowed(file.size)) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatMaxFileSize()}`,
    }
  }

  return { valid: true }
}

/**
 * Validate an image file for upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  return validateFile(file, ALLOWED_IMAGE_TYPES, ALLOWED_IMAGE_EXTENSIONS)
}

/**
 * Whether a file looks like an image (by MIME type or extension) - used to
 * route a single upload to image or video mode
 */
export function isImageFile(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return file.type.startsWith('image/') || ALLOWED_IMAGE_EXTENSIONS.includes(ext)
}

/**
 * Validate an audio file for upload
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  return validateFile(file, ALLOWED_AUDIO_TYPES, ALLOWED_AUDIO_EXTENSIONS)
}
