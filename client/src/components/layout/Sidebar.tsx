import { Settings, RefreshCw, X, Globe } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { NewTabLink } from '@/components/ui/new-tab-link'
import { Switch } from '@/components/ui/switch'
import { CONTENT_PAGE_GROUPS } from './contentPages'
import { useSettings } from '@/contexts'
import { cn } from '@/utils'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { settings, toggleTranscoding } = useSettings()
  
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
          'fixed top-0 right-0 h-full w-80 bg-card border-l border-border z-50',
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
