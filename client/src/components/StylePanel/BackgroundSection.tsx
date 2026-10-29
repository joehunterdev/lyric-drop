import { StyleSection } from './StyleSection'
import { SliderField } from '@/components/ui/slider-field'
import { ColorField } from '@/components/ui/color-field'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useOverlay } from '@/contexts'
import { BackgroundMode } from '@/types'

export function BackgroundSection() {
  const { style, updateStyle } = useOverlay()
  const background = style.background
  const isNone = background.mode === BackgroundMode.NONE

  return (
    <StyleSection title="Background" defaultOpen>
      <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
        <span className="text-xs text-muted-foreground">Style</span>
        <SegmentedControl
          label="Background style"
          value={background.mode}
          onChange={mode => updateStyle('background', { mode })}
          options={[
            { value: BackgroundMode.NONE, label: 'None' },
            { value: BackgroundMode.BOX, label: 'Box' },
            { value: BackgroundMode.LINE, label: 'Per line' },
            { value: BackgroundMode.BAND, label: 'Band' },
          ]}
        />
      </div>

      {!isNone && (
        <>
          <ColorField
            label="Colour"
            value={background.color}
            onChange={color => updateStyle('background', { color })}
          />
          <SliderField
            label="Opacity"
            value={Math.round(background.opacity * 100)}
            min={0}
            max={100}
            step={5}
            format={v => `${v}%`}
            onChange={opacity => updateStyle('background', { opacity: opacity / 100 })}
          />
          {background.mode !== BackgroundMode.BAND && (
            <SliderField
              label="Radius"
              value={background.radius}
              min={0}
              max={60}
              format={v => `${v} px`}
              onChange={radius => updateStyle('background', { radius })}
            />
          )}
        </>
      )}

      {/* Padding also sets the text inset, so it stays available with no background */}
      <SliderField
        label="Padding"
        value={background.padding}
        min={0}
        max={80}
        format={v => `${v} px`}
        onChange={padding => updateStyle('background', { padding })}
      />
    </StyleSection>
  )
}
