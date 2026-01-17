import { useState, useCallback, useRef } from 'react'

import { 
  logger, 
  canVideoBeExported,
  EXPORT_BITRATE,
  EXPORT_FRAMERATE,
  LYRIC_FONT_SIZE_PERCENT,
  LYRIC_BG_OPACITY,
} from '@/utils'
import { ExportStatus } from '@/types/enums'
import type { LyricSegment, ExportProgress } from '@/types'

interface UseCanvasExportOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  segments: LyricSegment[]
}

interface UseCanvasExportReturn {
  exportVideo: () => Promise<void>
  cancelExport: () => void
  progress: ExportProgress
}

/**
 * Hook for exporting video with Lyric Drops using Canvas + MediaRecorder
 * This approach exports in real-time (30s video = ~30s export) without slow WASM transcoding
 */
export function useCanvasExport({ 
  videoRef, 
  segments 
}: UseCanvasExportOptions): UseCanvasExportReturn {
  const [progress, setProgress] = useState<ExportProgress>({
    status: ExportStatus.IDLE,
    progress: 0,
    message: '',
  })
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isExportingRef = useRef(false)

  /**
   * Find active segment at a given time
   */
  const getActiveSegment = useCallback((currentTime: number): LyricSegment | null => {
    return segments.find(
      segment => currentTime >= segment.startTime && currentTime <= segment.endTime
    ) || null
  }, [segments])

  /**
   * Draw video frame with Lyric Drop to canvas
   */
  const drawFrame = useCallback((
    ctx: CanvasRenderingContext2D, 
    video: HTMLVideoElement,
    width: number,
    height: number
  ) => {
    // Draw video frame
    ctx.drawImage(video, 0, 0, width, height)
    
    // Get active lyric
    const activeSegment = getActiveSegment(video.currentTime)
    
    if (activeSegment) {
      // Calculate font size relative to video height (from config)
      const fontSize = Math.round(height * (LYRIC_FONT_SIZE_PERCENT / 100))
      const padding = Math.round(height * 0.02)
      const bottomMargin = Math.round(height * 0.12) // Position above bottom
      
      ctx.font = `bold ${fontSize}px Arial, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Measure text for background
      const text = activeSegment.text
      const lines = text.split('\n')
      const lineHeight = fontSize * 1.3
      const maxWidth = lines.reduce((max, line) => {
        const metrics = ctx.measureText(line)
        return Math.max(max, metrics.width)
      }, 0)
      
      const boxWidth = maxWidth + padding * 2
      const boxHeight = lines.length * lineHeight + padding * 2
      const boxX = (width - boxWidth) / 2
      const boxY = height - bottomMargin - boxHeight
      
      // Draw semi-transparent background (from config)
      ctx.fillStyle = `rgba(0, 0, 0, ${LYRIC_BG_OPACITY})`
      ctx.beginPath()
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8)
      ctx.fill()
      
      // Draw text
      ctx.fillStyle = '#ffffff'
      lines.forEach((line, index) => {
        const y = boxY + padding + lineHeight * 0.5 + index * lineHeight
        ctx.fillText(line, width / 2, y)
      })
    }
  }, [getActiveSegment])

  /**
   * Start export process
   */
  const exportVideo = useCallback(async () => {
    const video = videoRef.current
    
    console.log('[Export] Starting export...', { video: !!video, segments: segments.length })
    
    if (!video) {
      console.error('[Export] No video element')
      setProgress({
        status: ExportStatus.ERROR,
        progress: 0,
        message: 'No video loaded',
      })
      return
    }
    
    if (segments.length === 0) {
      console.error('[Export] No segments')
      setProgress({
        status: ExportStatus.ERROR,
        progress: 0,
        message: 'No lyrics to export',
      })
      return
    }

    isExportingRef.current = true

    try {
      setProgress({
        status: ExportStatus.PREPARING,
        progress: 0,
        message: 'Preparing export...',
      })

      // Get video dimensions
      const width = video.videoWidth
      const height = video.videoHeight
      const duration = video.duration

      console.log('[Export] Video dimensions:', { width, height, duration })

      if (!width || !height || !duration) {
        throw new Error('Video not properly loaded - missing dimensions or duration')
      }

      // Check if video can be drawn to canvas (codec compatibility)
      const canExport = await canVideoBeExported(video)
      console.log('[Export] Can video be exported:', canExport)
      
      if (!canExport) {
        throw new Error('This video format cannot be exported. Please convert to MP4 (H.264) first. Try HandBrake (free) or an online converter.')
      }

      logger.info('Starting canvas export', { width, height, duration })

      // Create canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvasRef.current = canvas

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      // Create MediaRecorder with configured framerate
      const stream = canvas.captureStream(EXPORT_FRAMERATE)
      
      // Add audio track if video has audio
      const audioTracks = (video as HTMLVideoElement & { captureStream?: () => MediaStream })
        .captureStream?.()?.getAudioTracks()
      
      if (audioTracks && audioTracks.length > 0) {
        audioTracks.forEach(track => stream.addTrack(track))
      }

      // Determine best supported format
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm'

      logger.info('Using MIME type:', mimeType)
      logger.info('Export settings:', { bitrate: EXPORT_BITRATE, framerate: EXPORT_FRAMERATE })

      const chunks: Blob[] = []
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: EXPORT_BITRATE,
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
          console.log('[Export] Chunk received:', e.data.size, 'bytes')
        }
      }

      mediaRecorder.onstop = () => {
        console.log('[Export] MediaRecorder stopped, chunks:', chunks.length)
        
        if (!isExportingRef.current) {
          // Export was cancelled
          setProgress({
            status: ExportStatus.IDLE,
            progress: 0,
            message: '',
          })
          return
        }

        // Create download
        const blob = new Blob(chunks, { type: mimeType })
        console.log('[Export] Created blob:', blob.size, 'bytes')
        
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `lyric-overlay-${Date.now()}.webm`
        a.style.display = 'none'
        document.body.appendChild(a)
        
        console.log('[Export] Triggering download...')
        a.click()
        
        // Mark export as complete
        isExportingRef.current = false
        
        // Small delay before cleanup
        setTimeout(() => {
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }, 100)

        logger.info('Export complete', { size: blob.size })

        setProgress({
          status: ExportStatus.COMPLETE,
          progress: 100,
          message: 'Export complete!',
        })

        // Reset after 3 seconds
        setTimeout(() => {
          setProgress({
            status: ExportStatus.IDLE,
            progress: 0,
            message: '',
          })
        }, 3000)
      }

      mediaRecorder.onerror = (e) => {
        logger.error('MediaRecorder error:', e)
        setProgress({
          status: ExportStatus.ERROR,
          progress: 0,
          message: 'Recording failed',
        })
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms

      setProgress({
        status: ExportStatus.PROCESSING,
        progress: 0,
        message: 'Recording... 0%',
      })

      // Rewind video and play
      video.currentTime = 0
      
      console.log('[Export] Starting video playback...')
      
      try {
        await video.play()
        console.log('[Export] Video playing')
      } catch (playError) {
        console.error('[Export] Video play failed:', playError)
        throw new Error('Could not play video - check browser autoplay settings')
      }

      // Animation loop - draw frames to canvas
      const renderLoop = () => {
        if (!isExportingRef.current) return

        drawFrame(ctx, video, width, height)

        // Update progress
        const progressPercent = Math.round((video.currentTime / duration) * 100)
        setProgress(prev => ({
          ...prev,
          progress: progressPercent,
          message: `Recording... ${progressPercent}%`,
        }))

        // Check if video ended
        if (video.ended || video.currentTime >= duration) {
          console.log('[Export] Video ended, stopping recorder')
          video.pause()
          mediaRecorder.stop()
          // Don't set isExportingRef.current = false here!
          // The onstop callback needs it to be true to trigger download
          return
        }

        animationFrameRef.current = requestAnimationFrame(renderLoop)
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop)

    } catch (error) {
      logger.error('Export failed:', error)
      isExportingRef.current = false
      setProgress({
        status: ExportStatus.ERROR,
        progress: 0,
        message: error instanceof Error ? error.message : 'Export failed',
      })
    }
  }, [videoRef, segments, drawFrame])

  /**
   * Cancel ongoing export
   */
  const cancelExport = useCallback(() => {
    isExportingRef.current = false

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (videoRef.current) {
      videoRef.current.pause()
    }

    setProgress({
      status: ExportStatus.IDLE,
      progress: 0,
      message: '',
    })

    logger.info('Export cancelled')
  }, [videoRef])

  return {
    exportVideo,
    cancelExport,
    progress,
  }
}
