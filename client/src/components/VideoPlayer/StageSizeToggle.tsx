import { Minimize2, MoveHorizontal, Fullscreen } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StageSize } from '@/types'

interface StageSizeToggleProps {
  size: StageSize
  onChange: (size: StageSize) => void
}

const SIZE_ORDER = [StageSize.COMPACT, StageSize.WIDE, StageSize.COVER] as const

const SIZE_INFO = {
  [StageSize.COMPACT]: { label: 'Compact', Icon: Minimize2 },
  [StageSize.WIDE]: { label: 'Full width', Icon: MoveHorizontal },
  [StageSize.COVER]: { label: 'Fill (cropped)', Icon: Fullscreen },
} as const

/**
 * Mobile-only single button (sits with the zoom buttons) that cycles the preview
 * size: compact -> full width -> fill (cropped). The icon shows the current mode.
 */
export function StageSizeToggle({ size, onChange }: StageSizeToggleProps) {
  const next = SIZE_ORDER[(SIZE_ORDER.indexOf(size) + 1) % SIZE_ORDER.length]
  const { label, Icon } = SIZE_INFO[size]
  const title = `Preview size: ${label} (tap for ${SIZE_INFO[next].label})`

  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden"
      onClick={() => onChange(next)}
      aria-label={title}
      title={title}
    >
      <Icon className="w-4 h-4" />
    </Button>
  )
}
