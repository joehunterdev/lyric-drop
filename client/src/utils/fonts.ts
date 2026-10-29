import { logger } from './logger'
import type { CustomFont } from '@/types'

export interface FontOption {
  family: string
  /** Weights the font actually ships - others are faked by the browser */
  weights: number[]
  category: 'display' | 'sans' | 'serif' | 'handwriting' | 'mono'
  source: 'bundled' | 'system'
}

/**
 * Curated fonts that suit lyric videos. Adding a font is one line here.
 */
export const FONT_OPTIONS: FontOption[] = [
  { family: 'Arial', weights: [400, 700], category: 'sans', source: 'system' },
  { family: 'Bebas Neue', weights: [400], category: 'display', source: 'bundled' },
  { family: 'Anton', weights: [400], category: 'display', source: 'bundled' },
  { family: 'Oswald', weights: [400, 600, 700], category: 'display', source: 'bundled' },
  { family: 'Archivo Black', weights: [400], category: 'display', source: 'bundled' },
  { family: 'Bangers', weights: [400], category: 'display', source: 'bundled' },
  { family: 'Montserrat', weights: [400, 600, 700, 900], category: 'sans', source: 'bundled' },
  { family: 'Inter', weights: [400, 600, 700, 900], category: 'sans', source: 'bundled' },
  { family: 'Titillium Web', weights: [400, 600, 700], category: 'sans', source: 'bundled' },
  { family: 'Playfair Display', weights: [400, 700, 900], category: 'serif', source: 'bundled' },
  { family: 'Permanent Marker', weights: [400], category: 'handwriting', source: 'bundled' },
  { family: 'Space Mono', weights: [400, 700], category: 'mono', source: 'bundled' },
]

/** Weights offered in the UI */
export const FONT_WEIGHTS = [400, 600, 700, 900]

/** Uploaded font families are namespaced so they can't clash with real ones */
const CUSTOM_FONT_PREFIX = 'LD Custom - '

export const ALLOWED_FONT_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2']

/** Real fonts are well under this - anything bigger isn't worth keeping in IndexedDB */
const MAX_FONT_SIZE = 10 * 1024 * 1024

export function findFontOption(family: string): FontOption | undefined {
  return FONT_OPTIONS.find(font => font.family === family)
}

/**
 * CSS font shorthand for canvas, with a generic fallback
 */
export function cssFont(weight: number, sizePx: number, family: string): string {
  return `${weight} ${sizePx}px "${family}", sans-serif`
}

// ===========================================
// Loading
// ===========================================

/**
 * Bundled fonts are self-hosted (Fontsource, latin subset). Each loader pulls in only that font's
 * @font-face CSS the first time the font is used, so unused fonts cost nothing. Keep the weights
 * here in step with FONT_OPTIONS above.
 */
const FONT_LOADERS: Record<string, () => Promise<unknown>> = {
  'Bebas Neue': () => import('@fontsource/bebas-neue/latin-400.css'),
  'Anton': () => import('@fontsource/anton/latin-400.css'),
  'Oswald': () => Promise.all([
    import('@fontsource/oswald/latin-400.css'),
    import('@fontsource/oswald/latin-600.css'),
    import('@fontsource/oswald/latin-700.css'),
  ]),
  'Archivo Black': () => import('@fontsource/archivo-black/latin-400.css'),
  'Bangers': () => import('@fontsource/bangers/latin-400.css'),
  'Montserrat': () => Promise.all([
    import('@fontsource/montserrat/latin-400.css'),
    import('@fontsource/montserrat/latin-600.css'),
    import('@fontsource/montserrat/latin-700.css'),
    import('@fontsource/montserrat/latin-900.css'),
  ]),
  'Inter': () => Promise.all([
    import('@fontsource/inter/latin-400.css'),
    import('@fontsource/inter/latin-600.css'),
    import('@fontsource/inter/latin-700.css'),
    import('@fontsource/inter/latin-900.css'),
  ]),
  'Titillium Web': () => Promise.all([
    import('@fontsource/titillium-web/latin-400.css'),
    import('@fontsource/titillium-web/latin-600.css'),
    import('@fontsource/titillium-web/latin-700.css'),
  ]),
  'Playfair Display': () => Promise.all([
    import('@fontsource/playfair-display/latin-400.css'),
    import('@fontsource/playfair-display/latin-700.css'),
    import('@fontsource/playfair-display/latin-900.css'),
  ]),
  'Permanent Marker': () => import('@fontsource/permanent-marker/latin-400.css'),
  'Space Mono': () => Promise.all([
    import('@fontsource/space-mono/latin-400.css'),
    import('@fontsource/space-mono/latin-700.css'),
  ]),
}

const requestedFonts = new Map<string, Promise<unknown>>()

function loadBundledFontCss(family: string): Promise<unknown> {
  let request = requestedFonts.get(family)
  if (!request) {
    request = (FONT_LOADERS[family]?.() ?? Promise.resolve()).catch(error => {
      requestedFonts.delete(family)
      throw error
    })
    requestedFonts.set(family, request)
  }
  return request
}

/**
 * Make sure a font is ready for canvas drawing. Canvas never waits for fonts -
 * it silently falls back - so this must resolve before rendering or exporting.
 * Returns false if the font couldn't be loaded.
 */
export async function ensureFontLoaded(family: string, weight: number): Promise<boolean> {
  const font = findFontOption(family)
  if (font?.source === 'system') return true
  if (font?.source === 'bundled') {
    try {
      await loadBundledFontCss(family)
    } catch (error) {
      logger.error('Font stylesheet failed to load:', family, error)
      return false
    }
  }

  const descriptor = cssFont(weight, 48, family)
  try {
    // The stylesheet may still be in flight - wait for it to define the face
    for (let attempt = 0; attempt < 20; attempt++) {
      const faces = await document.fonts.load(descriptor)
      if (faces.length > 0) return true
      await new Promise(resolve => setTimeout(resolve, 150))
    }
  } catch (error) {
    logger.error('Font load failed:', family, error)
  }
  return false
}

// ===========================================
// Custom fonts (uploaded) - persisted in IndexedDB
// ===========================================

const DB_NAME = 'lyricdrop'
const STORE = 'fonts'

interface StoredFont extends CustomFont {
  data: ArrayBuffer
}

function openFontDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'family' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function registerFontFace(family: string, data: ArrayBuffer): Promise<void> {
  const face = new FontFace(family, data)
  await face.load()
  document.fonts.add(face)
}

/**
 * Register an uploaded font file and store it so it survives a refresh
 */
export async function addCustomFont(file: File): Promise<CustomFont> {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_FONT_EXTENSIONS.includes(ext)) {
    throw new Error(`Only ${ALLOWED_FONT_EXTENSIONS.join(', ')} font files are supported`)
  }
  if (file.size > MAX_FONT_SIZE) {
    throw new Error('Font file too large. Maximum size is 10 MB')
  }

  const name = file.name.replace(/\.[^/.]+$/, '')
  const family = CUSTOM_FONT_PREFIX + name
  const data = await file.arrayBuffer()

  try {
    await registerFontFace(family, data)
  } catch {
    throw new Error(`Couldn't read "${file.name}" as a font`)
  }

  try {
    const db = await openFontDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ family, name, data } satisfies StoredFont)
  } catch (error) {
    // Storage blocked (private window etc.) - font still works this session
    logger.warn('Could not persist custom font:', error)
  }

  return { family, name }
}

/**
 * Re-register previously uploaded fonts on startup
 */
export async function loadStoredCustomFonts(): Promise<CustomFont[]> {
  try {
    const db = await openFontDb()
    const stored = await new Promise<StoredFont[]>((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    const fonts: CustomFont[] = []
    for (const font of stored) {
      try {
        await registerFontFace(font.family, font.data)
        fonts.push({ family: font.family, name: font.name })
      } catch (error) {
        logger.warn('Stored font failed to load:', font.name, error)
      }
    }
    return fonts
  } catch (error) {
    logger.warn('Could not read stored fonts:', error)
    return []
  }
}

/**
 * Remove an uploaded font from storage (it stays registered until reload)
 */
export async function removeCustomFont(family: string): Promise<void> {
  try {
    const db = await openFontDb()
    db.transaction(STORE, 'readwrite').objectStore(STORE).delete(family)
  } catch (error) {
    logger.warn('Could not remove stored font:', error)
  }
}
