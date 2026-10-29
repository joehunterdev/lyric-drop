import { Download, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { ExportProgress } from '@/types'
import { ExportStatus } from '@/types'

interface ExportButtonProps {
  progress: ExportProgress
  onExport: () => void
  onCancel: () => void
  disabled?: boolean
}

/**
 * Header export button - turns into a cancel button while exporting.
 * Progress is shown separately by ExportProgress.
 */
export function ExportButton({ progress, onExport, onCancel, disabled }: ExportButtonProps) {
  const isProcessing = progress.status === ExportStatus.PREPARING ||
                       progress.status === ExportStatus.PROCESSING

  return (
    <Button
      onClick={isProcessing ? onCancel : onExport}
      disabled={!isProcessing && disabled}
      variant={isProcessing ? 'destructive' : 'default'}
      size="icon"
      title={isProcessing ? 'Cancel export' : 'Export video'}
      aria-label={isProcessing ? 'Cancel export' : 'Export video'}
    >
      {isProcessing ? <X className="w-5 h-5" /> : <Download className="w-5 h-5" />}
    </Button>
  )
}
