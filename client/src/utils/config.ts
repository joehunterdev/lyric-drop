/**
 * Application Configuration
 * Reads from environment variables with sensible defaults
 */

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

/** Export format */
export const EXPORT_FORMAT = import.meta.env.VITE_EXPORT_FORMAT || 'webm'

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
