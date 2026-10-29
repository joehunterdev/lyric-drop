import { DEFAULT_LYRIC_STYLE, OUTPUT_FORMATS, logger } from '@/utils'
import type { OutputFormat } from '@/types/enums'
import type { LyricStyle, LyricBox, StylePreset, CustomFont } from '@/types'

export interface OverlayState {
  /** One style shared by every format - sizes are relative, so it fits both */
  style: LyricStyle
  /** Lyric area per format - framing differs between 9:16 and 16:9 */
  lyricBoxes: Record<OutputFormat, LyricBox>
  /** User-saved presets (built-ins live in BUILT_IN_PRESETS) */
  presets: StylePreset[]
  /** Uploaded fonts registered this session */
  customFonts: CustomFont[]
}

type StyleSection = keyof LyricStyle

export type OverlayAction =
  | { type: 'updateStyle'; section: StyleSection; values: Partial<LyricStyle[StyleSection]> }
  | { type: 'setStyle'; style: LyricStyle }
  | { type: 'setLyricBox'; format: OutputFormat; box: LyricBox }
  | { type: 'savePreset'; preset: StylePreset }
  | { type: 'deletePreset'; id: string }
  | { type: 'addCustomFonts'; fonts: CustomFont[] }
  | { type: 'removeCustomFont'; family: string }

export function overlayReducer(state: OverlayState, action: OverlayAction): OverlayState {
  switch (action.type) {
    case 'updateStyle':
      return {
        ...state,
        style: {
          ...state.style,
          [action.section]: { ...state.style[action.section], ...action.values },
        },
      }
    case 'setStyle':
      return { ...state, style: action.style }
    case 'setLyricBox':
      return { ...state, lyricBoxes: { ...state.lyricBoxes, [action.format]: action.box } }
    case 'savePreset':
      return { ...state, presets: [...state.presets.filter(p => p.id !== action.preset.id), action.preset] }
    case 'deletePreset':
      return { ...state, presets: state.presets.filter(p => p.id !== action.id) }
    case 'addCustomFonts': {
      const known = new Set(state.customFonts.map(f => f.family))
      const added = action.fonts.filter(f => !known.has(f.family))
      return added.length ? { ...state, customFonts: [...state.customFonts, ...added] } : state
    }
    case 'removeCustomFont':
      return { ...state, customFonts: state.customFonts.filter(f => f.family !== action.family) }
  }
}

// ===========================================
// Persistence
// ===========================================

export const STORAGE_KEY = 'lyricdrop.overlay.v1'

/** What gets saved - custom fonts live in IndexedDB instead */
type PersistedState = Pick<OverlayState, 'style' | 'lyricBoxes' | 'presets'>

/**
 * Fill in any fields missing from a saved style (e.g. added in a later version)
 */
function mergeStyle(saved: Partial<LyricStyle> | undefined): LyricStyle {
  return {
    text: { ...DEFAULT_LYRIC_STYLE.text, ...saved?.text },
    background: { ...DEFAULT_LYRIC_STYLE.background, ...saved?.background },
    outline: { ...DEFAULT_LYRIC_STYLE.outline, ...saved?.outline },
    shadow: { ...DEFAULT_LYRIC_STYLE.shadow, ...saved?.shadow },
  }
}

export function loadInitialState(): OverlayState {
  const defaults: OverlayState = {
    style: DEFAULT_LYRIC_STYLE,
    lyricBoxes: {
      reel: OUTPUT_FORMATS.reel.lyricBox,
      youtube: OUTPUT_FORMATS.youtube.lyricBox,
    },
    presets: [],
    customFonts: [],
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const saved = JSON.parse(raw) as Partial<PersistedState>
    return {
      ...defaults,
      style: mergeStyle(saved.style),
      lyricBoxes: { ...defaults.lyricBoxes, ...saved.lyricBoxes },
      presets: (saved.presets ?? []).map(p => ({ ...p, style: mergeStyle(p.style) })),
    }
  } catch (error) {
    logger.warn('Could not load saved overlay settings:', error)
    return defaults
  }
}

export function saveState(state: OverlayState): void {
  try {
    const persisted: PersistedState = {
      style: state.style,
      lyricBoxes: state.lyricBoxes,
      presets: state.presets,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  } catch {
    // Storage blocked or full - settings just won't survive a refresh
  }
}
