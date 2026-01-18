import { useState, useCallback } from 'react'
import { FileText, Trash2, Plus, Pause, Layers } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatTime } from '@/utils'
import type { LyricSegment, LyricSection } from '@/types'
import { SegmentType } from '@/types/enums'

interface LyricEditorProps {
  segments: LyricSegment[]
  lyricSections: LyricSection[]
  selectedSegmentId: string | null
  selectedSectionId: string | null
  videoDuration: number
  currentTime: number
  onImportLyrics: (text: string, duration: number, startTime?: number, endTime?: number) => void
  onSelectSegment: (id: string | null) => void
  onUpdateSegment: (id: string, updates: Partial<LyricSegment>) => void
  onRemoveSegment: (id: string) => void
  onInsertSpacer: (atTime: number, duration?: number) => void
  onAddLyricSection: (startTime?: number, endTime?: number) => void
  onRemoveLyricSection: (id: string) => void
}

export function LyricEditor({
  segments,
  lyricSections,
  selectedSegmentId,
  selectedSectionId,
  videoDuration,
  currentTime,
  onImportLyrics,
  onSelectSegment,
  onUpdateSegment,
  onRemoveSegment,
  onInsertSpacer,
  onAddLyricSection,
  onRemoveLyricSection,
}: LyricEditorProps) {
  const [lyricsInput, setLyricsInput] = useState('')
  const [isImportMode, setIsImportMode] = useState(segments.length === 0)
  const [lyricStartTime, setLyricStartTime] = useState(0)
  const [lyricEndTime, setLyricEndTime] = useState(videoDuration)
  
  // Update end time when video duration changes
  if (lyricEndTime === 0 && videoDuration > 0) {
    setLyricEndTime(videoDuration)
  }
  
  const handleImport = useCallback(() => {
    if (lyricsInput.trim() && videoDuration > 0) {
      onImportLyrics(lyricsInput, videoDuration, lyricStartTime, lyricEndTime)
      setLyricsInput('')
      setIsImportMode(false)
    }
  }, [lyricsInput, videoDuration, lyricStartTime, lyricEndTime, onImportLyrics])
  
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
            placeholder="Paste your lyrics here...&#10;&#10;Each line will become a separate segment."
            value={lyricsInput}
            onChange={(e) => setLyricsInput(e.target.value)}
            className="min-h-[150px] resize-none"
          />
          
          {/* Lyric Section Time Range */}
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <Label className="text-sm font-medium">Lyric Section (where lyrics appear)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start Time (sec)</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={lyricEndTime - 0.1}
                    step={0.1}
                    value={lyricStartTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLyricStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-8"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setLyricStartTime(currentTime)}
                    title="Use current playhead position"
                  >
                    Now
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End Time (sec)</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    min={lyricStartTime + 0.1}
                    max={videoDuration}
                    step={0.1}
                    value={lyricEndTime || videoDuration}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLyricEndTime(Math.min(videoDuration, parseFloat(e.target.value) || videoDuration))}
                    className="h-8"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setLyricEndTime(currentTime)}
                    title="Use current playhead position"
                  >
                    Now
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Lyrics will be distributed evenly from {formatTime(lyricStartTime)} to {formatTime(lyricEndTime || videoDuration)}
            </p>
          </div>
          
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
            Lyrics ({segments.filter(s => s.type === SegmentType.LYRIC).length} segments)
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddLyricSection(0, videoDuration)}
              title="Add a new lyric section to group segments"
              className="text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10"
            >
              <Layers className="w-4 h-4 mr-1" />
              Section
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Insert spacer at the start of selected segment or at 0
                const selectedSeg = segments.find(s => s.id === selectedSegmentId)
                onInsertSpacer(selectedSeg?.startTime ?? 0)
              }}
              title="Insert space before selected segment"
            >
              <Pause className="w-4 h-4 mr-1" />
              Space
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsImportMode(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Import
            </Button>
          </div>
        </div>
        
        {/* Lyric Sections List */}
        {lyricSections.length > 0 && (
          <div className="mt-3 space-y-1">
            <Label className="text-xs text-muted-foreground">Lyric Sections</Label>
            <div className="flex flex-wrap gap-1">
              {lyricSections.map(section => (
                <div
                  key={section.id}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors',
                    'bg-emerald-600/20 border border-emerald-500/30 hover:border-emerald-400',
                    selectedSectionId === section.id && 'ring-1 ring-emerald-400'
                  )}
                >
                  <span>{formatTime(section.startTime)} - {formatTime(section.endTime)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 text-destructive hover:text-destructive p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveLyricSection(section.id)
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6">
          <div className="space-y-2 pb-4">
            {segments.map((segment, index) => {
              const isSpacer = segment.type === SegmentType.SPACER
              
              return (
                <div
                  key={segment.id}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-colors',
                    'hover:border-primary/50',
                    selectedSegmentId === segment.id
                      ? 'border-primary bg-primary/10'
                      : isSpacer
                        ? 'border-dashed border-muted-foreground/30 bg-muted/20'
                        : 'border-border bg-card'
                  )}
                  onClick={() => onSelectSegment(segment.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">
                        {index + 1}. {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                        {isSpacer && <span className="ml-2 text-muted-foreground">(Space)</span>}
                      </div>
                      {isSpacer ? (
                        <p className="text-sm text-muted-foreground italic flex items-center gap-1">
                          <Pause className="w-3 h-3" /> Pause / Instrumental
                        </p>
                      ) : selectedSegmentId === segment.id ? (
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
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
