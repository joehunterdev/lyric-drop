import { useState, useCallback, useRef, useEffect } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

import { Button } from '@/components/ui/button'
import { logger } from '@/utils'
import type { LyricSegment, ExportProgress } from '@/types'
import { ExportStatus } from '@/types'

interface ExportButtonProps {
  videoFile: File | null
  segments: LyricSegment[]
  disabled?: boolean
}

export function ExportButton({ videoFile, segments, disabled }: ExportButtonProps) {
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [progress, setProgress] = useState<ExportProgress>({
    status: ExportStatus.IDLE,
    progress: 0,
    message: '',
  })
  
  // Load FFmpeg on mount
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const ffmpeg = new FFmpeg()
        ffmpegRef.current = ffmpeg
        
        ffmpeg.on('progress', ({ progress }) => {
          setProgress(prev => ({
            ...prev,
            progress: Math.round(progress * 100),
          }))
        })
        
        ffmpeg.on('log', ({ message }) => {
          logger.debug('FFmpeg:', message)
        })
        
        // Load FFmpeg WASM binaries
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        })
        
        setIsLoaded(true)
        logger.info('FFmpeg loaded successfully')
      } catch (error) {
        logger.error('Failed to load FFmpeg:', error)
        setProgress({
          status: ExportStatus.ERROR,
          progress: 0,
          message: 'Failed to load video processor',
        })
      }
    }
    
    loadFFmpeg()
  }, [])
  
  const handleExport = useCallback(async () => {
    if (!videoFile || !ffmpegRef.current || segments.length === 0) return
    
    const ffmpeg = ffmpegRef.current
    
    try {
      setProgress({
        status: ExportStatus.PREPARING,
        progress: 0,
        message: 'Preparing video...',
      })
      
      // Write input video to FFmpeg filesystem
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))
      
      // Generate ASS subtitle content
      const assContent = generateASSSubtitles(segments)
      await ffmpeg.writeFile('subtitles.ass', assContent)
      
      setProgress({
        status: ExportStatus.PROCESSING,
        progress: 0,
        message: 'Adding lyrics overlay...',
      })
      
      // Run FFmpeg command to burn subtitles
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', 'ass=subtitles.ass',
        '-c:a', 'copy',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        'output.mp4',
      ])
      
      // Read output file
      const data = await ffmpeg.readFile('output.mp4')
      
      // Create download link - copy buffer to avoid SharedArrayBuffer issues
      const uint8Array = new Uint8Array(data as Uint8Array)
      const blob = new Blob([uint8Array.buffer], { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `lyric-overlay-${Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      // Cleanup FFmpeg filesystem
      await ffmpeg.deleteFile('input.mp4')
      await ffmpeg.deleteFile('subtitles.ass')
      await ffmpeg.deleteFile('output.mp4')
      
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
      
    } catch (error) {
      logger.error('Export failed:', error)
      setProgress({
        status: ExportStatus.ERROR,
        progress: 0,
        message: error instanceof Error ? error.message : 'Export failed',
      })
    }
  }, [videoFile, segments])
  
  const isProcessing = progress.status === ExportStatus.PREPARING || 
                       progress.status === ExportStatus.PROCESSING
  
  return (
    <div className="space-y-2">
      <Button
        onClick={handleExport}
        disabled={disabled || !isLoaded || !videoFile || segments.length === 0 || isProcessing}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {progress.message} ({progress.progress}%)
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Export Video
          </>
        )}
      </Button>
      
      {!isLoaded && (
        <p className="text-xs text-muted-foreground text-center">
          Loading video processor...
        </p>
      )}
      
      {progress.status === ExportStatus.ERROR && (
        <p className="text-xs text-destructive text-center">
          {progress.message}
        </p>
      )}
      
      {progress.status === ExportStatus.COMPLETE && (
        <p className="text-xs text-green-500 text-center">
          {progress.message}
        </p>
      )}
    </div>
  )
}

/**
 * Generate ASS (Advanced SubStation Alpha) subtitle format
 */
function generateASSSubtitles(segments: LyricSegment[]): string {
  const header = `[Script Info]
Title: Lyric Overlay
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,20,20,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`

  const events = segments.map(segment => {
    const start = formatASSTime(segment.startTime)
    const end = formatASSTime(segment.endTime)
    const text = segment.text.replace(/\n/g, '\\N')
    
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`
  }).join('\n')
  
  return header + events
}

/**
 * Format seconds to ASS time format (H:MM:SS.CC)
 */
function formatASSTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const centisecs = Math.floor((seconds % 1) * 100)
  
  return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`
}
