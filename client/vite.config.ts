import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { readFileSync } from 'fs'

// Production CSP lives in public/.htaccess. Reading it here means `npm run preview` serves the
// built app with the exact same policy, so violations show up in the console before deploying.
function readCsp(): string | undefined {
  try {
    const htaccess = readFileSync(path.resolve(__dirname, 'public/.htaccess'), 'utf8')
    return htaccess
      .match(/Header always set Content-Security-Policy "([^"]+)"/)?.[1]
      // Plain-http localhost would otherwise try to upgrade every request to https
      ?.replace(/;\s*upgrade-insecure-requests/, '')
  } catch {
    return undefined
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: mode === 'development' ? env.VITE_DEV_HOST || 'localhost' : true,
      port: parseInt(env.VITE_DEV_PORT || '8081'),
      allowedHosts: ['.local', '.localhost', 'localhost'],
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: true,
      },
      // COOP/COEP headers for SharedArrayBuffer (FFmpeg WASM)
      // Commented out: requires HTTPS or localhost to work
      // headers: {
      //   'Cross-Origin-Opener-Policy': 'same-origin',
      //   'Cross-Origin-Embedder-Policy': 'require-corp',
      // },
    },
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    preview: {
      headers: readCsp() ? { 'Content-Security-Policy': readCsp()! } : undefined,
    },
  }
})
