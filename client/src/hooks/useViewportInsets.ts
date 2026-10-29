import { useEffect } from 'react'

/**
 * Publishes the visible viewport to CSS so mobile layouts survive the on-screen keyboard:
 *   --app-height      height of the area the user can actually see
 *   --keyboard-inset  how far the keyboard (or browser chrome) covers the bottom of the
 *                     layout viewport; fixed bottom panels use it to sit above the keyboard
 *
 * Chrome on Android resizes the layout viewport with the keyboard when the viewport meta has
 * `interactive-widget=resizes-content`, so there the inset stays 0. iOS Safari only shrinks the
 * visual viewport, which is what this covers.
 */
export function useViewportInsets(): void {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const root = document.documentElement
    let frame = 0

    const update = () => {
      frame = 0
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      root.style.setProperty('--app-height', `${viewport.height}px`)
      root.style.setProperty('--keyboard-inset', `${inset}px`)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    viewport.addEventListener('resize', schedule)
    viewport.addEventListener('scroll', schedule)
    window.addEventListener('orientationchange', schedule)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      viewport.removeEventListener('resize', schedule)
      viewport.removeEventListener('scroll', schedule)
      window.removeEventListener('orientationchange', schedule)
      root.style.removeProperty('--app-height')
      root.style.removeProperty('--keyboard-inset')
    }
  }, [])
}

/** Height of the visible area in px (visual viewport, falling back to the window) */
export const getViewportHeight = () => window.visualViewport?.height ?? window.innerHeight
