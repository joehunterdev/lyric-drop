import { CheckCircle2, AlertTriangle, X } from 'lucide-react'

import { cn } from '@/utils/cn'
import type { ExportProgress as ExportProgressState } from '@/types'
import { ExportStatus } from '@/types'

interface ExportProgressProps {
  progress: ExportProgressState
  /** Clears an error message */
  onDismiss: () => void
  className?: string
}

/**
 * Export status in the header: a progress bar while recording,
 * then a brief "complete" or a persistent error message
 */
export function ExportProgress({ progress, onDismiss, className }: ExportProgressProps) {
  const { status, message } = progress
  if (status === ExportStatus.IDLE) return null

  const isProcessing = status === ExportStatus.PREPARING || status === ExportStatus.PROCESSING
  const percent = status === ExportStatus.COMPLETE ? 100 : progress.progress

  if (status === ExportStatus.ERROR) {
    return (
      <div
        role="alert"
        className={cn('flex min-w-0 items-center gap-2 text-xs text-destructive-foreground', className)}
      >
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate" title={message}>{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss export error"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 text-foreground">
          {status === ExportStatus.COMPLETE && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-primary" />}
          <span className="truncate">
            {status === ExportStatus.PROCESSING ? 'Exporting…' : message}
          </span>
          {isProcessing && (
            <span className="hidden truncate text-muted-foreground md:inline">
              · keep this tab open
            </span>
          )}
        </span>
        <span className="font-mono tabular-nums text-muted-foreground">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Export progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
