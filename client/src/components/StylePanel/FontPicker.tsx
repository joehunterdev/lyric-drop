import { useEffect, useRef, useState } from 'react'
import { Upload, Trash2, Loader2, AlertTriangle, Info } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFontLoader } from '@/hooks'
import { useOverlay } from '@/contexts'
import { FONT_OPTIONS, ALLOWED_FONT_EXTENSIONS, ensureFontLoaded, findFontOption } from '@/utils'
import type { FontOption } from '@/utils'

const STANDARD_FONTS = FONT_OPTIONS.filter(font => !font.personalUse)
const PERSONAL_USE_FONTS = FONT_OPTIONS.filter(font => font.personalUse)

/**
 * Font name in its own typeface. The font is fetched only once the item scrolls into view,
 * so opening the list doesn't download every font.
 */
function FontPreview({ font }: { font: FontOption }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      void ensureFontLoaded(font.family, font.weights[0])
      observer.disconnect()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [font])

  return <span ref={ref} style={{ fontFamily: `"${font.family}"` }}>{font.family}</span>
}

interface FontPickerProps {
  family: string
  weight: number
  onChange: (family: string) => void
}

/**
 * Font select that previews each font in its own typeface, plus font upload
 */
export function FontPicker({ family, weight, onChange }: FontPickerProps) {
  const { customFonts, uploadFont, deleteFont } = useOverlay()
  const status = useFontLoader(family, weight)
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const customFont = customFonts.find(font => font.family === family)
  const isPersonalUse = !!findFontOption(family)?.personalUse

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      setUploadError(null)
      const font = await uploadFont(file)
      onChange(font.family)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Font upload failed')
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
        <span className="text-xs text-muted-foreground">Font</span>
        <div className="flex items-center gap-1.5 min-w-0">
          <Select value={family} onValueChange={onChange}>
            <SelectTrigger className="h-8 min-w-0" aria-label="Font">
              <SelectValue>
                <span style={{ fontFamily: `"${family}"` }}>{customFont?.name ?? family}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Fonts</SelectLabel>
                {STANDARD_FONTS.map(font => (
                  <SelectItem key={font.family} value={font.family}>
                    <FontPreview font={font} />
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Display - personal use only</SelectLabel>
                {PERSONAL_USE_FONTS.map(font => (
                  <SelectItem key={font.family} value={font.family}>
                    <FontPreview font={font} />
                  </SelectItem>
                ))}
              </SelectGroup>
              {customFonts.length > 0 && (
                <>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Your fonts</SelectLabel>
                    {customFonts.map(font => (
                      <SelectItem key={font.family} value={font.family}>
                        <span style={{ fontFamily: `"${font.family}"` }}>{font.name}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </>
              )}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => inputRef.current?.click()}
            title="Upload a font (.ttf, .otf, .woff, .woff2)"
          >
            <Upload className="w-4 h-4" />
          </Button>
          {customFont && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                deleteFont(customFont.family)
                onChange(FONT_OPTIONS[0].family)
              }}
              title={`Remove ${customFont.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_FONT_EXTENSIONS.join(',')}
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {status === 'loading' && (
        <p className="pl-[5.75rem] text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading font…
        </p>
      )}
      {status === 'error' && (
        <p className="pl-[5.75rem] text-xs text-orange-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Font couldn't load - check your connection
        </p>
      )}
      {isPersonalUse && (
        <p className="pl-[5.75rem] text-xs text-muted-foreground flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            Free for personal use only. Using this font in commercial work (ads, brand or paid
            content) needs a license from its designer.
          </span>
        </p>
      )}
      {uploadError && (
        <p className="pl-[5.75rem] text-xs text-orange-400">{uploadError}</p>
      )}
    </div>
  )
}
