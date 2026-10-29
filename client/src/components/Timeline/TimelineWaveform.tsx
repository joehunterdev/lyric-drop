import { useRef, useEffect } from 'react'

import { WAVEFORM_PEAKS_PER_SECOND } from '@/utils'
import type { Waveform, WaveformStatus } from '@/hooks'

/** Browsers cap canvas width, so long/zoomed timelines are drawn in tiles */
const TILE_WIDTH = 4000
const HEIGHT = 40
const COLOR = 'rgba(148, 163, 184, 0.6)'

const STATUS_LABELS: Partial<Record<WaveformStatus, string>> = {
  loading: 'Analysing audio…',
  error: 'No waveform - couldn\'t read the audio',
  'too-large': 'No waveform - file too large to analyse',
}

interface TimelineWaveformProps {
  waveform: Waveform
  pixelsPerSecond: number
  /** Full timeline width in pixels */
  width: number
}

/**
 * Read-only loudness lane to line section/segment edges up against
 */
export function TimelineWaveform({ waveform, pixelsPerSecond, width }: TimelineWaveformProps) {
  const { peaks } = waveform

  if (!peaks) {
    const label = STATUS_LABELS[waveform.status]
    return label ? (
      <span className="sticky left-2 inline-block px-2 text-[10px] text-muted-foreground leading-[40px]">{label}</span>
    ) : null
  }

  const tileStarts = Array.from({ length: Math.ceil(width / TILE_WIDTH) }, (_, i) => i * TILE_WIDTH)
  return (
    <>
      {tileStarts.map(left => (
        <WaveformTile
          key={left}
          peaks={peaks}
          pixelsPerSecond={pixelsPerSecond}
          left={left}
          width={Math.min(TILE_WIDTH, width - left)}
        />
      ))}
    </>
  )
}

interface WaveformTileProps {
  peaks: Float32Array
  pixelsPerSecond: number
  left: number
  width: number
}

function WaveformTile({ peaks, pixelsPerSecond, left, width }: WaveformTileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, HEIGHT)
    ctx.fillStyle = COLOR

    // One bar per pixel column, mirrored around the middle
    const peaksPerPixel = WAVEFORM_PEAKS_PER_SECOND / pixelsPerSecond
    for (let x = 0; x < width; x++) {
      const from = Math.floor((left + x) * peaksPerPixel)
      if (from >= peaks.length) break
      const to = Math.min(peaks.length, Math.max(from + 1, Math.floor((left + x + 1) * peaksPerPixel)))

      let peak = 0
      for (let i = from; i < to; i++) {
        if (peaks[i] > peak) peak = peaks[i]
      }
      const barHeight = Math.max(1, peak * (HEIGHT - 4))
      ctx.fillRect(x, (HEIGHT - barHeight) / 2, 1, barHeight)
    }
  }, [peaks, pixelsPerSecond, left, width])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={HEIGHT}
      className="absolute top-0"
      style={{ left, width, height: HEIGHT }}
    />
  )
}
