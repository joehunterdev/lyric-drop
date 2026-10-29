import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Settings, FileText, Palette } from 'lucide-react'

import { useMediaPlayer, useImageBackground, useTimeline, useCanvasExport, useWaveform, useMediaQuery, DESKTOP_QUERY } from '@/hooks'
import type { ExportSource } from '@/hooks/useCanvasExport'
import { SettingsProvider, OverlayProvider, useOverlay, useSettings } from '@/contexts'
import { VideoPlayer } from '@/components/VideoPlayer'
import { ImageStage } from '@/components/ImageStage'
import { Timeline } from '@/components/Timeline'
import { LyricEditor, LyricStrip } from '@/components/LyricEditor'
import { StylePanel } from '@/components/StylePanel'
import { ExportButton, ExportProgress } from '@/components/ExportButton'
import { Sidebar, LanguageNav, type AppView } from '@/components/layout'
import { VideoConverter } from '@/components/VideoConverter'
import { Button } from '@/components/ui/button'
import { DockedSheet, type SheetSnap } from '@/components/ui/docked-sheet'
import { NewTabLink } from '@/components/ui/new-tab-link'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SourceMode, OutputFormat, ImageFit, ExportStatus, StageSize } from '@/types'
import type { TrimRange } from '@/types'
import { isImageFile, validateImageFile, validateVideoFile } from '@/utils'
import './index.css'

/** Shown in the paused preview when no lyric is selected or on screen */
const SAMPLE_LYRIC = 'Sample lyric line'

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stageSize, setStageSize] = useState<StageSize>(StageSize.COMPACT)
  // Slot in the timeline toolbar where the image stage renders its mobile icon row
  const [menuSlot, setMenuSlot] = useState<HTMLElement | null>(null)
  // Mobile toolbar under the stage: stage icons by default, timeline tools after touching the timeline
  const [timelineToolsOpen, setTimelineToolsOpen] = useState(false)
  // Mobile: Lyrics / Style live in a docked panel (desktop keeps the sidebar tabs)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [mobileSheet, setMobileSheet] = useState<'lyrics' | 'style' | null>(null)
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('half')
  const [currentView, setCurrentView] = useState<AppView>('editor')
  const [sourceMode, setSourceMode] = useState<SourceMode>(SourceMode.VIDEO)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(OutputFormat.REEL)
  const [imageFit, setImageFit] = useState<ImageFit>(ImageFit.COVER)
  const { style, lyricBoxes } = useOverlay()
  const { settings } = useSettings()
  const lyricBox = lyricBoxes[outputFormat]

  const {
    mediaRef,
    mediaState,
    loadVideo,
    loadAudio,
    togglePlayPause,
    seek,
    reset: resetMedia,
  } = useMediaPlayer()

  const { image, loadImage, clearImage } = useImageBackground()
  const waveform = useWaveform(mediaState.file)

  // Export range. Remembers which media it was set for, so loading another file starts
  // from its full length without needing an effect to reset it.
  const [trimState, setTrimState] = useState<{ url: string | null; range: TrimRange }>({
    url: null,
    range: { start: 0, end: 0 },
  })
  const trim = useMemo<TrimRange>(() => {
    const full = { start: 0, end: mediaState.duration }
    if (trimState.url !== mediaState.url) return full
    const start = Math.min(trimState.range.start, mediaState.duration)
    return { start, end: Math.min(trimState.range.end, mediaState.duration) || full.end }
  }, [trimState, mediaState.url, mediaState.duration])
  const handleTrimChange = useCallback(
    (range: TrimRange) => setTrimState({ url: mediaState.url, range }),
    [mediaState.url]
  )

  // Switching source clears the loaded media; lyrics are kept
  const changeSourceMode = useCallback((mode: SourceMode) => {
    if (mode === sourceMode) return
    resetMedia()
    clearImage()
    setSourceMode(mode)
  }, [sourceMode, resetMedia, clearImage])

  // The empty stage takes an image or a video - the file decides the mode.
  // Validate before switching so a bad file doesn't clear what's loaded.
  const loadStageFile = useCallback(async (file: File) => {
    const isImage = isImageFile(file)
    const validation = isImage ? validateImageFile(file) : validateVideoFile(file)
    if (!validation.valid) {
      throw new Error(isImage
        ? validation.error
        : `${validation.error}\n\nPlease convert your video using HandBrake (free) or an online converter like CloudConvert.`)
    }

    changeSourceMode(isImage ? SourceMode.IMAGE : SourceMode.VIDEO)
    await (isImage ? loadImage(file) : loadVideo(file))
  }, [changeSourceMode, loadImage, loadVideo])

  const exportSource = useMemo<ExportSource>(() => (
    sourceMode === SourceMode.IMAGE
      ? { kind: 'image', image, format: outputFormat, fit: imageFit, overlay: { style, box: lyricBox } }
      : { kind: 'video' }
  ), [sourceMode, image, outputFormat, imageFit, style, lyricBox])

  const {
    segments,
    lyricSections,
    selectedSegmentId,
    selectedSectionId,
    timelineState,
    activeSegment,
    selectSegment,
    updateSegment,
    removeSegment,
    insertSpacer,
    importLyrics,
    appendLyrics,
    setZoom,
    addLyricSection,
    removeLyricSection,
    updateLyricSection,
    selectLyricSection,
    retimeFromSegment,
    undoRetime,
    canUndoRetime,
  } = useTimeline(mediaState.currentTime)

  const sampleText = segments.find(seg => seg.id === selectedSegmentId)?.text || SAMPLE_LYRIC

  // Export lives here so the header can show its progress next to the button
  const { exportVideo, cancelExport, progress: exportProgress } = useCanvasExport({
    mediaRef,
    segments,
    source: exportSource,
    fileFormat: settings.exportFormat,
    trim,
  })
  const canExport = mediaState.isLoaded && segments.length > 0 &&
    (exportSource.kind === 'video' || !!exportSource.image)
  const isExporting = exportProgress.status === ExportStatus.PREPARING ||
    exportProgress.status === ExportStatus.PROCESSING

  // Spacebar plays/pauses - except while typing or on a focused control (space
  // already activates those), and never mid-export since export drives playback
  useEffect(() => {
    if (currentView !== 'editor' || isExporting) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, button, a, [contenteditable="true"], [role="slider"], [role="tab"], [role="menuitem"]')) return
      e.preventDefault()
      togglePlayPause()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentView, isExporting, togglePlayPause])

  // Mobile: a tap on the stage that only dismisses the docked panel or swaps the toolbar
  // back to the stage icons must not also play/pause. Whether the tap does that is decided
  // on pointer down, before those states reset.
  const stageTapIsDismissRef = useRef(false)
  const handleStagePointerDown = () => {
    stageTapIsDismissRef.current = !isDesktop && (timelineToolsOpen || mobileSheet !== null)
    setTimelineToolsOpen(false)
  }
  const handleStageTap = () => {
    if (stageTapIsDismissRef.current) {
      stageTapIsDismissRef.current = false
      return
    }
    togglePlayPause()
  }

  // Lyrics opens tall (room to write), Style opens half so the preview stays visible
  const toggleMobileSheet = (kind: 'lyrics' | 'style') => {
    if (mobileSheet === kind) {
      setMobileSheet(null)
      return
    }
    if (!mobileSheet) setSheetSnap(kind === 'lyrics' ? 'tall' : 'half')
    setMobileSheet(kind)
  }

  const lyricEditor = (
    <LyricEditor
      segments={segments}
      lyricSections={lyricSections}
      selectedSegmentId={selectedSegmentId}
      selectedSectionId={selectedSectionId}
      videoDuration={mediaState.duration}
      currentTime={mediaState.currentTime}
      onImportLyrics={importLyrics}
      onAppendLyrics={appendLyrics}
      onSelectSegment={selectSegment}
      onUpdateSegment={updateSegment}
      onRemoveSegment={removeSegment}
      onInsertSpacer={insertSpacer}
      onAddLyricSection={addLyricSection}
      onRemoveLyricSection={removeLyricSection}
      onSelectSection={selectLyricSection}
    />
  )
  const stylePanel = <StylePanel isImageMode={sourceMode === SourceMode.IMAGE} />

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-3 lg:px-4 py-3 bg-[rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentView('editor')}
            className="flex items-center gap-2.5 shrink-0 rounded-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Lyric Drop home"
          >
            <img
              src="/logo.png"
              alt=""
              aria-hidden="true"
              className="h-7 w-7 object-contain"
            />
            <span className="text-xl font-extrabold tracking-tight text-foreground">
              <span className="text-secondary">Lyric</span>Drop
            </span>
          </button>
          {/* Export progress - only takes space while exporting */}
          {currentView === 'editor' && (
            <ExportProgress
              progress={exportProgress}
              onDismiss={cancelExport}
              className="flex-1 max-w-md mx-6"
            />
          )}
          <div className="flex items-center gap-2">
            {/* Content Pages Nav (EN / ES dropdowns) */}
            <LanguageNav />
            {/* View Switcher - desktop only; on mobile it lives in the slide panel */}
            <div className="hidden md:flex gap-1 mr-2">
              <Button
                variant={currentView === 'editor' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('editor')}
              >
                Editor
              </Button>
              <Button
                variant={currentView === 'converter' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('converter')}
              >
                Converter
              </Button>
            </div>
            {currentView === 'editor' && (
              <ExportButton
                progress={exportProgress}
                onExport={exportVideo}
                onCancel={cancelExport}
                disabled={!canExport}
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1">
        {currentView === 'editor' ? (
          <div className="max-w-7xl mx-auto px-2 py-2 lg:p-4">
            {/* Mobile order: video -> timeline -> lyrics/style.
                Desktop: video + lyrics side by side, timeline full width below. */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-6 lg:items-start">
              {/* Video Player - Left/Center */}
              <div
                className="order-1 lg:col-span-2"
                onPointerDownCapture={handleStagePointerDown}
              >
                {/* Source Mode Switcher - disabled for now: the empty stage picks the mode from the file type
                <div className="flex gap-1 mb-4">
                  <Button
                    variant={sourceMode === SourceMode.VIDEO ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => changeSourceMode(SourceMode.VIDEO)}
                  >
                    <FileVideo className="w-4 h-4 mr-2" />
                    Video
                  </Button>
                  <Button
                    variant={sourceMode === SourceMode.IMAGE ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => changeSourceMode(SourceMode.IMAGE)}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Image + Audio
                  </Button>
                </div>
                */}

                {sourceMode === SourceMode.IMAGE ? (
                  <ImageStage
                    mediaRef={mediaRef}
                    mediaState={mediaState}
                    image={image}
                    activeSegment={activeSegment}
                    sampleText={sampleText}
                    format={outputFormat}
                    fit={imageFit}
                    onFormatChange={setOutputFormat}
                    onFitChange={setImageFit}
                    onLoadImage={loadImage}
                    onLoadStageFile={loadStageFile}
                    onLoadAudio={loadAudio}
                    onTogglePlayPause={handleStageTap}
                    onSeek={seek}
                    stageSize={stageSize}
                    menuSlot={menuSlot}
                  />
                ) : (
                  <VideoPlayer
                    mediaRef={mediaRef}
                    mediaState={mediaState}
                    activeSegment={activeSegment}
                    onLoadFile={loadStageFile}
                    onTogglePlayPause={handleStageTap}
                    onSeek={seek}
                    stageSize={stageSize}
                  />
                )}
              </div>

              {/* Lyrics / Style - desktop right sidebar; capped height + internal scroll.
                  On mobile they open from the menu row in a docked panel instead. */}
              {isDesktop && (
              <div className="lg:order-2 lg:col-span-1 lg:h-[80vh] overflow-hidden flex flex-col">
                <Tabs defaultValue="lyrics" className="flex-1 min-h-0">
                  <TabsList className="w-full">
                    <TabsTrigger value="lyrics">
                      <FileText /> Lyrics
                    </TabsTrigger>
                    <TabsTrigger value="style">
                      <Palette /> Style
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="lyrics" className="min-h-0 overflow-hidden flex flex-col">
                    {lyricEditor}
                  </TabsContent>
                  <TabsContent value="style" className="min-h-0 overflow-hidden flex flex-col">
                    {stylePanel}
                  </TabsContent>
                </Tabs>
              </div>
              )}

              {/* Timeline - full width */}
              <div className="order-2 lg:order-3 lg:col-span-3 min-w-0">
                <Timeline
                  segments={segments}
                  lyricSections={lyricSections}
                  selectedSegmentId={selectedSegmentId}
                  selectedSectionId={selectedSectionId}
                  currentTime={mediaState.currentTime}
                  duration={mediaState.duration}
                  timelineState={timelineState}
                  waveform={waveform}
                  isPlaying={mediaState.isPlaying}
                  onSelectSegment={selectSegment}
                  onUpdateSegment={updateSegment}
                  onInsertSpacer={insertSpacer}
                  onSelectSection={selectLyricSection}
                  onUpdateSection={updateLyricSection}
                  onAddSection={addLyricSection}
                  onSeek={seek}
                  onZoom={setZoom}
                  onRetime={retimeFromSegment}
                  onUndoRetime={undoRetime}
                  canUndoRetime={canUndoRetime}
                  hasMobileMenu
                  mobileMenuExtra={
                    <>
                      <Button
                        variant={mobileSheet === 'lyrics' ? 'secondary' : 'outline'}
                        size="icon"
                        data-docked-sheet-toggle
                        onClick={() => toggleMobileSheet('lyrics')}
                        aria-label="Lyrics"
                        title="Lyrics"
                      >
                        <FileText />
                      </Button>
                      <Button
                        variant={mobileSheet === 'style' ? 'secondary' : 'outline'}
                        size="icon"
                        data-docked-sheet-toggle
                        onClick={() => toggleMobileSheet('style')}
                        aria-label="Style"
                        title="Style"
                      >
                        <Palette />
                      </Button>
                    </>
                  }
                  toolsOpen={timelineToolsOpen}
                  onToolsOpenChange={setTimelineToolsOpen}
                  stageSize={stageSize}
                  onStageSizeChange={setStageSize}
                  trim={trim}
                  onTrimChange={handleTrimChange}
                  onMenuSlotChange={setMenuSlot}
                />
              </div>

              {/* Mobile: quick inline lyric editing under the timeline (full editor via the panel) */}
              {!isDesktop && (
                <LyricStrip
                  className="order-3"
                  segments={segments}
                  lyricSections={lyricSections}
                  selectedSegmentId={selectedSegmentId}
                  selectedSectionId={selectedSectionId}
                  videoDuration={mediaState.duration}
                  onSelectSegment={selectSegment}
                  onUpdateSegment={updateSegment}
                  onRemoveSegment={removeSegment}
                  onImportLyrics={importLyrics}
                  onAppendLyrics={appendLyrics}
                  onAddLyricSection={addLyricSection}
                  onSeek={seek}
                  onOpenFull={() => {
                    if (!mobileSheet) setSheetSnap('tall')
                    setMobileSheet('lyrics')
                  }}
                />
              )}
            </div>

            {!isDesktop && (
              <DockedSheet
                open={mobileSheet !== null}
                onClose={() => setMobileSheet(null)}
                title={mobileSheet === 'style' ? 'Style' : 'Lyrics'}
                snap={sheetSnap}
                onSnapChange={setSheetSnap}
              >
                {mobileSheet === 'lyrics' && lyricEditor}
                {mobileSheet === 'style' && stylePanel}
              </DockedSheet>
            )}
          </div>
        ) : (
          <VideoConverter />
        )}
      </main>
      
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      
      {/* Footer */}
      <footer className="border-t border-border px-4 py-3 mt-auto bg-[rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <span className="text-primary font-semibold">Lyric Drop</span> v0.2.8 • Built by{' '}
          <NewTabLink
            href="https://joehunter.es"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            Joe Hunter
          </NewTabLink>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <SettingsProvider>
      <OverlayProvider>
        <AppContent />
      </OverlayProvider>
    </SettingsProvider>
  )
}

export default App
