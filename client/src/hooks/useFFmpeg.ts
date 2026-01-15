import { useState, useCallback, useRef } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

import { logger } from '@/utils'

export const TranscodeStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  TRANSCODING: 'transcoding',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const
export type TranscodeStatus = (typeof TranscodeStatus)[keyof typeof TranscodeStatus]

interface TranscodeProgress {
  status: TranscodeStatus
  progress: number
  message: string
}

interface UseFFmpegReturn {
  isLoaded: boolean
  isLoading: boolean
  progress: TranscodeProgress
  loadFFmpeg: () => Promise<boolean>
  transcodeToMp4: (file: File) => Promise<File | null>
  isFormatSupported: (file: File) => boolean
}

// Formats that browsers can play natively
const NATIVE_FORMATS = ['video/mp4', 'video/webm', 'video/ogg']

export function useFFmpeg(): UseFFmpegReturn {
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<TranscodeProgress>({
    status: TranscodeStatus.IDLE,
    progress: 0,
    message: '',
  })

  // Load FFmpeg WASM
  const loadFFmpeg = useCallback(async (): Promise<boolean> => {
    if (isLoaded) return true
    if (isLoading) return false

    setIsLoading(true)
    setProgress({
      status: TranscodeStatus.LOADING,
      progress: 0,
      message: 'Loading video processor...',
    })

    try {
      const ffmpeg = new FFmpeg()
      ffmpegRef.current = ffmpeg

      ffmpeg.on('progress', ({ progress: p }) => {
        setProgress(prev => ({
          ...prev,
          progress: Math.round(p * 100),
        }))
      })

      ffmpeg.on('log', ({ message }) => {
        logger.debug('FFmpeg:', message)
      })

      // Load FFmpeg WASM binaries from CDN
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })

      setIsLoaded(true)
      setIsLoading(false)
      setProgress({
        status: TranscodeStatus.READY,
        progress: 100,
        message: 'Video processor ready',
      })

      logger.info('FFmpeg loaded successfully')
      return true
    } catch (error) {
      logger.error('Failed to load FFmpeg:', error)
      setIsLoading(false)
      setProgress({
        status: TranscodeStatus.ERROR,
        progress: 0,
        message: 'Failed to load video processor',
      })
      return false
    }
  }, [isLoaded, isLoading])

  // Check if format is natively supported
  const isFormatSupported = useCallback((file: File): boolean => {
    // Check MIME type first
    if (NATIVE_FORMATS.includes(file.type)) {
      return true
    }

    // Fallback to extension check for files with empty/generic MIME types
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (['.mp4', '.webm', '.ogg'].includes(ext)) {
      return true
    }

    return false
  }, [])

  // Transcode video to MP4
  const transcodeToMp4 = useCallback(async (file: File): Promise<File | null> => {
    // Ensure FFmpeg is loaded
    if (!ffmpegRef.current) {
      const loaded = await loadFFmpeg()
      if (!loaded) return null
    }

    const ffmpeg = ffmpegRef.current!

    try {
      setProgress({
        status: TranscodeStatus.TRANSCODING,
        progress: 0,
        message: 'Converting video...',
      })

      // Get input file extension
      const inputExt = file.name.split('.').pop()?.toLowerCase() || 'mov'
      const inputName = `input.${inputExt}`
      const outputName = 'output.mp4'

      // Write input file to FFmpeg filesystem
      await ffmpeg.writeFile(inputName, await fetchFile(file))

      setProgress(prev => ({
        ...prev,
        message: 'Transcoding to MP4...',
      }))

      // Transcode to MP4 with H.264
      // Using fast preset for speed, CRF 23 for decent quality
      await ffmpeg.exec([
        '-i', inputName,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',  // Enable streaming
        outputName,
      ])

      // Read output file
      const data = await ffmpeg.readFile(outputName)

      // Cleanup FFmpeg filesystem
      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(outputName)

      // Create new File object
      const uint8Array = new Uint8Array(data as Uint8Array)
      const blob = new Blob([uint8Array.buffer], { type: 'video/mp4' })
      const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.mp4'
      const transcodedFile = new File([blob], newFileName, { type: 'video/mp4' })

      setProgress({
        status: TranscodeStatus.COMPLETE,
        progress: 100,
        message: 'Conversion complete!',
      })

      logger.info('Transcode complete:', {
        original: file.name,
        originalSize: file.size,
        newSize: transcodedFile.size,
      })

      return transcodedFile
    } catch (error) {
      logger.error('Transcode failed:', error)
      setProgress({
        status: TranscodeStatus.ERROR,
        progress: 0,
        message: error instanceof Error ? error.message : 'Conversion failed',
      })
      return null
    }
  }, [loadFFmpeg])

  return {
    isLoaded,
    isLoading,
    progress,
    loadFFmpeg,
    transcodeToMp4,
    isFormatSupported,
  }
}
