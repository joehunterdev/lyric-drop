import { Settings, RefreshCw, X, Globe, Clapperboard, type LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { NewTabLink } from '@/components/ui/new-tab-link'
import { Switch } from '@/components/ui/switch'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { CONTENT_PAGE_GROUPS } from './contentPages'
import { useSettings } from '@/contexts'
import { cn, canRecordFormat } from '@/utils'
import type { ExportFileFormat } from '@/utils'

export type AppView = 'editor' | 'converter'

const EXPORT_FORMAT_HINTS: Record<ExportFileFormat, string> = {
  mp4: 'Works everywhere - Instagram, TikTok, X, phone galleries',
  webm: 'Fine for YouTube / desktop uploads; phones and Instagram may reject it',
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  currentView: AppView
  onViewChange: (view: AppView) => void
}

const VIEWS: { value: AppView; label: string; icon: LucideIcon }[] = [
  { value: 'editor', label: 'Editor', icon: Clapperboard },
  { value: 'converter', label: 'Converter', icon: RefreshCw },
]

export function Sidebar({ isOpen, onClose, currentView, onViewChange }: SidebarProps) {
  const { settings, toggleTranscoding, updateSetting } = useSettings()
  const exportFormatSupported = canRecordFormat(settings.exportFormat)

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-80 max-w-full overflow-y-auto bg-card border-l border-border z-50',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="font-semibold">Settings</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Settings Content */}
        <div className="p-4 space-y-6">
          {/* View switcher - mobile only (desktop has it in the header) */}
          <div className="md:hidden space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              View
            </h3>
            <nav className="flex flex-col" aria-label="View">
              {VIEWS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-current={currentView === value ? 'page' : undefined}
                  onClick={() => {
                    onViewChange(value)
                    onClose()
                  }}
                  className={cn(
                    'flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors text-left',
                    currentView === value
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="border-t border-border pt-4" />
          </div>

          {/* Transcoding Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Video Processing
            </h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label 
                  htmlFor="transcode-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  Auto-transcode on upload
                </label>
                <p className="text-xs text-muted-foreground">
                  Convert MOV/AVI files to MP4
                </p>
              </div>
              <Switch
                id="transcode-toggle"
                checked={settings.transcodeOnUpload}
                onCheckedChange={toggleTranscoding}
              />
            </div>
            
            {settings.transcodeOnUpload && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <RefreshCw className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-500">
                  Transcoding uses browser-based FFmpeg which can be slow for large files. 
                  For best performance, convert videos to MP4 before uploading.
                </p>
              </div>
            )}
          </div>
          
          {/* Divider */}
          <div className="border-t border-border" />

          {/* Export Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Export
            </h3>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">File format</span>
              <SegmentedControl
                label="Export file format"
                value={settings.exportFormat}
                onChange={value => updateSetting('exportFormat', value)}
                options={[
                  { value: 'mp4', label: 'MP4' },
                  { value: 'webm', label: 'WebM' },
                ]}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {EXPORT_FORMAT_HINTS[settings.exportFormat]}
            </p>

            {!exportFormatSupported && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <RefreshCw className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-500">
                  This browser can't record {settings.exportFormat.toUpperCase()}, so exports
                  will fall back to {settings.exportFormat === 'mp4' ? 'WebM' : 'MP4'}.
                  {settings.exportFormat === 'mp4' && ' Use the Converter tab to turn it into MP4, or export from Chrome, Edge or Safari.'}
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Info Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Supported Formats
            </h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><span className="text-green-500">●</span> MP4, WebM, OGG — Native playback</p>
              <p><span className="text-amber-500">●</span> MOV, AVI, MKV — Requires transcoding</p>
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-border" />
          
          {/* Content pages, one section per language */}
          {CONTENT_PAGE_GROUPS.map(group => (
            <div key={group.code} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                {group.name}
              </h3>
              <nav className="flex flex-col" aria-label={group.name}>
                {group.links.map(({ label, href, icon: Icon }) => (
                  <NewTabLink
                    key={href}
                    href={href}
                    className="flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </NewTabLink>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
