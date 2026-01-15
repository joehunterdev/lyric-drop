import { useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, Upload, FileVideo } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatTime } from '@/utils'
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
    
    // Only allow MP4 and WebM (formats that work with Canvas export)
    const ext = file.name.split('.').pop()?.toLowerCase()
    const isSupported = file.type === 'video/mp4' || file.type === 'video/webm' || ext === 'mp4' || ext === 'webm'
    
    if (!isSupported) {
      alert('Only MP4 and WebM formats are supported.\n\nPlease convert your video using HandBrake (free) or an online converter like CloudConvert.')
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
        {isTranscoding ? (
          // Transcoding State
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary" />
            <p className="text-lg font-medium">{progress.message}</p>
            {progress.progress > 0 && (
              <div className="mt-4 w-48">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                <p className="text-sm text-center mt-2">{progress.progress}%</p>
              </div>
            )}
          </div>
        ) : videoState.url ? (
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
            <p className="text-sm text-muted-foreground mt-1">MP4, MOV, WebM, AVI & more</p>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <FileVideo className="w-3 h-3" />
              Only MP4 and WebM formats supported
            </p>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,.mp4,.webm"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isTranscoding}
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
