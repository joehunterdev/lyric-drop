import { Play, Pause } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface StagePlayButtonProps {
  isPlaying: boolean
  onToggle: () => void
}

/**
 * Mobile-only play/pause button over the corner of the stage, so playback doesn't depend on
 * knowing that a tap on the preview toggles it. Desktop has PlaybackControls under the stage.
 */
export function StagePlayButton({ isPlaying, onToggle }: StagePlayButtonProps) {
  return (
    <Button
      size="icon"
      className="absolute bottom-2 left-2 z-10 h-11 w-11 rounded-full bg-black/60 text-primary shadow-md hover:bg-black/80 lg:hidden"
      aria-label={isPlaying ? 'Pause' : 'Play'}
      title={isPlaying ? 'Pause' : 'Play'}
      onClick={e => {
        // The stage itself toggles playback on tap - don't toggle twice
        e.stopPropagation()
        onToggle()
      }}
    >
      {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 ml-0.5" />}
    </Button>
  )
}
