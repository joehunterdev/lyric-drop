import { BackgroundMode, TextAlign, TextTransform } from '@/types/enums'
import type { LyricStyle, StylePreset } from '@/types'

/** Shorter side of the frame that "reference px" values are defined against */
export const REFERENCE_SIZE = 1080

/**
 * The original Lyric Drop look - white bold Arial on a translucent black box
 */
export const DEFAULT_LYRIC_STYLE: LyricStyle = {
  text: {
    fontFamily: 'Arial',
    fontWeight: 700,
    fontSize: 54,
    autoFit: true,
    color: '#ffffff',
    align: TextAlign.CENTER,
    transform: TextTransform.NONE,
    lineHeight: 1.3,
    letterSpacing: 0,
  },
  background: {
    mode: BackgroundMode.BOX,
    color: '#000000',
    opacity: 0.7,
    radius: 8,
    padding: 22,
  },
  outline: {
    enabled: false,
    color: '#000000',
    width: 4,
  },
  shadow: {
    enabled: false,
    color: '#000000',
    blur: 12,
    offsetY: 4,
  },
}

/**
 * Starting points shipped with the app
 */
export const BUILT_IN_PRESETS: StylePreset[] = [
  {
    id: 'classic',
    name: 'Classic',
    style: DEFAULT_LYRIC_STYLE,
  },
  {
    id: 'bold-caption',
    name: 'Bold caption',
    style: {
      ...DEFAULT_LYRIC_STYLE,
      text: { ...DEFAULT_LYRIC_STYLE.text, fontFamily: 'Anton', fontWeight: 400, fontSize: 72, transform: TextTransform.UPPERCASE, lineHeight: 1.15, letterSpacing: 1 },
      background: { ...DEFAULT_LYRIC_STYLE.background, mode: BackgroundMode.NONE },
      outline: { enabled: true, color: '#000000', width: 6 },
      shadow: { enabled: true, color: '#000000', blur: 16, offsetY: 6 },
    },
  },
  {
    id: 'outline',
    name: 'Outline',
    style: {
      ...DEFAULT_LYRIC_STYLE,
      text: { ...DEFAULT_LYRIC_STYLE.text, fontFamily: 'Bebas Neue', fontWeight: 400, fontSize: 80, lineHeight: 1.05, letterSpacing: 2 },
      background: { ...DEFAULT_LYRIC_STYLE.background, mode: BackgroundMode.NONE },
      outline: { enabled: true, color: '#000000', width: 5 },
    },
  },
  {
    id: 'highlight',
    name: 'Highlight',
    style: {
      ...DEFAULT_LYRIC_STYLE,
      text: { ...DEFAULT_LYRIC_STYLE.text, fontFamily: 'Montserrat', fontWeight: 900, fontSize: 52, color: '#000000', lineHeight: 1.45 },
      background: { mode: BackgroundMode.LINE, color: '#00e8ce', opacity: 1, radius: 6, padding: 14 },
    },
  },
  {
    id: 'band',
    name: 'Band',
    style: {
      ...DEFAULT_LYRIC_STYLE,
      text: { ...DEFAULT_LYRIC_STYLE.text, fontFamily: 'Oswald', fontWeight: 600, fontSize: 58, transform: TextTransform.UPPERCASE },
      background: { mode: BackgroundMode.BAND, color: '#000000', opacity: 0.6, radius: 0, padding: 26 },
    },
  },
]
