// Copies the static content pages (../content) into the Vite build output (dist)
// so a single `dist` upload includes the /en and /es marketing/SEO pages.
import { cpSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

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
console.log('[copy-content] Copied content/ -> dist/ (en, es, content.css)')
