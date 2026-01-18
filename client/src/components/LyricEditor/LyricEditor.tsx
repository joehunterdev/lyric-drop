import { useState, useCallback, useMemo } from 'react'
import { FileText, Trash2, Plus, Pause, Layers, ChevronDown, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
  onAppendLyrics: (text: string, sectionStart: number, sectionEnd: number, existingSegmentIds: string[]) => void
  onSelectSegment: (id: string | null) => void
  onUpdateSegment: (id: string, updates: Partial<LyricSegment>) => void
  onRemoveSegment: (id: string) => void
  onInsertSpacer: (atTime: number, duration?: number) => void
  onAddLyricSection: (startTime?: number, endTime?: number) => void
  onRemoveLyricSection: (id: string) => void
  onSelectSection: (id: string | null) => void
}

export function LyricEditor({
  segments,
  lyricSections,
  selectedSegmentId,
  selectedSectionId,
  videoDuration,
  onImportLyrics,
  onAppendLyrics,
  onSelectSegment,
  onUpdateSegment,
  onRemoveSegment,
  onInsertSpacer,
  onAddLyricSection,
  onRemoveLyricSection,
  onSelectSection,
}: LyricEditorProps) {
  const [lyricsInput, setLyricsInput] = useState('')
  const [isAddingSection, setIsAddingSection] = useState(false)
  const [importingSectionId, setImportingSectionId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  
  // Get segments grouped by which section they belong to
  const getSegmentsInSection = useCallback((section: LyricSection) => {
    return segments.filter(seg => 
      seg.startTime >= section.startTime && seg.endTime <= section.endTime
    )
  }, [segments])
  
  // Get segments not in any section
  const orphanSegments = useMemo(() => {
    return segments.filter(seg => {
      return !lyricSections.some(section => 
        seg.startTime >= section.startTime && seg.endTime <= section.endTime
      )
    })
  }, [segments, lyricSections])
  
  const handleAddSection = useCallback(() => {
    // Find the end of the last section, or start at 0 if no sections exist
    const lastSectionEnd = lyricSections.length > 0
      ? Math.max(...lyricSections.map(s => s.endTime))
      : 0
    
    // New section starts after last section
    const newStart = lastSectionEnd
    
    // Only add if there's room (need at least 1 second)
    if (newStart >= videoDuration - 1) {
      alert('No room for new section. Try resizing or deleting an existing section.')
      return
    }
    
    // New section fills all remaining space to video duration
    const newEnd = videoDuration
    
    onAddLyricSection(newStart, newEnd)
    setIsAddingSection(true)
  }, [onAddLyricSection, videoDuration, lyricSections])
  
  const handleImportToSection = useCallback((sectionId: string) => {
    if (!lyricsInput.trim() || videoDuration === 0) return
    
    const section = lyricSections.find(s => s.id === sectionId)
    if (!section) return
    
    // Check if section already has segments
    const existingSegments = segments.filter(seg => 
      seg.startTime >= section.startTime && seg.endTime <= section.endTime
    )
    
    if (existingSegments.length > 0) {
      // Append to existing - redistribute all segments within section
      const existingIds = existingSegments.map(seg => seg.id)
      onAppendLyrics(lyricsInput, section.startTime, section.endTime, existingIds)
    } else {
      // Fresh import for empty section
      onImportLyrics(lyricsInput, videoDuration, section.startTime, section.endTime)
    }
    
    setLyricsInput('')
    setIsAddingSection(false)
    setImportingSectionId(null)
    // Expand the section to show imported lyrics
    setExpandedSections(prev => new Set([...prev, sectionId]))
  }, [lyricsInput, videoDuration, lyricSections, segments, onImportLyrics, onAppendLyrics])
  
  const toggleSectionExpanded = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  const renderSegment = (segment: LyricSegment, index: number) => {
    const isSpacer = segment.type === SegmentType.SPACER
    
    return (
      <div
        key={segment.id}
        className={cn(
          'p-2 rounded-md border cursor-pointer transition-colors',
          'hover:border-primary/50',
          selectedSegmentId === segment.id
            ? 'border-primary bg-primary/10'
            : isSpacer
              ? 'border-dashed border-muted-foreground/30 bg-muted/20'
              : 'border-border bg-card/50'
        )}
        onClick={() => onSelectSegment(segment.id)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-muted-foreground mb-0.5">
              {index + 1}. {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
              {isSpacer && <span className="ml-1">(Space)</span>}
            </div>
            {isSpacer ? (
              <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                <Pause className="w-3 h-3" /> Pause
              </p>
            ) : selectedSegmentId === segment.id ? (
              <Textarea
                value={segment.text}
                onChange={(e) => onUpdateSegment(segment.id, { text: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="min-h-[50px] text-sm"
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
            className="flex-shrink-0 h-6 w-6 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onRemoveSegment(segment.id)
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    )
  }
  
  // No sections yet - show "Add Lyric Section" prompt
  if (lyricSections.length === 0 && segments.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Lyrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add a lyric section to get started. Sections define where lyrics appear in your video.
          </p>
          
          <Button
            onClick={handleAddSection}
            disabled={videoDuration === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500"
          >
            <Layers className="w-4 h-4 mr-2" />
            Add Lyric Section
          </Button>
          
          {videoDuration === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Upload a video first to add lyrics.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Lyrics ({segments.filter(s => s.type === SegmentType.LYRIC).length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddSection}
            title="Add a new lyric section"
            className="text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10"
          >
            <Plus className="w-4 h-4 mr-1" />
            Section
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4">
          <div className="space-y-3 pb-4">
            {/* Lyric Sections with nested segments */}
            {lyricSections.map(section => {
              const sectionSegments = getSegmentsInSection(section)
              const isExpanded = expandedSections.has(section.id)
              const isSelected = selectedSectionId === section.id
              const isNewSection = isAddingSection && section === lyricSections[lyricSections.length - 1]
              
              return (
                <div
                  key={section.id}
                  className={cn(
                    'rounded-lg border-2 overflow-hidden transition-colors',
                    'border-emerald-500/30 bg-emerald-500/5',
                    isSelected && 'border-emerald-400 ring-1 ring-emerald-400'
                  )}
                >
                  {/* Section Header */}
                  <div
                    className={cn(
                      'flex items-center justify-between px-3 py-2 cursor-pointer',
                      'bg-emerald-600/20 hover:bg-emerald-600/30 transition-colors'
                    )}
                    onClick={() => {
                      onSelectSection(section.id)
                      toggleSectionExpanded(section.id)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded || isNewSection ? (
                        <ChevronDown className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-emerald-400" />
                      )}
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-200">
                        {formatTime(section.startTime)} - {formatTime(section.endTime)}
                      </span>
                      <span className="text-xs text-emerald-400/70">
                        ({sectionSegments.length} segments)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveLyricSection(section.id)
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {/* Section Content - Import or Segments */}
                  {(isExpanded || isNewSection) && (
                    <div className="p-3 space-y-2">
                      {/* Show import textarea for new sections or empty sections (at top) */}
                      {(isNewSection || sectionSegments.length === 0) && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Paste lyrics here... Each line becomes a segment."
                            value={lyricsInput}
                            onChange={(e) => setLyricsInput(e.target.value)}
                            className="min-h-[100px] resize-none text-sm"
                            autoFocus={isNewSection}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleImportToSection(section.id)}
                              disabled={!lyricsInput.trim()}
                              className="flex-1"
                            >
                              Import Lyrics
                            </Button>
                            {isNewSection && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setIsAddingSection(false)
                                  setImportingSectionId(null)
                                  setLyricsInput('')
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Segments list */}
                      {sectionSegments.length > 0 && (
                        <div className="space-y-1">
                          {sectionSegments.map((seg, idx) => renderSegment(seg, idx))}
                        </div>
                      )}
                      
                      {/* Add more lyrics - show at bottom when section has segments */}
                      {sectionSegments.length > 0 && (
                        <div className="pt-2 border-t border-border/30">
                          {importingSectionId === section.id ? (
                            <div className="space-y-2">
                              <Textarea
                                placeholder="Paste additional lyrics here..."
                                value={lyricsInput}
                                onChange={(e) => setLyricsInput(e.target.value)}
                                className="min-h-[80px] resize-none text-sm"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleImportToSection(section.id)}
                                  disabled={!lyricsInput.trim()}
                                  className="flex-1"
                                >
                                  Add Lyrics
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setImportingSectionId(null)
                                    setLyricsInput('')
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setImportingSectionId(section.id)
                                  setLyricsInput('')
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add More Lyrics
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  // If a segment in this section is selected, insert after it
                                  // Otherwise insert after the last segment
                                  const selectedInSection = sectionSegments.find(s => s.id === selectedSegmentId)
                                  const targetSegment = selectedInSection ?? sectionSegments[sectionSegments.length - 1]
                                  if (targetSegment) {
                                    onInsertSpacer(targetSegment.endTime)
                                  }
                                }}
                              >
                                <Pause className="w-3 h-3 mr-1" />
                                Space
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            
            {/* Orphan segments (not in any section) */}
            {orphanSegments.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground mb-2">
                  Segments outside sections
                </div>
                <div className="space-y-1">
                  {orphanSegments.map((seg, idx) => renderSegment(seg, idx))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
