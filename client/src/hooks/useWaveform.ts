import { useState, useEffect } from 'react'

import { decodeWaveform, MAX_WAVEFORM_FILE_SIZE, logger } from '@/utils'

export type WaveformStatus = 'idle' | 'loading' | 'ready' | 'error' | 'too-large'

export interface Waveform {
  status: WaveformStatus
  /** Loudness per slice (WAVEFORM_PEAKS_PER_SECOND), 0-1 */
  peaks: Float32Array | null
}

/**
 * Decode the loaded media's audio into a waveform for the timeline
 */
export function useWaveform(file: File | null): Waveform {
  const [result, setResult] = useState<{ file: File; waveform: Waveform } | null>(null)
  const tooLarge = !!file && file.size > MAX_WAVEFORM_FILE_SIZE

  useEffect(() => {
    if (!file || tooLarge) return
    let cancelled = false
    decodeWaveform(file)
      .then(peaks => {
        if (!cancelled) setResult({ file, waveform: { status: 'ready', peaks } })
      })
      .catch(error => {
        // e.g. a video with no audio track
        logger.warn('Could not decode waveform:', error)
        if (!cancelled) setResult({ file, waveform: { status: 'error', peaks: null } })
      })
    return () => { cancelled = true }
  }, [file, tooLarge])

  if (!file) return { status: 'idle', peaks: null }
  if (tooLarge) return { status: 'too-large', peaks: null }
  // A result for a previous file means the current one is still decoding
  return result?.file === file ? result.waveform : { status: 'loading', peaks: null }
}
