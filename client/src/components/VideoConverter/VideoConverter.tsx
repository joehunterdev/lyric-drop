import { useState } from 'react'
import { Upload, FileVideo, Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react'

import { useFFmpeg, TranscodeStatus } from '@/hooks/useFFmpeg'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { logger } from '@/utils'

type OutputFormat = 'mp4' | 'webm' | 'gif'
type QualityPreset = 'high' | 'medium' | 'low'
type ConversionMethod = 'browser' | 'server'

const CONVERTER_ENABLED = import.meta.env.VITE_CONVERTER_SERVER_ENABLED === 'true'
const CONVERTER_URL = import.meta.env.VITE_CONVERTER_SERVER_URL || 'http://localhost:3001'

interface FormatOption {
  value: OutputFormat
  label: string
  description: string
  icon: string
}

const FORMAT_OPTIONS: FormatOption[] = [
  { value: 'mp4', label: 'MP4 (H.264)', description: 'Best compatibility', icon: '🎬' },
  { value: 'webm', label: 'WebM (VP9)', description: 'Smaller file size', icon: '🌐' },
  { value: 'gif', label: 'Animated GIF', description: 'For sharing', icon: '🎞️' },
]

const QUALITY_PRESETS: Record<QualityPreset, { label: string; crf: string }> = {
  high: { label: 'High Quality', crf: '18' },
  medium: { label: 'Medium Quality', crf: '23' },
  low: { label: 'Low Quality (Fast)', crf: '28' },
}

export function VideoConverter() {
  const { isLoaded, isLoading, progress, loadFFmpeg, transcodeToMp4, isFormatSupported } = useFFmpeg()
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('mp4')
  const [quality, setQuality] = useState<QualityPreset>('medium')
  const [convertedFile, setConvertedFile] = useState<File | null>(null)
  const [conversionMethod, setConversionMethod] = useState<ConversionMethod>('browser')
  const [serverConverting, setServerConverting] = useState(false)
  const [serverProgress, setServerProgress] = useState(0)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      logger.info('File selected:', file.name, file.type)
      setSelectedFile(file)
      setConvertedFile(null)
    }
  }

  const handleLoadFFmpeg = async () => {
    await loadFFmpeg()
  }

  const handleConvert = async () => {
    if (!selectedFile) return

    if (conversionMethod === 'server' && CONVERTER_ENABLED) {
      await handleServerConvert()
    } else {
      await handleBrowserConvert()
    }
  }

  const handleBrowserConvert = async () => {
    const result = await transcodeToMp4(selectedFile!)
    if (result) {
      setConvertedFile(result)
      logger.info('Conversion complete:', result.name)
    }
  }

  const handleServerConvert = async () => {
    if (!selectedFile) return

    try {
      setServerConverting(true)
      setServerProgress(0)
      
      const formData = new FormData()
      formData.append('video', selectedFile)

      logger.info('Uploading to server:', CONVERTER_URL)
      
      const response = await fetch(`${CONVERTER_URL}/convert`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`)
      }

      setServerProgress(100)
      
      const blob = await response.blob()
      const convertedFileName = selectedFile.name.replace(/\.[^/.]+$/, '.mp4')
      const result = new File([blob], convertedFileName, { type: 'video/mp4' })
      
      setConvertedFile(result)
      logger.info('Server conversion complete:', result.name)
    } catch (error) {
      logger.error('Server conversion failed:', error)
      alert(`Server conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setServerConverting(false)
      setServerProgress(0)
    }
  }

  const handleDownload = () => {
    if (!convertedFile) return

    const url = URL.createObjectURL(convertedFile)
    const a = document.createElement('a')
    a.href = url
    a.download = convertedFile.name
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusIcon = () => {
    if (serverConverting) {
      return <Loader2 className="h-5 w-5 animate-spin" />
    }
    
    switch (progress.status) {
      case TranscodeStatus.COMPLETE:
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case TranscodeStatus.ERROR:
        return <XCircle className="h-5 w-5 text-red-500" />
      case TranscodeStatus.TRANSCODING:
      case TranscodeStatus.LOADING:
        return <Loader2 className="h-5 w-5 animate-spin" />
      default:
        return null
    }
  }

  const isConverting = progress.status === TranscodeStatus.TRANSCODING || serverConverting
  const currentProgress = serverConverting ? serverProgress : progress.progress

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileVideo className="h-6 w-6" />
            Video Format Converter
          </CardTitle>
          <CardDescription>
            Convert videos between formats {conversionMethod === 'server' ? 'using local server (fast!)' : 'in your browser'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Conversion Method Toggle */}
          {CONVERTER_ENABLED && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  {conversionMethod === 'server' ? <Zap className="h-4 w-4 text-yellow-500" /> : null}
                  Conversion Method
                </Label>
                <p className="text-sm text-muted-foreground">
                  {conversionMethod === 'browser' 
                    ? 'Browser (slow, no upload needed)' 
                    : 'Local Server (10-20x faster)'}
                </p>
              </div>
              <Switch
                checked={conversionMethod === 'server'}
                onCheckedChange={(checked) => setConversionMethod(checked ? 'server' : 'browser')}
              />
            </div>
          )}

          {/* Step 1: Load FFmpeg (browser mode only) */}
          {conversionMethod === 'browser' && !isLoaded && (
            <div className="space-y-3">
              <Label>Step 1: Initialize FFmpeg</Label>
              <Button 
                onClick={handleLoadFFmpeg} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading FFmpeg...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Load Video Processor
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                Downloads ~31 MB of FFmpeg WebAssembly files (one-time)
              </p>
            </div>
          )}

          {/* Step 2: Select File */}
          {(conversionMethod === 'server' || isLoaded) && (
            <div className="space-y-3">
              <Label htmlFor="video-upload">Step 2: Select Video File</Label>
              <div className="flex items-center gap-3">
                <input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
              {selectedFile && (
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  {!isFormatSupported(selectedFile) && (
                    <span className="text-yellow-500 ml-2">⚠️ Non-standard format - conversion recommended</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Choose Format */}
          {selectedFile && (
            <div className="space-y-3">
              <Label>Step 3: Output Format</Label>
              <div className="grid grid-cols-3 gap-3">
                {FORMAT_OPTIONS.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setOutputFormat(format.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      outputFormat === format.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-2xl mb-2">{format.icon}</div>
                    <div className="font-semibold text-sm">{format.label}</div>
                    <div className="text-xs text-muted-foreground">{format.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Quality */}
          {selectedFile && (
            <div className="space-y-3">
              <Label>Step 4: Quality Preset</Label>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(QUALITY_PRESETS) as [QualityPreset, typeof QUALITY_PRESETS[QualityPreset]][]).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => setQuality(key)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      quality === key
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-semibold text-sm">{preset.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Convert Button */}
          {selectedFile && (
            <div className="space-y-3">
              <Button 
                onClick={handleConvert} 
                disabled={isConverting}
                className="w-full"
                size="lg"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Converting... {currentProgress}%
                  </>
                ) : (
                  <>
                    {conversionMethod === 'server' && <Zap className="mr-2 h-4 w-4" />}
                    <FileVideo className="mr-2 h-4 w-4" />
                    Convert Video
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Progress */}
          {(progress.message || serverConverting) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon()}
                <span>{serverConverting ? 'Converting on server...' : progress.message}</span>
              </div>
              {progress.status === TranscodeStatus.TRANSCODING && (
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Download */}
          {convertedFile && (progress.status === TranscodeStatus.COMPLETE || !serverConverting) && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Conversion complete!</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Output: {convertedFile.name} ({(convertedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
              <Button onClick={handleDownload} className="w-full" variant="default">
                Download Converted Video
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {conversionMethod === 'browser' ? (
            <>
              <p>• <strong>Runs in your browser</strong> - Video never leaves your device</p>
              <p>• <strong>No server costs</strong> - All processing happens client-side</p>
              <p>• <strong>Privacy first</strong> - Your files remain 100% private</p>
              <p>• <strong>One-time load</strong> - FFmpeg loads once per session (~31 MB)</p>
              <p className="text-yellow-600">⚠️ Large files (500+ MB) may be slow or crash</p>
            </>
          ) : (
            <>
              <p>• <strong>⚡ 10-20x faster</strong> - Native FFmpeg processing</p>
              <p>• <strong>Local server</strong> - Your video stays on your machine</p>
              <p>• <strong>Hardware acceleration</strong> - Uses all CPU cores</p>
              <p>• <strong>Handles large files</strong> - No browser memory limits</p>
              <p className="text-green-600">✓ Development only - disabled in production</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
