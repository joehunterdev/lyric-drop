import { useRef, useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Upload,
  ImageIcon,
  Music,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  RotateCcw,
  Smartphone,
  RectangleVertical,
  Crop,
  Move,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
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
  ALLOWED_VIDEO_EXTENSIONS,
  ALLOWED_VIDEO_TYPES,
} from '@/utils'
import { ImageFit, OutputFormat, StageSize } from '@/types'
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
  /** Empty-stage upload: takes an image or a video - a video switches to video mode */
  onLoadStageFile: (file: File) => Promise<void>
  onLoadAudio: (file: File) => Promise<void>
  onTogglePlayPause: () => void
  onSeek: (time: number) => void
  /** Mobile preview sizing: compact, full width, or cropped to fill */
  stageSize: StageSize
  /** Mobile: element in the timeline toolbar that the icon row is rendered into */
  menuSlot: HTMLElement | null
}

const FIT_LABELS: Record<ImageFit, string> = {
  [ImageFit.COVER]: 'Cover',
  [ImageFit.BLUR_FILL]: 'Blur fill',
}

/** Which control the mobile slide-up panel is showing */
type MobileSheet = 'format' | 'fit' | 'image' | 'audio' | 'box'

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
  onLoadStageFile,
  onLoadAudio,
  onTogglePlayPause,
  onSeek,
  stageSize,
  menuSlot,
}: ImageStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  const [showSafeZones, setShowSafeZones] = useState(false)
  const [sheet, setSheet] = useState<MobileSheet | null>(null)
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

  // Mobile: one row of icons, each pulls up a slide panel. It lives in the timeline
  // toolbar (below the preview), so it is portalled into the slot Timeline provides.
  const mobileMenu = (
    <>
        <Button
          variant={sheet === 'format' ? 'secondary' : 'outline'}
          size="icon"
          onClick={() => setSheet('format')}
          aria-label="Output format"
          title="Output format"
        >
          <RectangleVertical />
        </Button>
        <Button
          variant={sheet === 'fit' ? 'secondary' : 'outline'}
          size="icon"
          onClick={() => setSheet('fit')}
          aria-label="Image fit"
          title="Image fit"
        >
          <Crop />
        </Button>
        <Button
          variant={sheet === 'image' ? 'secondary' : 'outline'}
          size="icon"
          onClick={() => setSheet('image')}
          aria-label="Image"
          title="Image"
        >
          <ImageIcon />
        </Button>
        <Button
          variant={sheet === 'audio' ? 'secondary' : mediaState.isLoaded ? 'outline' : 'default'}
          size="icon"
          onClick={() => setSheet('audio')}
          aria-label="Audio"
          title="Audio"
        >
          <Music />
        </Button>
        {image && (
          <Button
            variant={sheet === 'box' ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setSheet('box')}
            aria-label="Lyric box"
            title="Lyric box"
          >
            <Move />
          </Button>
        )}
    </>
  )

  return (
    <div className="flex flex-col gap-2 lg:gap-4">
      {menuSlot && createPortal(mobileMenu, menuSlot)}

      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={
          sheet === 'format' ? 'Output format'
            : sheet === 'fit' ? 'Image fit'
            : sheet === 'image' ? 'Image'
            : sheet === 'audio' ? 'Audio'
            : 'Lyric box'
        }
      >
        {sheet === 'format' && (
          <SegmentedControl
            label="Output format"
            size="md"
            className="w-full"
            value={format}
            onChange={onFormatChange}
            options={Object.values(OutputFormat).map(value => ({
              value,
              label: OUTPUT_FORMATS[value].label,
            }))}
          />
        )}
        {sheet === 'fit' && (
          <SegmentedControl
            label="Image fit"
            size="md"
            className="w-full"
            value={fit}
            onChange={onFitChange}
            options={Object.values(ImageFit).map(value => ({
              value,
              label: FIT_LABELS[value],
            }))}
          />
        )}
        {sheet === 'image' && (
          <Button
            variant="outline"
            className="w-full justify-start min-w-0"
            onClick={() => {
              imageInputRef.current?.click()
              setSheet(null)
            }}
          >
            <ImageIcon className="w-4 h-4 mr-2 shrink-0" />
            <span className="truncate">{image ? `Replace: ${image.file.name}` : 'Upload image'}</span>
          </Button>
        )}
        {sheet === 'audio' && (
          <Button
            variant={mediaState.isLoaded ? 'outline' : 'default'}
            className="w-full justify-start min-w-0"
            onClick={() => {
              audioInputRef.current?.click()
              setSheet(null)
            }}
          >
            <Music className="w-4 h-4 mr-2 shrink-0" />
            <span className="truncate">{mediaState.file ? `Replace: ${mediaState.file.name}` : 'Upload audio'}</span>
          </Button>
        )}
        {sheet === 'box' && (
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => onLyricBoxChange({ ...lyricBox, x: (1 - lyricBox.width) / 2 })}
            >
              <AlignHorizontalJustifyCenter className="w-4 h-4 mr-2" />
              Centre horizontally
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => onLyricBoxChange({ ...lyricBox, y: (1 - lyricBox.height) / 2 })}
            >
              <AlignVerticalJustifyCenter className="w-4 h-4 mr-2" />
              Centre vertically
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => onLyricBoxChange(OUTPUT_FORMATS[format].lyricBox)}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset lyric box
            </Button>
            {format === OutputFormat.REEL && (
              <Button
                variant={showSafeZones ? 'secondary' : 'outline'}
                className="justify-start"
                onClick={() => setShowSafeZones(on => !on)}
                aria-pressed={showSafeZones}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Safe zones
              </Button>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Format + fit options */}
      <div className="hidden lg:flex flex-wrap items-center justify-between gap-2">
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
        <div className="hidden lg:flex items-center gap-1 -mt-2">
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

      {/* Stage - sized to the exact frame aspect so the lyric box overlay lines up.
          Tap/click outside the lyric box to play or pause. */}
      <div
        className={cn(
          'relative flex justify-center rounded-lg overflow-hidden',
          image ? 'lg:bg-black' : 'bg-black',
          // Cover: fixed height, frame stays full width and the overflow is cropped (centred)
          stageSize === StageSize.COVER && 'max-lg:h-[45vh] max-lg:items-center',
          image && mediaState.isLoaded && 'cursor-pointer'
        )}
        onClick={image && mediaState.isLoaded ? onTogglePlayPause : undefined}
      >
        <div
          className="relative w-[var(--stage-w-sm)] lg:w-[var(--stage-w-lg)]"
          style={{
            '--stage-w-sm': stageSize === StageSize.COMPACT
              ? `min(100%, calc(45vh * ${width / height}))`
              : '100%',
            '--stage-w-lg': `min(100%, calc(60vh * ${width / height}))`,
            aspectRatio: `${width} / ${height}`,
          } as React.CSSProperties}
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
            onClick={() => stageInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Click to upload image or video</p>
            <p className="text-sm text-muted-foreground mt-1">
              <ImageIcon className="w-3 h-3 inline mr-1" />
              {[...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_VIDEO_EXTENSIONS].join(', ')} (max {formatMaxFileSize()})
            </p>
          </div>
        )}
      </div>

      {/* Source files - desktop; on mobile these live in the slide panel */}
      <div className="hidden lg:grid grid-cols-2 gap-2">
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
        ref={stageInputRef}
        type="file"
        accept={[
          ...ALLOWED_IMAGE_TYPES, ...ALLOWED_IMAGE_EXTENSIONS,
          ...ALLOWED_VIDEO_TYPES, ...ALLOWED_VIDEO_EXTENSIONS,
        ].join(',')}
        className="hidden"
        onChange={handleFileSelect(onLoadStageFile)}
      />
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
