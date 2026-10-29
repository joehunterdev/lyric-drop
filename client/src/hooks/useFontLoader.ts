import { useState, useEffect, useSyncExternalStore } from 'react'

import { ensureFontLoaded } from '@/utils'

export type FontStatus = 'loading' | 'ready' | 'error'

/**
 * Load a font for canvas use and report its status
 */
export function useFontLoader(family: string, weight: number): FontStatus {
  const key = `${family}:${weight}`
  const [result, setResult] = useState<{ key: string; status: FontStatus } | null>(null)

  useEffect(() => {
    let cancelled = false
    ensureFontLoaded(family, weight).then(ok => {
      if (!cancelled) setResult({ key, status: ok ? 'ready' : 'error' })
    })
    return () => { cancelled = true }
  }, [family, weight, key])

  // A result for a previous font means the current one is still loading
  return result?.key === key ? result.status : 'loading'
}

// ===========================================
// Font load notifications
// ===========================================

let fontsVersion = 0

function subscribe(onChange: () => void): () => void {
  const handler = () => {
    fontsVersion++
    onChange()
  }
  document.fonts.addEventListener('loadingdone', handler)
  return () => document.fonts.removeEventListener('loadingdone', handler)
}

/**
 * Changes whenever any font finishes loading - use as an effect dependency
 * to redraw canvases that may have rendered with a fallback font
 */
export function useFontsVersion(): number {
  return useSyncExternalStore(subscribe, () => fontsVersion)
}
