import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

import { StyleSection } from './StyleSection'
import { FontPicker } from './FontPicker'
import { SliderField } from '@/components/ui/slider-field'
import { ColorField } from '@/components/ui/color-field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Switch } from '@/components/ui/switch'
import { useOverlay } from '@/contexts'
import { FONT_WEIGHTS, findFontOption } from '@/utils'
import { TextAlign, TextTransform } from '@/types'

const WEIGHT_LABELS: Record<number, string> = { 400: 'Regular', 600: 'Semi', 700: 'Bold', 900: 'Black' }

/**
 * Pick the available weight closest to the requested one
 */
function closestWeight(weights: number[], target: number): number {
  return weights.reduce((best, w) => (Math.abs(w - target) < Math.abs(best - target) ? w : best))
}

export function TextSection() {
  const { style, updateStyle } = useOverlay()
  const text = style.text
  // Uploaded fonts don't declare weights, so allow them all
  const availableWeights = findFontOption(text.fontFamily)?.weights ?? FONT_WEIGHTS

  const handleFontChange = (fontFamily: string) => {
    const weights = findFontOption(fontFamily)?.weights ?? FONT_WEIGHTS
    updateStyle('text', {
      fontFamily,
      fontWeight: weights.includes(text.fontWeight) ? text.fontWeight : closestWeight(weights, text.fontWeight),
    })
  }

  return (
    <StyleSection title="Text" defaultOpen>
      <FontPicker family={text.fontFamily} weight={text.fontWeight} onChange={handleFontChange} />

      <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
        <span className="text-xs text-muted-foreground">Weight</span>
        <SegmentedControl
          label="Font weight"
          value={text.fontWeight}
          onChange={fontWeight => updateStyle('text', { fontWeight })}
          options={FONT_WEIGHTS.map(weight => ({
            value: weight,
            label: WEIGHT_LABELS[weight],
            disabled: !availableWeights.includes(weight),
          }))}
        />
      </div>

      <SliderField
        label="Size"
        value={text.fontSize}
        min={20}
        max={160}
        format={v => `${v} px`}
        onChange={fontSize => updateStyle('text', { fontSize })}
      />

      <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
        <label htmlFor="auto-fit" className="text-xs text-muted-foreground">Auto-fit</label>
        <div className="flex items-center gap-2">
          <Switch
            id="auto-fit"
            checked={text.autoFit}
            onCheckedChange={autoFit => updateStyle('text', { autoFit })}
          />
          <span className="text-xs text-muted-foreground">Shrink long lines to fit the box</span>
        </div>
      </div>

      <ColorField label="Colour" value={text.color} onChange={color => updateStyle('text', { color })} />

      <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
        <span className="text-xs text-muted-foreground">Align</span>
        <div className="flex flex-wrap gap-2">
          <SegmentedControl
            label="Text alignment"
            value={text.align}
            onChange={align => updateStyle('text', { align })}
            options={[
              { value: TextAlign.LEFT, label: <AlignLeft />, title: 'Align left' },
              { value: TextAlign.CENTER, label: <AlignCenter />, title: 'Align centre' },
              { value: TextAlign.RIGHT, label: <AlignRight />, title: 'Align right' },
            ]}
          />
          <SegmentedControl
            label="Text case"
            value={text.transform}
            onChange={transform => updateStyle('text', { transform })}
            options={[
              { value: TextTransform.NONE, label: 'Aa', title: 'As typed' },
              { value: TextTransform.UPPERCASE, label: 'AA', title: 'Uppercase' },
            ]}
          />
        </div>
      </div>

      <SliderField
        label="Line height"
        value={text.lineHeight}
        min={0.8}
        max={2}
        step={0.05}
        format={v => v.toFixed(2)}
        onChange={lineHeight => updateStyle('text', { lineHeight })}
      />

      <SliderField
        label="Spacing"
        value={text.letterSpacing}
        min={-5}
        max={20}
        step={0.5}
        format={v => `${v} px`}
        onChange={letterSpacing => updateStyle('text', { letterSpacing })}
      />
    </StyleSection>
  )
}
