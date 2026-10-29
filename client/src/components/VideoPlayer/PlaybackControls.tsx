import { Play, Pause, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatTime } from '@/utils'
import type { MediaState } from '@/types'

interface PlaybackControlsProps {
  mediaState: MediaState
  onTogglePlayPause: () => void
  onSeek: (time: number) => void
}

export function PlaybackControls({ mediaState, onTogglePlayPause, onSeek }: PlaybackControlsProps) {
  return (
    <div className="hidden lg:flex items-center justify-center gap-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onSeek(0)}
        title="Restart"
        className="hidden lg:inline-flex"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>

      <Button
        size="lg"
        onClick={onTogglePlayPause}
        className="hidden lg:inline-flex w-16 h-16 rounded-full"
      >
        {mediaState.isPlaying ? (
          <Pause className="w-6 h-6" />
        ) : (
          <Play className="w-6 h-6 ml-1" />
        )}
      </Button>

      <div className="text-sm font-mono text-muted-foreground min-w-[100px] text-center">
        {formatTime(mediaState.currentTime)} / {formatTime(mediaState.duration)}
      </div>
    </div>
  )
}
