import { useState, useCallback } from 'react'
import { FileText, Trash2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatTime } from '@/utils'
import type { LyricSegment } from '@/types'

interface LyricEditorProps {
  segments: LyricSegment[]
  selectedSegmentId: string | null
  videoDuration: number
  onImportLyrics: (text: string, duration: number) => void
  onSelectSegment: (id: string | null) => void
  onUpdateSegment: (id: string, updates: Partial<LyricSegment>) => void
  onRemoveSegment: (id: string) => void
}

export function LyricEditor({
  segments,
  selectedSegmentId,
  videoDuration,
  onImportLyrics,
  onSelectSegment,
  onUpdateSegment,
  onRemoveSegment,
}: LyricEditorProps) {
  const [lyricsInput, setLyricsInput] = useState('')
  const [isImportMode, setIsImportMode] = useState(segments.length === 0)
  
  const handleImport = useCallback(() => {
    if (lyricsInput.trim() && videoDuration > 0) {
      onImportLyrics(lyricsInput, videoDuration)
      setLyricsInput('')
      setIsImportMode(false)
    }
  }, [lyricsInput, videoDuration, onImportLyrics])
  
  if (isImportMode || segments.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import Lyrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your lyrics here...&#10;&#10;Each line will become a separate segment distributed evenly across the video duration."
            value={lyricsInput}
            onChange={(e) => setLyricsInput(e.target.value)}
            className="min-h-[200px] resize-none"
          />
          
          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={!lyricsInput.trim() || videoDuration === 0}
              className="flex-1"
            >
              Import & Distribute
            </Button>
            {segments.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setIsImportMode(false)}
              >
                Cancel
              </Button>
            )}
          </div>
          
          {videoDuration === 0 && (
            <p className="text-sm text-muted-foreground">
              Upload a video first to import lyrics.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Lyrics ({segments.length} segments)
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsImportMode(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Import
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6">
          <div className="space-y-2 pb-4">
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-colors',
                  'hover:border-primary/50',
                  selectedSegmentId === segment.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card'
                )}
                onClick={() => onSelectSegment(segment.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">
                      {index + 1}. {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                    </div>
                    {selectedSegmentId === segment.id ? (
                      <Textarea
                        value={segment.text}
                        onChange={(e) => onUpdateSegment(segment.id, { text: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        className="min-h-[60px] text-sm"
                        placeholder="Enter lyrics..."
                      />
                    ) : (
                      <p className="text-sm truncate">
                        {segment.text || <span className="text-muted-foreground italic">Empty</span>}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveSegment(segment.id)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
