import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { NewTabLink } from '@/components/ui/new-tab-link'
import { CONTENT_PAGE_GROUPS, type ContentPageGroup } from './contentPages'
import { cn } from '@/utils'

function NavDropdown({ group }: { group: ContentPageGroup }) {
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
            <NewTabLink
              key={link.href}
              href={link.href}
              role="menuitem"
              className="block px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NewTabLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function LanguageNav() {
  return (
    <nav className="hidden md:flex items-center gap-1" aria-label="Content pages">
      {CONTENT_PAGE_GROUPS.map(group => (
        <NavDropdown key={group.code} group={group} />
      ))}
    </nav>
  )
}
