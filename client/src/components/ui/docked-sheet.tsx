import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"

/** peek = header only, half = list beside the preview, tall = room to write */
export type SheetSnap = "peek" | "half" | "tall"

const PEEK_PX = 56
const SNAP_RATIO: Record<SheetSnap, number> = { peek: 0, half: 0.4, tall: 0.75 }
/** Movement under this many px counts as a tap, not a drag */
const TAP_SLOP = 6

const snapHeight = (snap: SheetSnap) =>
  snap === "peek" ? PEEK_PX : Math.round(window.innerHeight * SNAP_RATIO[snap])

const nearestSnap = (height: number): SheetSnap => {
  const snaps = Object.keys(SNAP_RATIO) as SheetSnap[]
  return snaps.reduce((best, snap) =>
    Math.abs(snapHeight(snap) - height) < Math.abs(snapHeight(best) - height) ? snap : best
  )
}

/** Taps on these never count as "outside": the panel's own openers (they toggle it) and
 * portalled UI opened from inside it (selects, popovers, toasts) */
const OUTSIDE_IGNORE =
  '[data-docked-sheet-toggle], [data-radix-popper-content-wrapper], [data-radix-select-content], [role="listbox"], [role="menu"], [data-sonner-toaster]'

interface DockedSheetProps {
  open: boolean
  onClose: () => void
  title: string
  snap: SheetSnap
  onSnapChange: (snap: SheetSnap) => void
  children: ReactNode
}

/**
 * Mobile-only panel docked to the bottom of the screen. Unlike BottomSheet it has no
 * backdrop, so the preview and timeline stay usable above it. Drag the header (or tap
 * it) to switch between peek / half / tall. While open it adds matching space at the
 * end of the page so everything can still be scrolled clear of the panel.
 */
function DockedSheet({ open, onClose, title, snap, onSnapChange, children }: DockedSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const [dragHeight, setDragHeight] = useState<number | null>(null)

  // A tap anywhere outside the panel closes it. Uses click (not pointerdown) so
  // scrolling the page underneath doesn't dismiss it.
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target || !target.isConnected) return
      if (panelRef.current?.contains(target) || target.closest(OUTSIDE_IGNORE)) return
      onClose()
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [open, onClose])

  const cssHeight = snap === "peek" ? `${PEEK_PX}px` : `${SNAP_RATIO[snap] * 100}dvh`
  const height = dragHeight !== null ? `${dragHeight}px` : cssHeight

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startY: e.clientY, startHeight: panelRef.current?.offsetHeight ?? 0 }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dy = drag.startY - e.clientY
    if (dragHeight === null && Math.abs(dy) < TAP_SLOP) return
    const max = window.innerHeight * 0.9
    setDragHeight(Math.max(PEEK_PX, Math.min(max, drag.startHeight + dy)))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    if (dragHeight === null) {
      // Tap: step up, or back down from tall
      onSnapChange(snap === "peek" ? "half" : snap === "half" ? "tall" : "half")
    } else {
      onSnapChange(nearestSnap(dragHeight))
    }
    setDragHeight(null)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <div className="lg:hidden">
      {/* Keeps the end of the page reachable above the panel */}
      {open && <div aria-hidden style={{ height }} />}

      <div
        ref={panelRef}
        role="dialog"
        aria-label={title}
        aria-hidden={!open}
        inert={!open}
        style={{ height }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-xl border-t border-border bg-card shadow-[0_-4px_16px_rgba(0,0,0,0.4)]",
          "transform transition-transform duration-300 ease-in-out",
          dragHeight === null && "transition-[transform,height]",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Header doubles as the drag handle */}
        <div
          className="relative flex h-14 shrink-0 cursor-grab touch-none select-none flex-col items-center justify-center border-b border-border"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="h-1 w-10 rounded-full bg-muted-foreground/40" />
          <h2 className="mt-1 text-sm font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

export { DockedSheet }
