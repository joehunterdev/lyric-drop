import { describe, it, expect } from 'vitest'

import { computePeaks } from './waveform'

describe('computePeaks', () => {
  it('takes the loudest sample per slice and normalises to 1', () => {
    // 4 samples/second, 2 peaks/second -> 2 samples per slice
    const channel = new Float32Array([0.1, -0.2, 0.4, 0.1])
    const peaks = computePeaks([channel], 4, 2)
    expect(Array.from(peaks)).toEqual([0.5, 1])
  })

  it('uses the loudest channel', () => {
    const left = new Float32Array([0.1, 0.1])
    const right = new Float32Array([0.5, -0.8])
    const peaks = computePeaks([left, right], 2, 2)
    expect(Array.from(peaks).map(p => +p.toFixed(3))).toEqual([0.625, 1])
  })

  it('keeps a partial slice at the end', () => {
    const peaks = computePeaks([new Float32Array(5).fill(0.5)], 4, 2)
    expect(peaks.length).toBe(3)
  })

  it('handles silence and empty audio', () => {
    expect(Array.from(computePeaks([new Float32Array(4)], 4, 2))).toEqual([0, 0])
    expect(computePeaks([], 44100, 100).length).toBe(0)
  })
})
