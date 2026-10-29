import { useSyncExternalStore } from 'react'

/** Tailwind's `lg` breakpoint - the desktop layout starts here */
export const DESKTOP_QUERY = '(min-width: 1024px)'

/**
 * Tracks a CSS media query. Use it when a panel must only be mounted once
 * (e.g. the desktop sidebar vs the mobile sheet) rather than hidden with CSS.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    onChange => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}
