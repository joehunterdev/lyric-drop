import { useState, useCallback, useRef } from 'react'

import {
  logger,
  canVideoBeExported,
  findActiveSegment,
  renderFrame,
  EXPORT_BITRATE,
  EXPORT_FRAMERATE,
  OUTPUT_FORMATS,
} from '@/utils'
import { ExportStatus } from '@/types/enums'
import type { ImageFit, OutputFormat } from '@/types/enums'
import type { LyricSegment, ExportProgress, ImageBackground, FrameBackground, LyricBox } from '@/types'

/**
 * What the export draws behind the lyrics
 */
export type ExportSource =
  | { kind: 'video' }
  | { kind: 'image'; image: ImageBackground | null; format: OutputFormat; fit: ImageFit; box: LyricBox }

interface UseCanvasExportOptions {
  /** The <video> (video mode) or <audio> (image mode) element driving playback */
  mediaRef: React.RefObject<HTMLMediaElement | null>
  segments: LyricSegment[]
  source: ExportSource
}

interface AudioGraph {
  context: AudioContext
  destination: MediaStreamAudioDestinationNode
}

/**
 * Web Audio graphs per media element. createMediaElementSource can only be
 * called once per element, so the graph is built once and reused.
 */
const audioGraphs = new WeakMap<HTMLMediaElement, AudioGraph>()

/**
 * Get a recordable audio track for a media element via Web Audio.
 * Works for <audio> in all major browsers (element.captureStream doesn't).
 */
async function captureMediaAudio(media: HTMLMediaElement): Promise<MediaStreamTrack[]> {
  let graph = audioGraphs.get(media)
  if (!graph) {
    const context = new AudioContext()
    const source = context.createMediaElementSource(media)
    const destination = context.createMediaStreamDestination()
    // Once routed through Web Audio the element is silent unless connected to the speakers
    source.connect(context.destination)
    source.connect(destination)
    graph = { context, destination }
    audioGraphs.set(media, graph)
  }
  await graph.context.resume()
  return graph.destination.stream.getAudioTracks()
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
  mediaRef,
  segments,
  source,
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
   * Start export process
   */
  const exportVideo = useCallback(async () => {
    const media = mediaRef.current
    const isImage = source.kind === 'image'

    console.log('[Export] Starting export...', { source: source.kind, media: !!media, segments: segments.length })

    if (!media) {
      console.error('[Export] No media element')
      setProgress({
        status: ExportStatus.ERROR,
        progress: 0,
        message: isImage ? 'No audio loaded' : 'No video loaded',
      })
      return
    }

    if (isImage && !source.image) {
      setProgress({
        status: ExportStatus.ERROR,
        progress: 0,
        message: 'No image loaded',
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

      // Output size: fixed per format for images, native size for video
      let width: number
      let height: number
      let background: FrameBackground

      if (source.kind === 'image') {
        ;({ width, height } = OUTPUT_FORMATS[source.format])
        background = { kind: 'image', source: source.image!.bitmap, fit: source.fit }
      } else {
        if (!(media instanceof HTMLVideoElement)) {
          throw new Error('No video loaded')
        }
        width = media.videoWidth
        height = media.videoHeight
        background = { kind: 'video', source: media }
      }
      const duration = media.duration

      console.log('[Export] Output dimensions:', { width, height, duration })

      if (!width || !height || !duration) {
        throw new Error('Media not properly loaded - missing dimensions or duration')
      }

      if (background.kind === 'video') {
        // Check if video can be drawn to canvas (codec compatibility)
        const canExport = await canVideoBeExported(background.source)
        console.log('[Export] Can video be exported:', canExport)

        if (!canExport) {
          throw new Error('This video format cannot be exported. Please convert to MP4 (H.264) first. Try HandBrake (free) or an online converter.')
        }
      }

      logger.info('Starting canvas export', { source: source.kind, width, height, duration })

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
      
      // Add audio track - image mode records the <audio> element via Web Audio
      const audioTracks = isImage
        ? await captureMediaAudio(media)
        : (media as HTMLMediaElement & { captureStream?: () => MediaStream })
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
        a.download = source.kind === 'image'
          ? `lyric-drop-${source.format}-${Date.now()}.webm`
          : `lyric-overlay-${Date.now()}.webm`
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

      // Rewind media and play
      media.currentTime = 0

      console.log('[Export] Starting playback...')

      try {
        await media.play()
        console.log('[Export] Media playing')
      } catch (playError) {
        console.error('[Export] Media play failed:', playError)
        throw new Error('Could not play media - check browser autoplay settings')
      }

      const box = source.kind === 'image' ? source.box : undefined

      // Animation loop - draw frames to canvas. Redraw every frame even for a
      // still image: captureStream only emits frames when the canvas is painted.
      const renderLoop = () => {
        if (!isExportingRef.current) return

        const activeSegment = findActiveSegment(segments, media.currentTime)
        renderFrame(ctx, width, height, {
          background,
          text: activeSegment?.text ?? null,
          box,
        })

        // Update progress
        const progressPercent = Math.round((media.currentTime / duration) * 100)
        setProgress(prev => ({
          ...prev,
          progress: progressPercent,
          message: `Recording... ${progressPercent}%`,
        }))

        // Check if media ended
        if (media.ended || media.currentTime >= duration) {
          console.log('[Export] Media ended, stopping recorder')
          media.pause()
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
  }, [mediaRef, segments, source])

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

    if (mediaRef.current) {
      mediaRef.current.pause()
    }

    setProgress({
      status: ExportStatus.IDLE,
      progress: 0,
      message: '',
    })

    logger.info('Export cancelled')
  }, [mediaRef])

  return {
    exportVideo,
    cancelExport,
    progress,
  }
}
