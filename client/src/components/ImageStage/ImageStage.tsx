import { useRef, useCallback, useEffect, useState } from 'react'
import {
  Upload,
  ImageIcon,
  Music,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  RotateCcw,
  Smartphone,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { PlaybackControls } from '@/components/VideoPlayer/PlaybackControls'
import { LyricBoxEditor } from './LyricBoxEditor'
import { SafeZoneOverlay } from './SafeZoneOverlay'
import { useOverlay } from '@/contexts'
import { useFontsVersion } from '@/hooks'
import { cn } from '@/utils/cn'
import {
  renderFrame,
  formatMaxFileSize,
  OUTPUT_FORMATS,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_AUDIO_EXTENSIONS,
  ALLOWED_AUDIO_TYPES,
} from '@/utils'
import { ImageFit, OutputFormat } from '@/types'
import type { MediaState, LyricSegment, ImageBackground, LyricBox } from '@/types'

interface ImageStageProps {
  mediaRef: React.RefObject<HTMLMediaElement | null>
  mediaState: MediaState
  image: ImageBackground | null
  activeSegment: LyricSegment | null
  /** Line shown faded while paused with no lyric on screen, so style edits are visible */
  sampleText: string
  format: OutputFormat
  fit: ImageFit
  onFormatChange: (format: OutputFormat) => void
  onFitChange: (fit: ImageFit) => void
  onLoadImage: (file: File) => Promise<void>
  onLoadAudio: (file: File) => Promise<void>
  onTogglePlayPause: () => void
  onSeek: (time: number) => void
}

const FIT_LABELS: Record<ImageFit, string> = {
  [ImageFit.COVER]: 'Cover',
  [ImageFit.BLUR_FILL]: 'Blur fill',
}

/**
 * Image-mode preview: a still image + audio track, rendered with the same
 * renderFrame used by export so the preview matches the output exactly
 */
export function ImageStage({
  mediaRef,
  mediaState,
  image,
  activeSegment,
  sampleText,
  format,
  fit,
  onFormatChange,
  onFitChange,
  onLoadImage,
  onLoadAudio,
  onTogglePlayPause,
  onSeek,
}: ImageStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  const [showSafeZones, setShowSafeZones] = useState(false)
  const { style, lyricBoxes, setLyricBox } = useOverlay()
  const fontsVersion = useFontsVersion()

  const { width, height } = OUTPUT_FORMATS[format]
  const lyricBox = lyricBoxes[format]
  const onLyricBoxChange = useCallback((box: LyricBox) => setLyricBox(format, box), [setLyricBox, format])

  // While paused with nothing on screen, show a faded sample line to style against
  const activeText = activeSegment?.text ?? null
  const isSample = !activeText && !mediaState.isPlaying
  const text = activeText ?? (isSample ? sampleText : null)

  // Redraw the preview whenever anything visible changes (incl. a font finishing loading)
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    if (image) {
      renderFrame(ctx, width, height, {
        background: { kind: 'image', source: image.bitmap, fit },
        text,
        overlay: { style, box: lyricBox },
        ghost: isSample,
      })
    } else {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, width, height)
    }
  }, [image, fit, width, height, text, isSample, style, lyricBox, fontsVersion])

  const handleFileSelect = useCallback(
    (onLoad: (file: File) => Promise<void>) => async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]

      // Reset input FIRST so same file can be selected again
      e.target.value = ''

      if (!file) return

      try {
        await onLoad(file)
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to load file')
      }
    },
    []
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Format + fit options */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          label="Output format"
          size="md"
          value={format}
          onChange={onFormatChange}
          options={Object.values(OutputFormat).map(value => ({
            value,
            label: OUTPUT_FORMATS[value].label,
          }))}
        />
        <SegmentedControl
          label="Image fit"
          size="md"
          value={fit}
          onChange={onFitChange}
          options={Object.values(ImageFit).map(value => ({
            value,
            label: FIT_LABELS[value],
          }))}
        />
      </div>

      {/* Lyric box position */}
      {image && (
        <div className="flex items-center gap-1 -mt-2">
          <span className="text-xs text-muted-foreground mr-1">Lyric box</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onLyricBoxChange({ ...lyricBox, x: (1 - lyricBox.width) / 2 })}
            title="Centre horizontally"
          >
            <AlignHorizontalJustifyCenter className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onLyricBoxChange({ ...lyricBox, y: (1 - lyricBox.height) / 2 })}
            title="Centre vertically"
          >
            <AlignVerticalJustifyCenter className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onLyricBoxChange(OUTPUT_FORMATS[format].lyricBox)}
            title="Reset lyric box"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          {format === OutputFormat.REEL && (
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-7 ml-auto', showSafeZones && 'bg-muted text-foreground')}
              onClick={() => setShowSafeZones(on => !on)}
              aria-pressed={showSafeZones}
              title="Show where Instagram / TikTok UI covers the frame"
            >
              <Smartphone className="w-4 h-4 mr-1" />
              Safe zones
            </Button>
          )}
        </div>
      )}

      {/* Stage - sized to the exact frame aspect so the lyric box overlay lines up */}
      <div className="relative flex justify-center bg-black rounded-lg overflow-hidden">
        <div
          className="relative"
          style={{
            width: `min(100%, calc(60vh * ${width / height}))`,
            aspectRatio: `${width} / ${height}`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full h-full block"
          />

          {image && showSafeZones && format === OutputFormat.REEL && <SafeZoneOverlay />}

          {image && (
            <LyricBoxEditor
              box={lyricBox}
              onChange={onLyricBoxChange}
              isPlaying={mediaState.isPlaying}
              showHint={!text}
            />
          )}
        </div>

        {!image && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-card/50 transition-colors"
            onClick={() => imageInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Click to upload image</p>
            <p className="text-sm text-muted-foreground mt-1">
              <ImageIcon className="w-3 h-3 inline mr-1" />
              {ALLOWED_IMAGE_EXTENSIONS.join(', ')} (max {formatMaxFileSize()})
            </p>
          </div>
        )}
      </div>

      {/* Source files */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="justify-start min-w-0"
          onClick={() => imageInputRef.current?.click()}
          title={image ? `Replace image (${image.file.name})` : 'Upload image'}
        >
          <ImageIcon className="w-4 h-4 mr-2 shrink-0" />
          <span className="truncate">{image ? image.file.name : 'Upload image'}</span>
        </Button>
        <Button
          variant={mediaState.isLoaded ? 'outline' : 'default'}
          className="justify-start min-w-0"
          onClick={() => audioInputRef.current?.click()}
          title={mediaState.file ? `Replace audio (${mediaState.file.name})` : 'Upload audio'}
        >
          <Music className="w-4 h-4 mr-2 shrink-0" />
          <span className="truncate">{mediaState.file ? mediaState.file.name : 'Upload audio'}</span>
        </Button>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_IMAGE_EXTENSIONS].join(',')}
        className="hidden"
        onChange={handleFileSelect(onLoadImage)}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept={[...ALLOWED_AUDIO_TYPES, ...ALLOWED_AUDIO_EXTENSIONS].join(',')}
        className="hidden"
        onChange={handleFileSelect(onLoadAudio)}
      />

      {mediaState.url && (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement | null>}
          src={mediaState.url}
          preload="auto"
        />
      )}

      {/* Playback Controls */}
      {mediaState.isLoaded && (
        <PlaybackControls
          mediaState={mediaState}
          onTogglePlayPause={onTogglePlayPause}
          onSeek={onSeek}
        />
      )}
    </div>
  )
}
