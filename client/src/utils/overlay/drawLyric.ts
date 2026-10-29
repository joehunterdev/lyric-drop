import { layoutLyric } from './layoutLyric'
import { REFERENCE_SIZE } from './styleDefaults'
import { BackgroundMode } from '@/types/enums'
import type { LyricLayout, Rect } from './layoutLyric'
import type { LyricStyle, LyricBox } from '@/types'

/** Layouts are reused across frames - at 30 fps the same line is drawn many times */
const layoutCache = new Map<string, LyricLayout>()
const MAX_CACHED_LAYOUTS = 64

/** Bumped whenever fonts finish loading, so layouts measured with a fallback font are redone */
let fontsVersion = 0
if (typeof document !== 'undefined' && document.fonts) {
  document.fonts.addEventListener('loadingdone', () => {
    fontsVersion++
    layoutCache.clear()
  })
}

/**
 * "#rrggbb" + opacity → "rgba(r, g, b, a)"
 */
export function hexToRgba(hex: string, opacity: number): string {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function getLayout(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: LyricStyle,
  area: Rect,
  scale: number
): LyricLayout {
  const key = JSON.stringify([fontsVersion, text, style.text, style.background.padding, area, scale])
  let layout = layoutCache.get(key)
  if (!layout) {
    layout = layoutLyric(ctx, text, style, area, scale)
    if (layoutCache.size >= MAX_CACHED_LAYOUTS) layoutCache.clear()
    layoutCache.set(key, layout)
  }
  return layout
}

/**
 * Draw a styled lyric inside a lyric box
 */
export function drawStyledLyric(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  style: LyricStyle,
  box: LyricBox
): void {
  const scale = Math.min(width, height) / REFERENCE_SIZE
  const area = { x: box.x * width, y: box.y * height, width: box.width * width, height: box.height * height }
  const layout = getLayout(ctx, text, style, area, scale)

  ctx.save()
  drawBackground(ctx, width, layout, style, scale)
  drawText(ctx, layout, style, scale)
  ctx.restore()
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  frameWidth: number,
  layout: LyricLayout,
  style: LyricStyle,
  scale: number
): void {
  const { mode, color, opacity, radius } = style.background
  if (mode === BackgroundMode.NONE || opacity <= 0) return

  ctx.fillStyle = hexToRgba(color, opacity)
  const r = radius * scale

  if (mode === BackgroundMode.BOX) {
    const { x, y, width, height } = layout.block
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, r)
    ctx.fill()
  } else if (mode === BackgroundMode.BAND) {
    ctx.fillRect(0, layout.block.y, frameWidth, layout.block.height)
  } else {
    // Per line: a highlight behind each line, tall enough that lines touch
    ctx.beginPath()
    for (const line of layout.lines) {
      if (!line.text) continue
      ctx.roundRect(
        line.left - layout.padding,
        line.centerY - layout.lineHeight / 2,
        line.width + layout.padding * 2,
        layout.lineHeight,
        r
      )
    }
    ctx.fill()
  }
}

function drawText(
  ctx: CanvasRenderingContext2D,
  layout: LyricLayout,
  style: LyricStyle,
  scale: number
): void {
  const { outline, shadow } = style

  ctx.font = layout.font
  ctx.letterSpacing = `${layout.letterSpacing}px`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  const applyShadow = (on: boolean) => {
    ctx.shadowColor = on ? shadow.color : 'transparent'
    ctx.shadowBlur = on ? shadow.blur * scale : 0
    ctx.shadowOffsetY = on ? shadow.offsetY * scale : 0
  }

  // The outline carries the shadow when both are on, so it isn't doubled
  if (outline.enabled && outline.width > 0) {
    applyShadow(shadow.enabled)
    ctx.strokeStyle = outline.color
    ctx.lineWidth = outline.width * scale * 2  // stroke is centred on the glyph edge
    ctx.lineJoin = 'round'
    for (const line of layout.lines) {
      ctx.strokeText(line.text, line.left, line.centerY)
    }
    applyShadow(false)
  } else {
    applyShadow(shadow.enabled)
  }

  ctx.fillStyle = style.text.color
  for (const line of layout.lines) {
    ctx.fillText(line.text, line.left, line.centerY)
  }
}
