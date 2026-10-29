import { RotateCcw, Info } from 'lucide-react'

import { PresetBar } from './PresetBar'
import { TextSection } from './TextSection'
import { BackgroundSection } from './BackgroundSection'
import { OutlineSection, ShadowSection } from './EffectsSection'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useOverlay } from '@/contexts'
import { cn } from '@/utils/cn'

interface StylePanelProps {
  /** Styles currently only render in image mode */
  isImageMode: boolean
  /** Inside the mobile sheet, which already shows the "Style" title - drops the panel's own heading */
  embedded?: boolean
}

/**
 * Lyric overlay style editor - every change shows live in the preview
 */
export function StylePanel({ isImageMode, embedded = false }: StylePanelProps) {
  const { resetStyle } = useOverlay()

  return (
    <Card className={cn('h-full flex-1 min-h-0 flex flex-col gap-0 py-0', embedded && 'border-0 shadow-none')}>
      <CardHeader className={cn('flex flex-row items-center border-b border-border', embedded ? 'justify-end py-2 pb-2!' : 'justify-between py-4')}>
        {!embedded && <CardTitle className="text-base">Style</CardTitle>}
        <Button variant="ghost" size="sm" onClick={resetStyle} title="Reset to the default style">
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          <div className={cn('py-4 space-y-4', embedded ? 'px-4' : 'px-6')}>
            {!isImageMode && (
              <p className="flex gap-2 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                <Info className="w-4 h-4 shrink-0" />
                Styles apply in Image + Audio mode. Video mode support is coming.
              </p>
            )}

            <PresetBar />

            <div>
              <TextSection />
              <BackgroundSection />
              <OutlineSection />
              <ShadowSection />
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
