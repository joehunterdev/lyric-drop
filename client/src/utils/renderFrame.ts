import { LYRIC_FONT_SIZE_PERCENT, LYRIC_BG_OPACITY } from './config'
import { ImageFit } from '@/types/enums'
import type { FrameBackground, LyricBox } from '@/types'

/** Bottom margin used for video sources (fraction of height) */
const VIDEO_BOTTOM_MARGIN = 0.12

/** Lyric lines wrap at this fraction of the frame width (video sources) */
const MAX_TEXT_WIDTH = 0.85

/** Text shrinks to fit its box, but never below this fraction of the base size */
const MIN_FONT_SCALE = 0.5

interface RenderFrameOptions {
  background: FrameBackground
  /** Lyric text to draw, or null for none */
  text: string | null
  /** Lyric area for image mode; omitted for video sources (bottom-anchored layout) */
  box?: LyricBox
}

/**
 * Draw one frame (background + Lyric Drop) to a canvas.
 * Shared by the image-mode preview and the export so both look identical.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  { background, text, box }: RenderFrameOptions
): void {
  if (background.kind === 'video') {
    ctx.drawImage(background.source, 0, 0, width, height)
  } else {
    ctx.drawImage(getImageBackdrop(background.source, background.fit, width, height), 0, 0)
  }

  if (text) {
    drawLyric(ctx, width, height, text, box)
  }
}

// ===========================================
// Image backdrop
// ===========================================

interface CachedBackdrop {
  key: string
  canvas: HTMLCanvasElement
}

/** Pre-rendered backdrops - an image is static, so fit/blur only needs doing once */
const backdropCache = new WeakMap<ImageBitmap, CachedBackdrop>()

function getImageBackdrop(
  bitmap: ImageBitmap,
  fit: ImageFit,
  width: number,
  height: number
): HTMLCanvasElement {
  const key = `${fit}:${width}x${height}`
  const cached = backdropCache.get(bitmap)
  if (cached?.key === key) return cached.canvas

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)

  if (fit === ImageFit.BLUR_FILL) {
    // Blurred, darkened cover copy behind the whole image
    const blur = Math.round(Math.min(width, height) * 0.04)
    ctx.save()
    ctx.filter = `blur(${blur}px)`
    // Overscale slightly so the blur doesn't pull in dark edges
    drawFitted(ctx, bitmap, width, height, 'cover', 1.1)
    ctx.restore()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.fillRect(0, 0, width, height)
    drawFitted(ctx, bitmap, width, height, 'contain')
  } else {
    drawFitted(ctx, bitmap, width, height, 'cover')
  }

  backdropCache.set(bitmap, { key, canvas })
  return canvas
}

/**
 * Draw an image centred, scaled to cover or be contained by the frame
 */
function drawFitted(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  width: number,
  height: number,
  mode: 'cover' | 'contain',
  extraScale = 1
): void {
  const scaleX = width / bitmap.width
  const scaleY = height / bitmap.height
  const scale = (mode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY)) * extraScale
  const drawWidth = bitmap.width * scale
  const drawHeight = bitmap.height * scale
  ctx.drawImage(
    bitmap,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  )
}

// ===========================================
// Lyric
// ===========================================

function drawLyric(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  box?: LyricBox
): void {
  // Video keeps sizing relative to height; image mode sizes from the shorter
  // side so text looks the same in 9:16 and 16:9
  const basis = box ? Math.min(width, height) : height
  const baseFontSize = Math.round(basis * (LYRIC_FONT_SIZE_PERCENT / 100))
  const padding = Math.round(basis * 0.02)

  // Area the text lives in (pixels)
  const area = box
    ? { x: box.x * width, y: box.y * height, width: box.width * width, height: box.height * height }
    : { x: width * (1 - MAX_TEXT_WIDTH) / 2, y: 0, width: width * MAX_TEXT_WIDTH, height }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Wrap to the area width; in a box, shrink the font until the text fits its height
  let fontSize = baseFontSize
  let lines: string[]
  for (;;) {
    ctx.font = `bold ${fontSize}px Arial, sans-serif`
    lines = wrapText(ctx, text, area.width - padding * 2)
    const textHeight = lines.length * fontSize * 1.3 + padding * 2
    if (!box || textHeight <= area.height || fontSize <= baseFontSize * MIN_FONT_SCALE) break
    fontSize = Math.max(Math.round(fontSize * 0.92), Math.ceil(baseFontSize * MIN_FONT_SCALE))
  }

  const lineHeight = fontSize * 1.3
  const maxWidth = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0)

  const boxWidth = maxWidth + padding * 2
  const boxHeight = lines.length * lineHeight + padding * 2
  const boxX = area.x + (area.width - boxWidth) / 2
  const boxY = box
    ? area.y + (area.height - boxHeight) / 2
    : height - Math.round(height * VIDEO_BOTTOM_MARGIN) - boxHeight

  // Semi-transparent background (from config)
  ctx.fillStyle = `rgba(0, 0, 0, ${LYRIC_BG_OPACITY})`
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  lines.forEach((line, index) => {
    const y = boxY + padding + lineHeight * 0.5 + index * lineHeight
    ctx.fillText(line, area.x + area.width / 2, y)
  })
}

/**
 * Split text into lines that fit maxWidth, honouring explicit line breaks
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const result: string[] = []

  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word
      if (line && ctx.measureText(candidate).width > maxWidth) {
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
