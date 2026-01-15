import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

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
      allowedHosts: ['.local', 'localhost'],
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
  }
})
