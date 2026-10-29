import { describe, it, expect } from 'vitest'

import { layoutLyric, wrapText, type TextMeasurer } from './layoutLyric'
import { DEFAULT_LYRIC_STYLE } from './styleDefaults'
import { BackgroundMode, TextAlign, TextTransform } from '@/types/enums'
import type { LyricStyle } from '@/types'

/** Stub measurer: every character is half the font size wide */
function stubMeasurer(): TextMeasurer {
  return {
    font: '',
    measureText(text: string) {
      const size = Number(this.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 10)
      return { width: text.length * size * 0.5 }
    },
  }
}

const AREA = { x: 0, y: 0, width: 1000, height: 400 }

function withText(overrides: Partial<LyricStyle['text']>): LyricStyle {
  return { ...DEFAULT_LYRIC_STYLE, text: { ...DEFAULT_LYRIC_STYLE.text, ...overrides } }
}

describe('wrapText', () => {
  it('keeps explicit line breaks', () => {
    const measurer = stubMeasurer()
    measurer.font = '700 10px Arial'
    expect(wrapText(measurer, 'one\ntwo', 1000)).toEqual(['one', 'two'])
  })

  it('wraps words that overflow the width', () => {
    const measurer = stubMeasurer()
    measurer.font = '700 10px Arial'
    // 5px per char: "aaaa bbbb" = 45px > 30px
    expect(wrapText(measurer, 'aaaa bbbb', 30)).toEqual(['aaaa', 'bbbb'])
  })
})

describe('layoutLyric', () => {
  it('uses the style font size at reference scale', () => {
    const layout = layoutLyric(stubMeasurer(), 'Hello', DEFAULT_LYRIC_STYLE, AREA, 1)
    expect(layout.fontSize).toBe(54)
    expect(layout.font).toContain('"Arial"')
  })

  it('scales sizes with the frame', () => {
    const layout = layoutLyric(stubMeasurer(), 'Hello', DEFAULT_LYRIC_STYLE, AREA, 0.5)
    expect(layout.fontSize).toBe(27)
    expect(layout.padding).toBe(11)
  })

  it('centres the block in the area by default', () => {
    const layout = layoutLyric(stubMeasurer(), 'Hello', DEFAULT_LYRIC_STYLE, AREA, 1)
    const centre = layout.block.x + layout.block.width / 2
    expect(centre).toBeCloseTo(AREA.width / 2)
    expect(layout.block.y + layout.block.height / 2).toBeCloseTo(AREA.height / 2)
  })

  it('aligns left and right inside the area', () => {
    const left = layoutLyric(stubMeasurer(), 'Hi', withText({ align: TextAlign.LEFT }), AREA, 1)
    const right = layoutLyric(stubMeasurer(), 'Hi', withText({ align: TextAlign.RIGHT }), AREA, 1)
    expect(left.block.x).toBe(0)
    expect(right.block.x + right.block.width).toBeCloseTo(AREA.width)
  })

  it('uppercases when the transform is set', () => {
    const layout = layoutLyric(stubMeasurer(), 'raise the banners', withText({ transform: TextTransform.UPPERCASE }), AREA, 1)
    expect(layout.lines[0].text).toBe('RAISE THE BANNERS')
  })

  it('shrinks text to fit the box height when auto-fit is on', () => {
    const tall = 'word '.repeat(80)
    const small = { ...AREA, height: 150 }
    const fitted = layoutLyric(stubMeasurer(), tall, DEFAULT_LYRIC_STYLE, small, 1)
    const unfitted = layoutLyric(stubMeasurer(), tall, withText({ autoFit: false }), small, 1)
    expect(fitted.fontSize).toBeLessThan(54)
    expect(fitted.fontSize).toBeGreaterThanOrEqual(27)
    expect(unfitted.fontSize).toBe(54)
  })

  it('padding still insets text with no background', () => {
    const style = { ...DEFAULT_LYRIC_STYLE, background: { ...DEFAULT_LYRIC_STYLE.background, mode: BackgroundMode.NONE } }
    const layout = layoutLyric(stubMeasurer(), 'Hi', style, AREA, 1)
    expect(layout.lines[0].left).toBeCloseTo(layout.block.x + layout.padding)
  })
})
