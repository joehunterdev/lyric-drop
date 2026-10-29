import { createContext, useContext } from 'react'

import type { OverlayState } from './overlayReducer'
import type { OutputFormat } from '@/types/enums'
import type { LyricStyle, LyricBox, StylePreset, CustomFont } from '@/types'

export interface OverlayContextValue extends OverlayState {
  /** Merge values into one section of the style, e.g. updateStyle('text', { color }) */
  updateStyle: <K extends keyof LyricStyle>(section: K, values: Partial<LyricStyle[K]>) => void
  setStyle: (style: LyricStyle) => void
  resetStyle: () => void
  setLyricBox: (format: OutputFormat, box: LyricBox) => void
  savePreset: (name: string) => StylePreset
  deletePreset: (id: string) => void
  /** Register an uploaded font file; throws with a user-facing message on failure */
  uploadFont: (file: File) => Promise<CustomFont>
  deleteFont: (family: string) => void
}

export const OverlayContext = createContext<OverlayContextValue | null>(null)

export function useOverlay(): OverlayContextValue {
  const context = useContext(OverlayContext)
  if (!context) {
    throw new Error('useOverlay must be used within an OverlayProvider')
  }
  return context
}
