import { useState, useMemo, useCallback, useEffect } from 'react'
import { Settings, FileVideo, ImageIcon, FileText, Palette } from 'lucide-react'

import { useMediaPlayer, useImageBackground, useTimeline, useCanvasExport, useWaveform } from '@/hooks'
import type { ExportSource } from '@/hooks/useCanvasExport'
import { SettingsProvider, OverlayProvider, useOverlay, useSettings } from '@/contexts'
import { VideoPlayer } from '@/components/VideoPlayer'
import { ImageStage } from '@/components/ImageStage'
import { Timeline } from '@/components/Timeline'
import { LyricEditor } from '@/components/LyricEditor'
import { StylePanel } from '@/components/StylePanel'
import { ExportButton, ExportProgress } from '@/components/ExportButton'
import { Sidebar, LanguageNav } from '@/components/layout'
import { VideoConverter } from '@/components/VideoConverter'
import { Button } from '@/components/ui/button'
import { NewTabLink } from '@/components/ui/new-tab-link'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SourceMode, OutputFormat, ImageFit, ExportStatus } from '@/types'
import { isImageFile, validateImageFile, validateVideoFile } from '@/utils'
import './index.css'

/** Shown in the paused preview when no lyric is selected or on screen */
const SAMPLE_LYRIC = 'Sample lyric line'

type AppView = 'editor' | 'converter'

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 bg-[rgba(0,0,0,0.8)]">
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
            <span className="text-xl font-bold tracking-tight text-foreground">
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
            {/* View Switcher */}
            <div className="flex gap-1 mr-2">
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
          <div className="max-w-7xl mx-auto p-4">
            {/* Row 1: Video Player (center) + Lyric Editor (scrollable sidebar on desktop) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
              {/* Video Player - Left/Center */}
              <div className="lg:col-span-2">
                {/* Source Mode Switcher */}
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
                    onTogglePlayPause={togglePlayPause}
                    onSeek={seek}
                  />
                ) : (
                  <VideoPlayer
                    mediaRef={mediaRef}
                    mediaState={mediaState}
                    activeSegment={activeSegment}
                    onLoadFile={loadStageFile}
                    onTogglePlayPause={togglePlayPause}
                    onSeek={seek}
                  />
                )}
              </div>

              {/* Lyrics / Style - Right sidebar; capped height + internal scroll on desktop */}
              <div className="lg:col-span-1 min-h-[400px] lg:h-[80vh] overflow-hidden flex flex-col">
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
                  </TabsContent>
                  <TabsContent value="style" className="min-h-0 overflow-hidden flex flex-col">
                    <StylePanel isImageMode={sourceMode === SourceMode.IMAGE} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Row 2: Timeline - full width */}
            <div className="mt-6">
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
              />
            </div>
          </div>
        ) : (
          <VideoConverter />
        )}
      </main>
      
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Footer */}
      <footer className="border-t border-border px-4 py-3 mt-auto bg-[rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <span className="text-primary font-semibold">Lyric Drop</span> v0.2.0 • Built by{' '}
          <NewTabLink
            href="https://joehunter.dev"
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
