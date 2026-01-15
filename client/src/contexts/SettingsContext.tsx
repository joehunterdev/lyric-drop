import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface Settings {
  transcodeOnUpload: boolean
  // Future settings can be added here
}

interface SettingsContextType {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  toggleTranscoding: () => void
}

const defaultSettings: Settings = {
  transcodeOnUpload: false, // Default: no transcoding
}

const SettingsContext = createContext<SettingsContextType | null>(null)

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  
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
