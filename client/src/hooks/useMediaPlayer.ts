import { useState, useCallback, useRef, useEffect } from 'react'

import type { MediaState } from '@/types'
import {
  createVideoUrl,
  revokeVideoUrl,
  getVideoDuration,
  getAudioDuration,
  isValidVideoFile,
  validateAudioFile,
  logger,
} from '@/utils'

interface UseMediaPlayerReturn {
  /** Attach to the <video> or <audio> element that drives playback */
  mediaRef: React.RefObject<HTMLMediaElement | null>
  mediaState: MediaState
  loadVideo: (file: File) => Promise<void>
  loadAudio: (file: File) => Promise<void>
  play: () => void
  pause: () => void
  togglePlayPause: () => void
  seek: (time: number) => void
  setCurrentTime: (time: number) => void
  reset: () => void
}

const initialMediaState: MediaState = {
  file: null,
  url: null,
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  isLoaded: false,
}

/**
 * Playback state for a video or audio element - the clock for the timeline
 */
export function useMediaPlayer(): UseMediaPlayerReturn {
  const mediaRef = useRef<HTMLMediaElement | null>(null)
  const [mediaState, setMediaState] = useState<MediaState>(initialMediaState)

  // Clean up URL when component unmounts or media changes
  useEffect(() => {
    return () => {
      if (mediaState.url) {
        revokeVideoUrl(mediaState.url)
      }
    }
  }, [mediaState.url])

  // Sync media element time with state. Keyed on url so listeners re-bind
  // when the element swaps between <video> and <audio>.
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return

    const handleTimeUpdate = () => {
      setMediaState(prev => ({
        ...prev,
        currentTime: media.currentTime,
      }))
    }

    const handlePlay = () => {
      setMediaState(prev => ({ ...prev, isPlaying: true }))
    }

    const handlePause = () => {
      setMediaState(prev => ({ ...prev, isPlaying: false }))
    }

    const handleEnded = () => {
      setMediaState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }))
    }

    media.addEventListener('timeupdate', handleTimeUpdate)
    media.addEventListener('play', handlePlay)
    media.addEventListener('pause', handlePause)
    media.addEventListener('ended', handleEnded)

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate)
      media.removeEventListener('play', handlePlay)
      media.removeEventListener('pause', handlePause)
      media.removeEventListener('ended', handleEnded)
    }
  }, [mediaState.url])

  const loadMedia = useCallback(async (file: File, getDuration: (file: File) => Promise<number>) => {
    // Revoke previous URL if exists
    if (mediaState.url) {
      revokeVideoUrl(mediaState.url)
    }

    try {
      const duration = await getDuration(file)
      const url = createVideoUrl(file)

      setMediaState({
        file,
        url,
        duration,
        currentTime: 0,
        isPlaying: false,
        isLoaded: true,
      })

      logger.info('Media loaded successfully:', { duration, size: file.size })
    } catch (error) {
      logger.error('Failed to load media:', error)
      throw error
    }
  }, [mediaState.url])

  const loadVideo = useCallback(async (file: File) => {
    logger.info('Loading video:', file.name)

    if (!isValidVideoFile(file)) {
      throw new Error('Invalid video format. Please use MP4, WebM, or OGG.')
    }

    await loadMedia(file, getVideoDuration)
  }, [loadMedia])

  const loadAudio = useCallback(async (file: File) => {
    logger.info('Loading audio:', file.name)

    const validation = validateAudioFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    await loadMedia(file, getAudioDuration)
  }, [loadMedia])

  const play = useCallback(() => {
    const media = mediaRef.current
    if (media && mediaState.isLoaded) {
      media.play().catch(err => logger.error('Play failed:', err))
    }
  }, [mediaState.isLoaded])

  const pause = useCallback(() => {
    const media = mediaRef.current
    if (media) {
      media.pause()
    }
  }, [])

  const togglePlayPause = useCallback(() => {
    if (mediaState.isPlaying) {
      pause()
    } else {
      play()
    }
  }, [mediaState.isPlaying, play, pause])

  const seek = useCallback((time: number) => {
    const media = mediaRef.current
    if (media && mediaState.isLoaded) {
      const clampedTime = Math.max(0, Math.min(time, mediaState.duration))
      media.currentTime = clampedTime
      setMediaState(prev => ({ ...prev, currentTime: clampedTime }))
    }
  }, [mediaState.isLoaded, mediaState.duration])

  const setCurrentTime = useCallback((time: number) => {
    seek(time)
  }, [seek])

  const reset = useCallback(() => {
    mediaRef.current?.pause()
    if (mediaState.url) {
      revokeVideoUrl(mediaState.url)
    }
    setMediaState(initialMediaState)
  }, [mediaState.url])

  return {
    mediaRef,
    mediaState,
    loadVideo,
    loadAudio,
    play,
    pause,
    togglePlayPause,
    seek,
    setCurrentTime,
    reset,
  }
}
