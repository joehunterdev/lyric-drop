import { Download, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useCanvasExport } from '@/hooks'
import type { LyricSegment } from '@/types'
import { ExportStatus } from '@/types'

interface ExportButtonProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  segments: LyricSegment[]
  disabled?: boolean
}

export function ExportButton({ videoRef, segments, disabled }: ExportButtonProps) {
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
