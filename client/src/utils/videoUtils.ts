import { logger } from './logger'

/**
 * Format seconds to MM:SS or HH:MM:SS display
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00'
  
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Parse time string (MM:SS or HH:MM:SS) to seconds
 */
export function parseTimeToSeconds(timeString: string): number {
  const parts = timeString.split(':').map(Number)
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return 0
}

/**
 * Get video duration from a File
 */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      logger.debug('Video duration:', video.duration)
      resolve(video.duration)
    }
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Failed to load video metadata'))
    }
    
    video.src = URL.createObjectURL(file)
  })
}

/**
 * Create an object URL for a video file
 */
export function createVideoUrl(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Revoke an object URL to free memory
 */
export function revokeVideoUrl(url: string): void {
  URL.revokeObjectURL(url)
}

/**
 * Validate if file is a supported video format
 * Accepts common video formats - browser may or may not be able to play them
 */
export function isValidVideoFile(file: File): boolean {
  const validTypes = [
    'video/mp4',
    'video/webm', 
    'video/ogg',
    'video/quicktime',    // .mov
    'video/x-msvideo',    // .avi
    'video/x-matroska',   // .mkv
    'video/x-m4v',        // .m4v
  ]
  
  // Check MIME type
  if (validTypes.includes(file.type)) {
    return true
  }
  
  // Fallback: check file extension for files with empty/generic MIME
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  const validExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v']
  return validExtensions.includes(ext)
}

/**
 * Check if file is a browser-native format that can be exported via Canvas
 * Only MP4 (H.264) and WebM are reliably supported for Canvas export
 */
export function isExportableFormat(file: File): boolean {
  const exportableTypes = [
    'video/mp4',
    'video/webm',
  ]
  
  if (exportableTypes.includes(file.type)) {
    return true
  }
  
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return ['.mp4', '.webm'].includes(ext)
}

/**
 * Check if video element can actually be drawn to canvas
 * This tests if the browser can decode the video
 */
export async function canVideoBeExported(video: HTMLVideoElement): Promise<boolean> {
  return new Promise((resolve) => {
    // If video has no dimensions, it can't be decoded
    if (!video.videoWidth || !video.videoHeight) {
      resolve(false)
      return
    }
    
    // Try to draw a frame to canvas
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(false)
        return
      }
      
      ctx.drawImage(video, 0, 0, 1, 1)
      
      // Check if we got actual pixel data (not blank)
      const imageData = ctx.getImageData(0, 0, 1, 1)
      const hasData = imageData.data.some(v => v !== 0)
      resolve(hasData)
    } catch {
      resolve(false)
    }
  })
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
