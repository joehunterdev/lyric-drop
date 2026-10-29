import { useRef, useCallback } from 'react'
import { Upload, FileVideo } from 'lucide-react'

import { PlaybackControls } from './PlaybackControls'
import {
  formatMaxFileSize,
  ALLOWED_VIDEO_EXTENSIONS,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_TYPES,
} from '@/utils'
import type { MediaState, LyricSegment } from '@/types'

interface VideoPlayerProps {
  mediaRef: React.RefObject<HTMLMediaElement | null>
  mediaState: MediaState
  activeSegment: LyricSegment | null
  /** Takes a video or an image - an image switches to image mode */
  onLoadFile: (file: File) => Promise<void>
  onTogglePlayPause: () => void
  onSeek: (time: number) => void
}

export function VideoPlayer({
  mediaRef,
  mediaState,
  activeSegment,
  onLoadFile,
  onTogglePlayPause,
  onSeek,
}: VideoPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    // Reset input FIRST so same file can be selected again
    e.target.value = ''
    
    if (!file) return

    try {
      await onLoadFile(file)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to load file')
    }
  }, [onLoadFile])
  
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])
  
  return (
    <div className="flex flex-col gap-4">
      {/* Video Container */}
      <div className="relative aspect-[9/16] max-h-[60vh] bg-black rounded-lg overflow-hidden">
        {mediaState.url ? (
          <>
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement | null>}
              src={mediaState.url}
              className="w-full h-full object-contain"
              playsInline
            />
            
            {/* Lyric Drop */}
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
            <p className="text-lg font-medium">Click to upload video or image</p>
            <p className="text-sm text-muted-foreground mt-1">
              <FileVideo className="w-3 h-3 inline mr-1" />
              {[...ALLOWED_VIDEO_EXTENSIONS, ...ALLOWED_IMAGE_EXTENSIONS].join(', ')} (max {formatMaxFileSize()})
            </p>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept={[
            ...ALLOWED_VIDEO_TYPES, ...ALLOWED_VIDEO_EXTENSIONS,
            ...ALLOWED_IMAGE_TYPES, ...ALLOWED_IMAGE_EXTENSIONS,
          ].join(',')}
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
      
      {/* Playback Controls */}
      {mediaState.isLoaded && (
        <PlaybackControls
          mediaState={mediaState}
          onTogglePlayPause={onTogglePlayPause}
          onSeek={onSeek}
        />
      )}
    </div>
  )
}
