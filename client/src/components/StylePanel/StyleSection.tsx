import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/utils/cn'

interface StyleSectionProps {
  title: string
  defaultOpen?: boolean
  /** Optional on/off switch in the header (e.g. Outline) */
  enabled?: boolean
  onEnabledChange?: (enabled: boolean) => void
  children: ReactNode
}

/**
 * Collapsible group of style controls
 */
export function StyleSection({
  title,
  defaultOpen = false,
  enabled,
  onEnabledChange,
  children,
}: StyleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const hasToggle = enabled !== undefined && onEnabledChange !== undefined

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t border-border first:border-t-0">
      <div className="flex items-center gap-2 py-2.5">
        <CollapsibleTrigger className="flex flex-1 items-center gap-1.5 text-sm font-medium text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-90')} />
          {title}
        </CollapsibleTrigger>
        {hasToggle && (
          <Switch
            checked={enabled}
            onCheckedChange={checked => {
              onEnabledChange(checked)
              if (checked) setOpen(true)
            }}
            aria-label={`${title} on/off`}
          />
        )}
      </div>
      <CollapsibleContent className="space-y-3 pb-4 pl-5.5">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
