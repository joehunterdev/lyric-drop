/**
 * Areas of a 9:16 frame covered by Instagram Reels / TikTok UI, as % of the frame.
 * Approximate - the apps differ slightly and change over time.
 */
const ZONES = [
  { label: 'Top bar', style: { left: '0%', top: '0%', width: '100%', height: '13%' } },
  { label: 'Buttons', style: { left: '85%', top: '42%', width: '15%', height: '38%' } },
  { label: 'Caption & audio', style: { left: '0%', top: '80%', width: '100%', height: '20%' } },
]

/**
 * Shaded overlay showing where platform UI covers a Reel
 */
export function SafeZoneOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {ZONES.map(zone => (
        <div
          key={zone.label}
          className="absolute flex items-center justify-center border border-dashed border-red-400/70 bg-red-500/20"
          style={zone.style}
        >
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-red-200">
            {zone.label}
          </span>
        </div>
      ))}
    </div>
  )
}
