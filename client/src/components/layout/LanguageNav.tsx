import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/utils'

interface NavLink {
  label: string
  href: string
}

interface LanguageGroup {
  code: string
  label: string
  links: NavLink[]
}

const LANGUAGE_GROUPS: LanguageGroup[] = [
  {
    code: 'en',
    label: 'EN',
    links: [
      { label: 'Guide', href: '/en/how-to-add-lyrics-to-tiktok-videos.html' },
      { label: 'Tools', href: '/en/best-lyric-video-tools.html' },
      { label: 'About', href: '/en/about-lyric-drop.html' },
    ],
  },
  {
    code: 'es',
    label: 'ES',
    links: [
      { label: 'Guía', href: '/es/como-agregar-letras-a-videos-tiktok.html' },
      { label: 'Herramientas', href: '/es/mejores-herramientas-videos-letras.html' },
      { label: 'Acerca de', href: '/es/acerca-de-lyric-drop.html' },
    ],
  },
]

function NavDropdown({ group }: { group: LanguageGroup }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        className="gap-1"
      >
        {group.label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-44 rounded-md border border-border bg-card shadow-lg z-50 py-1"
          role="menu"
        >
          {group.links.map(link => (
            <a
              key={link.href}
              href={link.href}
              role="menuitem"
              className="block px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export function LanguageNav() {
  return (
    <nav className="hidden md:flex items-center gap-1" aria-label="Content pages">
      {LANGUAGE_GROUPS.map(group => (
        <NavDropdown key={group.code} group={group} />
      ))}
    </nav>
  )
}
