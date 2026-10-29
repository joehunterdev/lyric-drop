import { LYRIC_FONT_SIZE_PERCENT, LYRIC_BG_OPACITY } from './config'
import { drawStyledLyric } from './overlay/drawLyric'
import { wrapText } from './overlay/layoutLyric'
import { ImageFit } from '@/types/enums'
import type { FrameBackground, LyricBox, LyricStyle } from '@/types'

/** Bottom margin used for video sources (fraction of height) */
const VIDEO_BOTTOM_MARGIN = 0.12

/** Lyric lines wrap at this fraction of the frame width (video sources) */
const MAX_TEXT_WIDTH = 0.85

/** Opacity of the sample line shown in the paused preview */
const GHOST_OPACITY = 0.55

interface RenderFrameOptions {
  background: FrameBackground
  /** Lyric text to draw, or null for none */
  text: string | null
  /**
   * Styled lyric for image mode. Omitted for video sources, which keep the
   * original bottom-anchored look until video gets the canvas preview.
   */
  overlay?: { style: LyricStyle; box: LyricBox }
  /** Draw the lyric faded - a preview-only sample line */
  ghost?: boolean
}

/**
 * Draw one frame (background + Lyric Drop) to a canvas.
 * Shared by the image-mode preview and the export so both look identical.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  { background, text, overlay, ghost = false }: RenderFrameOptions
): void {
  if (background.kind === 'video') {
    ctx.drawImage(background.source, 0, 0, width, height)
  } else {
    ctx.drawImage(getImageBackdrop(background.source, background.fit, width, height), 0, 0)
  }

  if (!text) return

  ctx.save()
  if (ghost) ctx.globalAlpha = GHOST_OPACITY
  if (overlay) {
    drawStyledLyric(ctx, width, height, text, overlay.style, overlay.box)
  } else {
    drawVideoLyric(ctx, width, height, text)
  }
  ctx.restore()
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
// Video lyric (original fixed look)
// ===========================================

function drawVideoLyric(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string
): void {
  const fontSize = Math.round(height * (LYRIC_FONT_SIZE_PERCENT / 100))
  const padding = Math.round(height * 0.02)

  ctx.font = `bold ${fontSize}px Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const lines = wrapText(ctx, text, width * MAX_TEXT_WIDTH - padding * 2)
  const lineHeight = fontSize * 1.3
  const maxWidth = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0)

  const boxWidth = maxWidth + padding * 2
  const boxHeight = lines.length * lineHeight + padding * 2
  const boxX = (width - boxWidth) / 2
  const boxY = height - Math.round(height * VIDEO_BOTTOM_MARGIN) - boxHeight

  ctx.fillStyle = `rgba(0, 0, 0, ${LYRIC_BG_OPACITY})`
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  lines.forEach((line, index) => {
    const y = boxY + padding + lineHeight * 0.5 + index * lineHeight
    ctx.fillText(line, width / 2, y)
  })
}
