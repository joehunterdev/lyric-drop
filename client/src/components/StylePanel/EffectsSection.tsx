import { StyleSection } from './StyleSection'
import { SliderField } from '@/components/ui/slider-field'
import { ColorField } from '@/components/ui/color-field'
import { useOverlay } from '@/contexts'

export function OutlineSection() {
  const { style, updateStyle } = useOverlay()
  const outline = style.outline

  return (
    <StyleSection
      title="Outline"
      enabled={outline.enabled}
      onEnabledChange={enabled => updateStyle('outline', { enabled })}
    >
      <ColorField
        label="Colour"
        value={outline.color}
        disabled={!outline.enabled}
        onChange={color => updateStyle('outline', { color })}
      />
      <SliderField
        label="Width"
        value={outline.width}
        min={1}
        max={20}
        format={v => `${v} px`}
        disabled={!outline.enabled}
        onChange={width => updateStyle('outline', { width })}
      />
    </StyleSection>
  )
}

export function ShadowSection() {
  const { style, updateStyle } = useOverlay()
  const shadow = style.shadow

  return (
    <StyleSection
      title="Shadow"
      enabled={shadow.enabled}
      onEnabledChange={enabled => updateStyle('shadow', { enabled })}
    >
      <ColorField
        label="Colour"
        value={shadow.color}
        disabled={!shadow.enabled}
        onChange={color => updateStyle('shadow', { color })}
      />
      <SliderField
        label="Blur"
        value={shadow.blur}
        min={0}
        max={60}
        format={v => `${v} px`}
        disabled={!shadow.enabled}
        onChange={blur => updateStyle('shadow', { blur })}
      />
      <SliderField
        label="Offset"
        value={shadow.offsetY}
        min={-20}
        max={40}
        format={v => `${v} px`}
        disabled={!shadow.enabled}
        onChange={offsetY => updateStyle('shadow', { offsetY })}
      />
    </StyleSection>
  )
}
