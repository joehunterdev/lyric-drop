// Copies the static content pages (../content) into the Vite build output (dist)
// so a single `dist` upload includes the /en and /es marketing/SEO pages.
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const contentDir = resolve(__dirname, '../../content')
const distDir = resolve(__dirname, '../dist')

if (!existsSync(contentDir)) {
  console.warn(`[copy-content] No content folder found at ${contentDir} - skipping`)
  process.exit(0)
}

if (!existsSync(distDir)) {
  console.error(`[copy-content] dist folder not found at ${distDir} - run the build first`)
  process.exit(1)
}

// Copy everything in content/ (content.css, en/, es/) into dist/
cpSync(contentDir, distDir, { recursive: true })

// Self-hosted font files used by content.css (no third-party font requests)
const fontFiles = [
  'titillium-web-latin-600-normal.woff2',
  'titillium-web-latin-900-normal.woff2',
  'titillium-web-latin-200-italic.woff2',
]
const fontSourceDir = resolve(dirname(require.resolve('@fontsource/titillium-web/package.json')), 'files')
const fontDistDir = resolve(distDir, 'fonts')
mkdirSync(fontDistDir, { recursive: true })
for (const file of fontFiles) {
  cpSync(resolve(fontSourceDir, file), resolve(fontDistDir, file))
}

console.log('[copy-content] Copied content/ -> dist/ (en, es, content.css, fonts)')
