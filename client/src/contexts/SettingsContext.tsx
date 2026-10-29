import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

import { DEFAULT_EXPORT_FORMAT } from '@/utils'
import type { ExportFileFormat } from '@/utils'

interface Settings {
  transcodeOnUpload: boolean
  /** Preferred export file format */
  exportFormat: ExportFileFormat
}

interface SettingsContextType {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  toggleTranscoding: () => void
}

const defaultSettings: Settings = {
  transcodeOnUpload: false, // Default: no transcoding
  exportFormat: DEFAULT_EXPORT_FORMAT,
}

const STORAGE_KEY = 'lyricdrop.settings.v1'

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings
  } catch {
    return defaultSettings
  }
}

const SettingsContext = createContext<SettingsContextType | null>(null)

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  // Remember choices across reloads
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Storage blocked - settings just won't survive a refresh
    }
  }, [settings])

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleTranscoding = useCallback(() => {
    setSettings(prev => ({ ...prev, transcodeOnUpload: !prev.transcodeOnUpload }))
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, toggleTranscoding }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
