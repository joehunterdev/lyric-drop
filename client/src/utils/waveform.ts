/** Loudness slices per second of audio - finer than the timeline's max zoom needs */
export const WAVEFORM_PEAKS_PER_SECOND = 100

/** Decoding reads the whole file into memory - skip the waveform above this */
export const MAX_WAVEFORM_FILE_SIZE = 300 * 1024 * 1024

/**
 * Reduce raw samples to the loudest value per slice (across all channels),
 * normalised so the loudest slice is 1
 */
export function computePeaks(
  channels: Float32Array[],
  sampleRate: number,
  peaksPerSecond: number
): Float32Array {
  const length = channels[0]?.length ?? 0
  const samplesPerPeak = sampleRate / peaksPerSecond
  const peaks = new Float32Array(Math.ceil(length / samplesPerPeak))

  let loudest = 0
  for (let i = 0; i < peaks.length; i++) {
    const start = Math.floor(i * samplesPerPeak)
    const end = Math.min(length, Math.floor((i + 1) * samplesPerPeak))
    let peak = 0
    for (const channel of channels) {
      for (let s = start; s < end; s++) {
        const value = Math.abs(channel[s])
        if (value > peak) peak = value
      }
    }
    peaks[i] = peak
    if (peak > loudest) loudest = peak
  }

  if (loudest > 0) {
    for (let i = 0; i < peaks.length; i++) peaks[i] /= loudest
  }
  return peaks
}

/**
 * Decode the audio track of a video or audio file into waveform peaks
 */
export async function decodeWaveform(file: File): Promise<Float32Array> {
  const data = await file.arrayBuffer()
  // An offline context decodes without needing a user gesture to start audio
  const context = new OfflineAudioContext(1, 1, 44100)
  const buffer = await context.decodeAudioData(data)
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i))
  return computePeaks(channels, buffer.sampleRate, WAVEFORM_PEAKS_PER_SECOND)
}
