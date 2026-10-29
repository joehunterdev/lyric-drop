import { cssFont } from '../fonts'
import { TextAlign, TextTransform } from '@/types/enums'
import type { LyricStyle } from '@/types'

/** Text shrinks to fit its box, but never below this fraction of the set size */
const MIN_FONT_SCALE = 0.5

/** The parts of a 2D context layout needs - lets tests use a stub */
export interface TextMeasurer {
  font: string
  letterSpacing?: string
  measureText(text: string): { width: number }
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface LaidOutLine {
  text: string
  width: number
  /** Left edge of the text */
  left: number
  /** Vertical centre of the line */
  centerY: number
}

export interface LyricLayout {
  font: string
  fontSize: number
  letterSpacing: number
  lineHeight: number
  /** Horizontal / vertical background padding in px */
  padding: number
  lines: LaidOutLine[]
  /** Bounding block around all lines, including padding */
  block: Rect
}

/**
 * Measure, wrap and position lyric text inside an area. Pure apart from
 * measuring, so it can be unit-tested and cached.
 *
 * @param scale frame shorter side / REFERENCE_SIZE
 */
export function layoutLyric(
  measurer: TextMeasurer,
  rawText: string,
  style: LyricStyle,
  area: Rect,
  scale: number
): LyricLayout {
  const { text: textStyle, background } = style
  const text = textStyle.transform === TextTransform.UPPERCASE ? rawText.toUpperCase() : rawText

  const baseFontSize = textStyle.fontSize * scale
  const padding = background.padding * scale
  const letterSpacing = textStyle.letterSpacing * scale

  if ('letterSpacing' in measurer) {
    measurer.letterSpacing = `${letterSpacing}px`
  }

  // Wrap to the area width; shrink the font until the text fits the area height
  let fontSize = Math.round(baseFontSize)
  let font = cssFont(textStyle.fontWeight, fontSize, textStyle.fontFamily)
  let lines: string[] = []
  for (;;) {
    font = cssFont(textStyle.fontWeight, fontSize, textStyle.fontFamily)
    measurer.font = font
    lines = wrapText(measurer, text, area.width - padding * 2)
    const blockHeight = lines.length * fontSize * textStyle.lineHeight + padding * 2
    const minSize = Math.ceil(baseFontSize * MIN_FONT_SCALE)
    if (!textStyle.autoFit || blockHeight <= area.height || fontSize <= minSize) break
    fontSize = Math.max(Math.round(fontSize * 0.92), minSize)
  }

  const lineHeight = fontSize * textStyle.lineHeight
  const widths = lines.map(line => measurer.measureText(line).width)
  const maxWidth = Math.max(0, ...widths)

  const blockWidth = maxWidth + padding * 2
  const blockHeight = lines.length * lineHeight + padding * 2
  const blockY = area.y + (area.height - blockHeight) / 2
  const blockX = textStyle.align === TextAlign.LEFT
    ? area.x
    : textStyle.align === TextAlign.RIGHT
      ? area.x + area.width - blockWidth
      : area.x + (area.width - blockWidth) / 2

  const laidOut = lines.map((line, index) => {
    const width = widths[index]
    const left = textStyle.align === TextAlign.LEFT
      ? blockX + padding
      : textStyle.align === TextAlign.RIGHT
        ? blockX + blockWidth - padding - width
        : blockX + (blockWidth - width) / 2
    return {
      text: line,
      width,
      left,
      centerY: blockY + padding + lineHeight * (index + 0.5),
    }
  })

  return {
    font,
    fontSize,
    letterSpacing,
    lineHeight,
    padding,
    lines: laidOut,
    block: { x: blockX, y: blockY, width: blockWidth, height: blockHeight },
  }
}

/**
 * Split text into lines that fit maxWidth, honouring explicit line breaks
 */
export function wrapText(measurer: TextMeasurer, text: string, maxWidth: number): string[] {
  const result: string[] = []

  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word
      if (line && measurer.measureText(candidate).width > maxWidth) {
        result.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    result.push(line)
  }

  return result
}
