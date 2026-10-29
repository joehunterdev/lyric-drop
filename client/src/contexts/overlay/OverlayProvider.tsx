import { useReducer, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { OverlayContext, type OverlayContextValue } from './OverlayContext'
import { overlayReducer, loadInitialState, saveState } from './overlayReducer'
import {
  DEFAULT_LYRIC_STYLE,
  addCustomFont,
  loadStoredCustomFonts,
  removeCustomFont,
} from '@/utils'
import type { OutputFormat } from '@/types/enums'
import type { LyricStyle, LyricBox } from '@/types'

/** Delay before writing settings to storage, so slider drags don't hammer it */
const SAVE_DEBOUNCE_MS = 300

interface OverlayProviderProps {
  children: ReactNode
}

/**
 * Lyric overlay settings - style, lyric boxes, presets and custom fonts.
 * Persists to localStorage (fonts to IndexedDB) so a refresh keeps your look.
 */
export function OverlayProvider({ children }: OverlayProviderProps) {
  const [state, dispatch] = useReducer(overlayReducer, undefined, loadInitialState)

  // Persist settings (debounced)
  useEffect(() => {
    const timer = setTimeout(() => saveState(state), SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [state])

  // Re-register uploaded fonts from previous sessions
  useEffect(() => {
    let cancelled = false
    loadStoredCustomFonts().then(fonts => {
      if (!cancelled && fonts.length) dispatch({ type: 'addCustomFonts', fonts })
    })
    return () => { cancelled = true }
  }, [])

  const updateStyle = useCallback(<K extends keyof LyricStyle>(section: K, values: Partial<LyricStyle[K]>) => {
    dispatch({ type: 'updateStyle', section, values })
  }, [])

  const setStyle = useCallback((style: LyricStyle) => {
    dispatch({ type: 'setStyle', style })
  }, [])

  const resetStyle = useCallback(() => {
    dispatch({ type: 'setStyle', style: DEFAULT_LYRIC_STYLE })
  }, [])

  const setLyricBox = useCallback((format: OutputFormat, box: LyricBox) => {
    dispatch({ type: 'setLyricBox', format, box })
  }, [])

  const savePreset = useCallback((name: string) => {
    const preset = { id: uuidv4(), name, style: state.style }
    dispatch({ type: 'savePreset', preset })
    return preset
  }, [state.style])

  const deletePreset = useCallback((id: string) => {
    dispatch({ type: 'deletePreset', id })
  }, [])

  const uploadFont = useCallback(async (file: File) => {
    const font = await addCustomFont(file)
    dispatch({ type: 'addCustomFonts', fonts: [font] })
    return font
  }, [])

  const deleteFont = useCallback((family: string) => {
    void removeCustomFont(family)
    dispatch({ type: 'removeCustomFont', family })
  }, [])

  const value = useMemo<OverlayContextValue>(() => ({
    ...state,
    updateStyle,
    setStyle,
    resetStyle,
    setLyricBox,
    savePreset,
    deletePreset,
    uploadFont,
    deleteFont,
  }), [state, updateStyle, setStyle, resetStyle, setLyricBox, savePreset, deletePreset, uploadFont, deleteFont])

  return (
    <OverlayContext.Provider value={value}>
      {children}
    </OverlayContext.Provider>
  )
}
