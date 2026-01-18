import { Download, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useCanvasExport } from '@/hooks'
import type { LyricSegment } from '@/types'
import { ExportStatus } from '@/types'

interface ExportButtonProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  segments: LyricSegment[]
  disabled?: boolean
  compact?: boolean
}

export function ExportButton({ videoRef, segments, disabled, compact = false }: ExportButtonProps) {
  const { exportVideo, cancelExport, progress } = useCanvasExport({
    videoRef,
    segments,
  })
  
  const isProcessing = progress.status === ExportStatus.PREPARING || 
                       progress.status === ExportStatus.PROCESSING
  
  const handleClick = () => {
    if (isProcessing) {
      cancelExport()
    } else {
      exportVideo()
    }
  }

  // Compact mode for header - icon only on mobile
  if (compact) {
    return (
      <Button
        onClick={handleClick}
        disabled={disabled || !videoRef.current || segments.length === 0}
        variant={isProcessing ? "destructive" : "default"}
        size="icon"
        title={isProcessing ? `Cancel (${progress.progress}%)` : "Export Video"}
        className="relative"
      >
        {isProcessing ? (
          <>
            <X className="w-5 h-5" />
            {/* Progress ring */}
            <svg 
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 36 36"
            >
              <circle
                className="stroke-primary-foreground/30"
                strokeWidth="3"
                fill="none"
                cx="18"
                cy="18"
                r="14"
              />
              <circle
                className="stroke-primary-foreground transition-all duration-300"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                cx="18"
                cy="18"
                r="14"
                strokeDasharray={`${progress.progress * 0.88} 88`}
              />
            </svg>
          </>
        ) : (
          <Download className="w-5 h-5" />
        )}
      </Button>
    )
  }
  
  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        disabled={disabled || !videoRef.current || segments.length === 0}
        variant={isProcessing ? "destructive" : "default"}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <X className="w-4 h-4 mr-2" />
            Cancel ({progress.progress}%)
          </>
        ) : progress.status === ExportStatus.COMPLETE ? (
          <>
            <Download className="w-4 h-4 mr-2" />
            Export Complete!
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Export Video
          </>
        )}
      </Button>
      
      {isProcessing && (
        <div className="space-y-1">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {progress.message}
          </p>
        </div>
      )}
      
      {progress.status === ExportStatus.ERROR && (
        <p className="text-xs text-destructive text-center">
          {progress.message}
        </p>
      )}
      
      <p className="text-xs text-muted-foreground text-center">
        Exports as WebM (accepted by TikTok, Instagram, YouTube)
      </p>
    </div>
  )
}
