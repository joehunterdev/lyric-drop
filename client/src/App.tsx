import { useState } from 'react'
import { Settings } from 'lucide-react'

import { useVideoPlayer, useTimeline } from '@/hooks'
import { SettingsProvider } from '@/contexts'
import { VideoPlayer } from '@/components/VideoPlayer'
import { Timeline } from '@/components/Timeline'
import { LyricEditor } from '@/components/LyricEditor'
import { ExportButton } from '@/components/ExportButton'
import { Sidebar } from '@/components/layout'
import { Button } from '@/components/ui/button'
import './index.css'

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const {
    videoRef,
    videoState,
    loadVideo,
    togglePlayPause,
    seek,
  } = useVideoPlayer()
  
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
  } = useTimeline(videoState.currentTime)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 bg-[rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo_75.png" 
              alt="Joe Hunter" 
              className="h-8 w-auto"
            />
            <h1 className="text-xl font-bold text-muted-foreground">
              Lyric Drop
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton
              videoRef={videoRef}
              segments={segments}
              compact
            />
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
      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player - Left/Center */}
          <div className="lg:col-span-2">
            <VideoPlayer
              videoRef={videoRef}
              videoState={videoState}
              activeSegment={activeSegment}
              onLoadVideo={loadVideo}
              onTogglePlayPause={togglePlayPause}
              onSeek={seek}
            />
            
            {/* Timeline */}
            <div className="mt-6">
              <Timeline
                segments={segments}
                lyricSections={lyricSections}
                selectedSegmentId={selectedSegmentId}
                selectedSectionId={selectedSectionId}
                currentTime={videoState.currentTime}
                duration={videoState.duration}
                timelineState={timelineState}
                isPlaying={videoState.isPlaying}
                onSelectSegment={selectSegment}
                onUpdateSegment={updateSegment}
                onInsertSpacer={insertSpacer}
                onSelectSection={selectLyricSection}
                onUpdateSection={updateLyricSection}
                onSeek={seek}
                onZoom={setZoom}
              />
            </div>
          </div>
          
          {/* Lyric Editor - Right */}
          <div className="lg:col-span-1 min-h-[400px]">
            <LyricEditor
              segments={segments}
              lyricSections={lyricSections}
              selectedSegmentId={selectedSegmentId}
              selectedSectionId={selectedSectionId}
              videoDuration={videoState.duration}
              currentTime={videoState.currentTime}
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
      </main>
      
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Footer */}
      <footer className="border-t border-border px-4 py-3 mt-auto bg-[rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <span className="text-primary font-semibold">Lyric Drop</span> v0.1.0 • Built by{' '}
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
