import { SegmentType } from '@/types/enums'
import type { LyricSegment, LyricSection } from '@/types'

/** Shortest length a retimed line can get, in seconds */
const MIN_LINE_LENGTH = 0.3

/** Tolerance for float comparisons on segment/section boundaries */
const EPSILON = 1e-6

/** Beats per bar - lyrics are assumed to be in 4/4 */
const BEATS_PER_BAR = 4

const VOWEL_GROUPS = /[aeiouyáéíóúüàèìòùâêîôûäëïö]+/g

/**
 * Rough syllable count: vowel groups per word, minus a silent trailing "e".
 * Only ratios between lines matter, so consistent errors cancel out.
 */
export function countSyllables(text: string): number {
  return text.toLowerCase().split(/\s+/).reduce((total, raw) => {
    const word = raw.replace(/[^\p{L}']/gu, '')
    if (!word) return total

    let count = word.match(VOWEL_GROUPS)?.length ?? 0
    if (count > 1 && /[^l]e$/.test(word)) count--  // "raise", "take" - not "riddle"
    return total + Math.max(1, count)
  }, 0)
}

/**
 * Length of one bar in seconds at a given tempo (4/4)
 */
export function barLength(bpm: number): number {
  return (60 / bpm) * BEATS_PER_BAR
}

export interface RetimeOptions {
  /** 0 = every line the same length as the reference (locked to bars), 1 = fully proportional to syllables */
  cadence: number
  /** Optional tempo - line lengths snap to whole beats when set */
  bpm: number | null
  /** Media duration - the section can't grow past this */
  mediaDuration: number
}

export interface RetimeResult {
  /** Full segment list with the following lines retimed */
  segments: LyricSegment[]
  /** The reference line's section with its new end time */
  section: LyricSection
  reference: LyricSegment
  referenceSyllables: number
  /** Number of segments (lines + spacers) after the reference that were moved */
  retimedCount: number
  /** How much the section end moved, in seconds */
  sectionDelta: number
  /** Below 1 when lines had to be squeezed to fit before the next section / end of media */
  compression: number
}

/**
 * Find the section that contains a segment
 */
export function findSectionForSegment(
  sections: LyricSection[],
  segment: LyricSegment
): LyricSection | null {
  return sections.find(section =>
    segment.startTime >= section.startTime - EPSILON &&
    segment.endTime <= section.endTime + EPSILON
  ) ?? null
}

/**
 * Retime every segment after a reference line in its section, using the
 * reference's length as the "bar" and its syllable count as the cadence.
 *
 * - Lyric lines get: refLength × (1 − cadence + cadence × syllables / refSyllables),
 *   snapped to whole beats when a BPM is given
 * - Spacers keep their length
 * - Lines are laid end to end from the reference's end; the section end follows
 *   the last line, squeezing everything proportionally if it would run into the
 *   next section or past the end of the media
 *
 * Returns null if the segment isn't a lyric line inside a section.
 */
export function retimeFollowingSegments(
  segments: LyricSegment[],
  sections: LyricSection[],
  referenceId: string,
  { cadence, bpm, mediaDuration }: RetimeOptions
): RetimeResult | null {
  const reference = segments.find(seg => seg.id === referenceId)
  if (!reference || reference.type !== SegmentType.LYRIC) return null

  const section = findSectionForSegment(sections, reference)
  if (!section) return null

  const following = segments
    .filter(seg =>
      seg.id !== reference.id &&
      seg.startTime >= reference.endTime - EPSILON &&
      seg.endTime <= section.endTime + EPSILON
    )
    .sort((a, b) => a.startTime - b.startTime)

  const referenceLength = reference.endTime - reference.startTime
  const referenceSyllables = Math.max(1, countSyllables(reference.text))
  const beat = bpm && bpm > 0 ? 60 / bpm : null

  const lengths = following.map(seg => {
    if (seg.type === SegmentType.SPACER) {
      return seg.endTime - seg.startTime
    }

    const ratio = countSyllables(seg.text) / referenceSyllables
    let length = referenceLength * (1 - cadence + cadence * ratio)
    if (beat) {
      length = Math.max(1, Math.round(length / beat)) * beat
    }
    return Math.max(MIN_LINE_LENGTH, length)
  })

  // Latest the section may end: start of the next section, or the end of the media
  const nextSection = sections
    .filter(s => s.id !== section.id && s.startTime >= section.endTime - EPSILON)
    .sort((a, b) => a.startTime - b.startTime)[0]
  const maxEnd = Math.min(nextSection?.startTime ?? Infinity, mediaDuration || Infinity)

  const available = maxEnd - reference.endTime
  const total = lengths.reduce((sum, length) => sum + length, 0)
  const compression = total > available && available > 0 ? available / total : 1

  let cursor = reference.endTime
  const retimed = new Map<string, LyricSegment>()
  following.forEach((seg, index) => {
    const length = lengths[index] * compression
    retimed.set(seg.id, { ...seg, startTime: cursor, endTime: cursor + length })
    cursor += length
  })

  const newSectionEnd = following.length > 0 ? cursor : section.endTime

  return {
    segments: segments.map(seg => retimed.get(seg.id) ?? seg),
    section: { ...section, endTime: newSectionEnd },
    reference,
    referenceSyllables,
    retimedCount: following.length,
    sectionDelta: newSectionEnd - section.endTime,
    compression,
  }
}
