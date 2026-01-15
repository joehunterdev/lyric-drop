import { useState, useCallback, useRef, useEffect } from 'react'

import type { VideoState } from '@/types'
import { createVideoUrl, revokeVideoUrl, getVideoDuration, isValidVideoFile, logger } from '@/utils'

interface UseVideoPlayerReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  videoState: VideoState
  loadVideo: (file: File) => Promise<void>
  play: () => void
  pause: () => void
  togglePlayPause: () => void
  seek: (time: number) => void
  setCurrentTime: (time: number) => void
  reset: () => void
}

const initialVideoState: VideoState = {
  file: null,
  url: null,
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  isLoaded: false,
}

export function useVideoPlayer(): UseVideoPlayerReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoState, setVideoState] = useState<VideoState>(initialVideoState)
  
  // Clean up URL when component unmounts or video changes
  useEffect(() => {
    return () => {
      if (videoState.url) {
        revokeVideoUrl(videoState.url)
      }
    }
  }, [videoState.url])
  
  // Sync video element time with state
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    const handleTimeUpdate = () => {
      setVideoState(prev => ({
        ...prev,
        currentTime: video.currentTime,
      }))
    }
    
    const handlePlay = () => {
      setVideoState(prev => ({ ...prev, isPlaying: true }))
    }
    
    const handlePause = () => {
      setVideoState(prev => ({ ...prev, isPlaying: false }))
    }
    
    const handleEnded = () => {
      setVideoState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }))
    }
    
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [videoState.isLoaded])
  
  const loadVideo = useCallback(async (file: File) => {
    logger.info('Loading video:', file.name)
    
    if (!isValidVideoFile(file)) {
      throw new Error('Invalid video format. Please use MP4, WebM, or OGG.')
    }
    
    // Revoke previous URL if exists
    if (videoState.url) {
      revokeVideoUrl(videoState.url)
    }
    
    try {
      const duration = await getVideoDuration(file)
      const url = createVideoUrl(file)
      
      setVideoState({
        file,
        url,
        duration,
        currentTime: 0,
        isPlaying: false,
        isLoaded: true,
      })
      
      logger.info('Video loaded successfully:', { duration, size: file.size })
    } catch (error) {
      logger.error('Failed to load video:', error)
      throw error
    }
  }, [videoState.url])
  
  const play = useCallback(() => {
    const video = videoRef.current
    if (video && videoState.isLoaded) {
      video.play().catch(err => logger.error('Play failed:', err))
    }
  }, [videoState.isLoaded])
  
  const pause = useCallback(() => {
    const video = videoRef.current
    if (video) {
      video.pause()
    }
  }, [])
  
  const togglePlayPause = useCallback(() => {
    if (videoState.isPlaying) {
      pause()
    } else {
      play()
    }
  }, [videoState.isPlaying, play, pause])
  
  const seek = useCallback((time: number) => {
    const video = videoRef.current
    if (video && videoState.isLoaded) {
      const clampedTime = Math.max(0, Math.min(time, videoState.duration))
      video.currentTime = clampedTime
      setVideoState(prev => ({ ...prev, currentTime: clampedTime }))
    }
  }, [videoState.isLoaded, videoState.duration])
  
  const setCurrentTime = useCallback((time: number) => {
    seek(time)
  }, [seek])
  
  const reset = useCallback(() => {
    if (videoState.url) {
      revokeVideoUrl(videoState.url)
    }
    setVideoState(initialVideoState)
  }, [videoState.url])
  
  return {
    videoRef,
    videoState,
    loadVideo,
    play,
    pause,
    togglePlayPause,
    seek,
    setCurrentTime,
    reset,
  }
}
