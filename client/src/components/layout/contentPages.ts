import { BookOpen, Wrench, Info, type LucideIcon } from 'lucide-react'

export interface ContentPageLink {
  label: string
  href: string
  icon: LucideIcon
}

export interface ContentPageGroup {
  code: string
  /** Short label for the header dropdown, e.g. "EN" */
  label: string
  /** Full language name for the settings sidebar */
  name: string
  links: ContentPageLink[]
}

/**
 * Static content pages (content/en, content/es), shared by the header
 * dropdowns and the settings sidebar
 */
export const CONTENT_PAGE_GROUPS: ContentPageGroup[] = [
  {
    code: 'en',
    label: 'EN',
    name: 'English',
    links: [
      { label: 'Guide', href: '/en/how-to-add-lyrics-to-tiktok-videos.html', icon: BookOpen },
      { label: 'Tools', href: '/en/best-lyric-video-tools.html', icon: Wrench },
      { label: 'About', href: '/en/about-lyric-drop.html', icon: Info },
    ],
  },
  {
    code: 'es',
    label: 'ES',
    name: 'Español',
    links: [
      { label: 'Guía', href: '/es/como-agregar-letras-a-videos-tiktok.html', icon: BookOpen },
      { label: 'Herramientas', href: '/es/mejores-herramientas-videos-letras.html', icon: Wrench },
      { label: 'Acerca de', href: '/es/acerca-de-lyric-drop.html', icon: Info },
    ],
  },
]
