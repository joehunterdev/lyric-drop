import { useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, Upload, FileVideo } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { 
  formatTime, 
  validateVideoFile, 
  formatMaxFileSize,
  ALLOWED_VIDEO_EXTENSIONS,
  ALLOWED_VIDEO_TYPES,
} from '@/utils'
import type { VideoState, LyricSegment } from '@/types'

interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  videoState: VideoState
  activeSegment: LyricSegment | null
  onLoadVideo: (file: File) => Promise<void>
  onTogglePlayPause: () => void
  onSeek: (time: number) => void
}

export function VideoPlayer({
  videoRef,
  videoState,
  activeSegment,
  onLoadVideo,
  onTogglePlayPause,
  onSeek,
}: VideoPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    // Reset input FIRST so same file can be selected again
    e.target.value = ''
    
    if (!file) return
    
    // Validate file using config
    const validation = validateVideoFile(file)
    if (!validation.valid) {
      alert(`${validation.error}\n\nPlease convert your video using HandBrake (free) or an online converter like CloudConvert.`)
      return
    }
    
    await onLoadVideo(file)
  }, [onLoadVideo])
  
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])
  
  const handleRestart = useCallback(() => {
    onSeek(0)
  }, [onSeek])
  
  return (
    <div className="flex flex-col gap-4">
      {/* Video Container */}
      <div className="relative aspect-[9/16] max-h-[60vh] bg-black rounded-lg overflow-hidden">
        {videoState.url ? (
          <>
            <video
              ref={videoRef}
              src={videoState.url}
              className="w-full h-full object-contain"
              playsInline
            />
            
            {/* Lyric Overlay */}
            {activeSegment && (
              <div className="absolute inset-x-0 bottom-16 flex justify-center px-4">
                <div className="bg-black/70 text-white text-lg md:text-2xl font-bold px-6 py-3 rounded-lg text-center max-w-[90%]">
                  {activeSegment.text}
                </div>
              </div>
            )}
          </>
        ) : (
          <div 
            className="w-full h-full flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-card/50 transition-colors"
            onClick={handleUploadClick}
          >
            <Upload className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Click to upload video</p>
            <p className="text-sm text-muted-foreground mt-1">
              <FileVideo className="w-3 h-3 inline mr-1" />
              {ALLOWED_VIDEO_EXTENSIONS.join(', ')} only (max {formatMaxFileSize()})
            </p>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept={[...ALLOWED_VIDEO_TYPES, ...ALLOWED_VIDEO_EXTENSIONS].join(',')}
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
      
      {/* Playback Controls */}
      {videoState.isLoaded && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRestart}
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          <Button
            size="lg"
            onClick={onTogglePlayPause}
            className="w-16 h-16 rounded-full"
          >
            {videoState.isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </Button>
          
          <div className="text-sm font-mono text-muted-foreground min-w-[100px] text-center">
            {formatTime(videoState.currentTime)} / {formatTime(videoState.duration)}
          </div>
        </div>
      )}
    </div>
  )
}
