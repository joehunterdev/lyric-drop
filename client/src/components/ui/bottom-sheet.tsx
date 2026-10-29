import type { ReactNode } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Mobile-only slide-up panel (same slide pattern as the settings Sidebar).
 * Hidden from lg up, where the controls it holds are shown inline.
 */
function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  return (
    <div className="lg:hidden">
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}

      <div
        role="dialog"
        aria-label={title}
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-xl border-t border-border bg-card",
          "transform transition-transform duration-300 ease-in-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </div>
    </div>
  )
}

export { BottomSheet }
