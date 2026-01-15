const isDebug = import.meta.env.VITE_DEBUG === 'true'

export const logger = {
  log: (...args: unknown[]) => {
    if (isDebug) {
      console.log('[LOG]', ...args)
    }
  },
  info: (...args: unknown[]) => {
    if (isDebug) {
      console.info('[INFO]', ...args)
    }
  },
  warn: (...args: unknown[]) => {
    if (isDebug) {
      console.warn('[WARN]', ...args)
    }
  },
  error: (...args: unknown[]) => {
    // Always log errors
    console.error('[ERROR]', ...args)
  },
  debug: (...args: unknown[]) => {
    if (isDebug) {
      console.debug('[DEBUG]', ...args)
    }
  },
}
