import { useState, useMemo, useCallback } from 'react'
import { Settings, FileVideo, ImageIcon } from 'lucide-react'

import { useMediaPlayer, useImageBackground, useTimeline } from '@/hooks'
import type { ExportSource } from '@/hooks/useCanvasExport'
import { SettingsProvider } from '@/contexts'
import { VideoPlayer } from '@/components/VideoPlayer'
import { ImageStage } from '@/components/ImageStage'
import { Timeline } from '@/components/Timeline'
import { LyricEditor } from '@/components/LyricEditor'
import { ExportButton } from '@/components/ExportButton'
import { Sidebar, LanguageNav } from '@/components/layout'
import { VideoConverter } from '@/components/VideoConverter'
import { Button } from '@/components/ui/button'
import { SourceMode, OutputFormat, ImageFit } from '@/types'
import type { LyricBox } from '@/types'
import { OUTPUT_FORMATS } from '@/utils'
import './index.css'

type AppView = 'editor' | 'converter'

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentView, setCurrentView] = useState<AppView>('editor')
  const [sourceMode, setSourceMode] = useState<SourceMode>(SourceMode.VIDEO)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(OutputFormat.REEL)
  const [imageFit, setImageFit] = useState<ImageFit>(ImageFit.COVER)
  const [lyricBoxes, setLyricBoxes] = useState<Record<OutputFormat, LyricBox>>({
    reel: OUTPUT_FORMATS.reel.lyricBox,
    youtube: OUTPUT_FORMATS.youtube.lyricBox,
  })
  const lyricBox = lyricBoxes[outputFormat]

  const setLyricBox = useCallback((box: LyricBox) => {
    setLyricBoxes(prev => ({ ...prev, [outputFormat]: box }))
  }, [outputFormat])

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

  // Switching source clears the loaded media; lyrics are kept
  const changeSourceMode = useCallback((mode: SourceMode) => {
    if (mode === sourceMode) return
    resetMedia()
    clearImage()
    setSourceMode(mode)
  }, [sourceMode, resetMedia, clearImage])

  const exportSource = useMemo<ExportSource>(() => (
    sourceMode === SourceMode.IMAGE
      ? { kind: 'image', image, format: outputFormat, fit: imageFit, box: lyricBox }
      : { kind: 'video' }
  ), [sourceMode, image, outputFormat, imageFit, lyricBox])

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 bg-[rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="Joe Hunter" 
              className="h-8 w-auto"
            />
            <h1 className="text-lg font-semibold text-primary leading-8">
              Lyric Drop
            </h1>
          </div>
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
                mediaRef={mediaRef}
                segments={segments}
                source={exportSource}
                disabled={!mediaState.isLoaded}
                compact
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
                    format={outputFormat}
                    fit={imageFit}
                    onFormatChange={setOutputFormat}
                    onFitChange={setImageFit}
                lyricBox={lyricBox}
                onLyricBoxChange={setLyricBox}
                    onLoadImage={loadImage}
                    onLoadAudio={loadAudio}
                    onTogglePlayPause={togglePlayPause}
                    onSeek={seek}
                  />
                ) : (
                  <VideoPlayer
                    mediaRef={mediaRef}
                    mediaState={mediaState}
                    activeSegment={activeSegment}
                    onLoadVideo={loadVideo}
                    onTogglePlayPause={togglePlayPause}
                    onSeek={seek}
                  />
                )}
              </div>

              {/* Lyric Editor - Right sidebar; capped height + internal scroll on desktop */}
              <div className="lg:col-span-1 min-h-[400px] lg:max-h-[80vh] overflow-hidden">
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
                isPlaying={mediaState.isPlaying}
                onSelectSegment={selectSegment}
                onUpdateSegment={updateSegment}
                onInsertSpacer={insertSpacer}
                onSelectSection={selectLyricSection}
                onUpdateSection={updateLyricSection}
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
          <a 
            href="https://joehunter.dev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            Joe Hunter
          </a>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  )
}

export default App
