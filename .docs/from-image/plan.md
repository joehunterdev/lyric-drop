# Plan: Image Background Mode ("From Image")

## Goal

Today the editor only works with a video: the `<video>` element is the clock for the timeline, the source of the audio, and the background that export draws onto the canvas.

This feature adds a second source mode. The user uploads **one still image and one audio file (the song)**. They time lyrics against the audio the same way they do now, and export a video at one of two sizes:

| Format | Aspect | Export size | Use |
|---|---|---|---|
| **Reel** | 9:16 | 1080 × 1920 | Instagram Reels, TikTok, YouTube Shorts |
| **YouTube** | 16:9 | 1920 × 1080 | Standard YouTube / landscape |

Video mode stays as it is.

### Why an audio file is required

An image has no duration and no sound. The audio file:
- provides `duration` and `currentTime` for the timeline (replacing the `<video>` clock),
- drives play, pause and seek,
- becomes the audio track of the exported file.

---

## How it works now (relevant parts)

- [useVideoPlayer.ts](../../client/src/hooks/useVideoPlayer.ts) owns a `videoRef` and a `VideoState` (`duration`, `currentTime`, `isPlaying`, …). It listens to `timeupdate`, `play`, `pause` and `ended` on the element.
- [useTimeline.ts](../../client/src/hooks/useTimeline.ts) only needs `currentTime`, and `Timeline`/`LyricEditor` only need `duration`. **Neither cares where the time comes from.** This is why the feature is practical.
- [useCanvasExport.ts](../../client/src/hooks/useCanvasExport.ts) creates a canvas at the video's native size. Each frame it calls `drawImage(video)` and draws the active lyric. It records with `canvas.captureStream()` and `MediaRecorder`, and plays the video in real time while recording. Audio comes from `video.captureStream().getAudioTracks()`.
- [VideoPlayer.tsx](../../client/src/components/VideoPlayer/VideoPlayer.tsx) shows the preview, hard-coded to `aspect-[9/16]`. The lyric overlay is a positioned HTML `<div>` that is styled separately from the canvas drawing, so the preview and the export can differ.

---

## Design

### 1. Generalise the media clock: `HTMLVideoElement` → `HTMLMediaElement`

`HTMLAudioElement` and `HTMLVideoElement` both extend `HTMLMediaElement`, and every event and property `useVideoPlayer` uses comes from that base class.

- Rename `useVideoPlayer` → `useMediaPlayer` (or keep the name and widen the types; rename only if the churn is small).
- `videoRef: RefObject<HTMLVideoElement>` → `mediaRef: RefObject<HTMLMediaElement>`.
- `VideoState` → `MediaState` (same fields).
- `loadVideo(file)` stays. Add `loadAudio(file)`, which uses a new `getAudioDuration(file)` in [videoUtils.ts](../../client/src/utils/videoUtils.ts), modelled on `getVideoDuration`.
- The event-listener effect currently depends on `videoState.isLoaded`. Make sure it re-binds when the element changes between `<video>` and `<audio>` (key it on `url` or the mode).

`Timeline` and `LyricEditor` should need no changes beyond prop types.

### 2. Source mode and output format state

Add to [enums.ts](../../client/src/types/enums.ts):

```ts
export const SourceMode = { VIDEO: 'video', IMAGE: 'image' } as const
export const OutputFormat = { REEL: 'reel', YOUTUBE: 'youtube' } as const
```

And a lookup in config or a new `formats.ts`:

```ts
export const OUTPUT_FORMATS = {
  reel:    { width: 1080, height: 1920, label: 'Reel (9:16)' },
  youtube: { width: 1920, height: 1080, label: 'YouTube (16:9)' },
}
```

Hold in `AppContent`, or in a small `useProjectSource` hook if `App.tsx` gets crowded:
- `sourceMode`
- `outputFormat` (image mode only)
- `imageState: { file, bitmap: ImageBitmap | null, url }`
- `imageFit: 'cover' | 'contain-blur'` (see §4)

Switching mode resets the loaded media. Lyrics/segments stay, so users can re-use timed lyrics. If segments run past the new audio duration, confirm before switching.

### 3. Shared frame renderer, used by both preview and export

Pull the drawing logic out of `useCanvasExport` into a pure function so the preview matches the export exactly:

```
client/src/utils/renderFrame.ts

renderFrame(ctx, {
  width, height,
  background:
    | { kind: 'video', el: HTMLVideoElement }
    | { kind: 'image', bitmap: ImageBitmap, fit },
  segment: LyricSegment | null,
  format: OutputFormat | null,   // controls safe-zone margins
})
```

- **Video mode:** `drawImage(video, 0, 0, w, h)`, the same as today.
- **Image mode:** draw the bitmap using the chosen fit (§4), then the lyric.
- The lyric drawing moves here from `drawFrame` (§5 covers the changes).

`useCanvasExport.drawFrame` becomes a thin call to `renderFrame`.

### 4. Fitting the image to the frame

Users will upload images of any shape. Two options:

- **Cover (default):** scale to fill and centre-crop. Simple, and usually what people want.
- **Contain + blurred fill:** draw the image scaled to fill and blurred (`ctx.filter = 'blur(40px)'`, slightly darkened) as the backdrop, then draw the whole image centred on top. This works better for album art (square) going into 9:16 or 16:9.

Later: a focal-point or pan control for cover mode. Out of scope for v1.

Decode the image once with `createImageBitmap(file)`, which applies EXIF orientation in current browsers. Keep the `ImageBitmap` in state. Do **not** decode on every frame.

Accepted image types: `.jpg`, `.jpeg`, `.png`, `.webp`. Add `VITE_ALLOWED_IMAGE_*` and `VITE_ALLOWED_AUDIO_*` env vars plus `validateImageFile` / `validateAudioFile` in [config.ts](../../client/src/utils/config.ts), following the `validateVideoFile` pattern.

Accepted audio types: `.mp3`, `.m4a`, `.aac`, `.wav`, `.ogg`, `.webm`.

### 5. Lyric layout changes for fixed output sizes

The current text sizing is `fontSize = height * 5%` with no wrapping. At 1080×1920 that gives a 96px font on a 1080px-wide frame, so long lines will overflow.

- Base font size on the **shorter side**: `Math.min(width, height) * LYRIC_FONT_SIZE_PERCENT / 100`. This gives the same visual size for Reel and YouTube, and roughly the same as today for landscape video.
- Add **word-wrap** to a max width of about 85% of the frame. Explicit `\n` in lyrics is still honoured.
- **Safe zones:**
  - Reel: bottom margin about 20–25% of height, so the platform UI (caption, buttons) doesn't cover the lyrics.
  - YouTube: about 10–12%, the same as today.
  - Video mode keeps the current 12%.

### 6. Preview component

Add `ImageStage` (or extend `VideoPlayer` with a mode branch; a separate component is cleaner):

- A `<canvas>` sized to the output format (CSS-scaled down to fit), with an aspect container of `aspect-[9/16]` or `aspect-video` based on format.
- A hidden `<audio ref={mediaRef}>` element.
- A `requestAnimationFrame` loop that calls `renderFrame` while playing. When paused, redraw on `currentTime` or segment changes.
- The same play/restart/time controls as `VideoPlayer`. Extract those into a shared `PlaybackControls` component instead of duplicating them.
- Two upload slots for empty states: "Upload image" and "Upload audio". Show a thumbnail and filename once each is loaded, with a replace action.
- Format toggle (Reel / YouTube) and fit toggle (Cover / Blur fill) above the stage.

Because the preview uses `renderFrame`, the HTML lyric overlay is not needed in image mode.

**Optional follow-up:** switch video mode to the canvas preview too, so video previews are also WYSIWYG.

### 7. Export changes (`useCanvasExport`)

Widen the options:

```ts
interface UseCanvasExportOptions {
  mediaRef: RefObject<HTMLMediaElement | null>
  segments: LyricSegment[]
  source:
    | { kind: 'video' }
    | { kind: 'image', bitmap: ImageBitmap, format: OutputFormat, fit: ImageFit }
}
```

- **Canvas size:** video mode keeps `videoWidth × videoHeight`. Image mode uses `OUTPUT_FORMATS[format]`.
- **Skip `canVideoBeExported`** in image mode.
- **Audio track:** `audioEl.captureStream()` is Chromium-only, and Firefox has `mozCaptureStream`. A more robust approach for both modes is Web Audio:
  ```ts
  const ac = new AudioContext()
  const src = ac.createMediaElementSource(mediaEl)   // once per element; cache it
  const dest = ac.createMediaStreamDestination()
  src.connect(dest); src.connect(ac.destination)     // keep it audible
  dest.stream.getAudioTracks().forEach(t => stream.addTrack(t))
  ```
  Note: `createMediaElementSource` can only be called **once per element**, so create and cache the node in the player hook, not per export. Try this in image mode first. Moving video mode onto it too is optional.
- **Frame emission:** `captureStream(fps)` only sends frames when the canvas is repainted. The render loop already redraws every `requestAnimationFrame`, so a static image still produces a steady stream. Keep it that way: don't skip redraws when nothing changed.
- **End condition:** `media.ended || currentTime >= duration`. This works unchanged for audio.
- **Filename:** `lyric-drop-reel-<ts>.webm` / `lyric-drop-youtube-<ts>.webm`.
- [ExportButton.tsx](../../client/src/components/ExportButton/ExportButton.tsx): pass the new props, and enable it when audio and image are both loaded.

**Known limitation (already true today):** export runs in real time, and `requestAnimationFrame` is throttled in background tabs. Keep the tab in focus. Show a hint in image mode, since a 3–4 minute song is a long export.

### 8. MP4 output (optional, phase 3)

Instagram/TikTok accept WebM, but some workflows prefer MP4. The project already ships ffmpeg.wasm ([useFFmpeg.ts](../../client/src/hooks/useFFmpeg.ts)). Add an optional "Convert to MP4" step after export. For a static-image video this is a cheap transcode. Not required for v1.

**Rejected alternative:** render the whole thing in ffmpeg.wasm (`-loop 1 -i image -i audio` plus drawtext/ASS subtitles). It skips real-time recording, but it would need a second implementation of the lyric styling, and libx264 in wasm at 1080p is unlikely to beat real time anyway. Keeping one canvas renderer is simpler.

---

## UI flow

```
Header: [Editor] [Converter]   ...  [Export]
Editor:
  Source:  ( Video | Image + Audio )
  ── Image + Audio selected ──
  Format:  ( Reel 9:16 | YouTube 16:9 )   Fit: ( Cover | Blur fill )
  ┌──────────────┐
  │   canvas     │   [Upload image]  [Upload audio]
  │   preview    │
  └──────────────┘
  ▶  ⟲  00:42 / 03:31
  Timeline (unchanged)                       Lyric editor (unchanged)
```

The mode toggle goes at the top of the left column in [App.tsx](../../client/src/App.tsx). The layout grid stays the same. For YouTube format, cap the preview by width rather than `max-h-[60vh]` so the 16:9 stage doesn't look tiny.

---

## Implementation phases

> **Status (2026-10-22):** Phases 1–2 implemented, plus blur-fill (step 9). Typecheck and build pass; manual browser testing pending.
> Deviations: the preview redraws on state change (lyric/image/format/fit) rather than a rAF loop, and the image backdrop (crop/blur) is pre-rendered once and cached per bitmap.

### Phase 1: plumbing (no visible change)
1. Widen `useVideoPlayer` to `HTMLMediaElement` and add `loadAudio` and `getAudioDuration`.
2. Extract `renderFrame` from `useCanvasExport`. Video export should look identical; verify by exporting a video before and after.
3. Add the `SourceMode`, `OutputFormat` and `ImageFit` enums, the `OUTPUT_FORMATS` lookup, and image/audio validation in config.

### Phase 2: image mode MVP
4. Source-mode toggle in `App.tsx`, plus image/audio state.
5. `ImageStage` component with canvas preview, hidden audio, upload slots, and the format toggle. Extract `PlaybackControls`.
6. Lyric layout updates: shorter-side font sizing, word wrap, safe zones per format.
7. `useCanvasExport` image-source branch, Web Audio capture, and fixed output size.
8. Wire up `ExportButton`.

### Phase 3: polish
9. Blur-fill fit option.
10. Optional MP4 conversion via ffmpeg.wasm.
11. "Keep this tab focused" export hint, drag-and-drop for image and audio.
12. Update `TODO.md` and the README feature list. Bump the version to v0.3.0.

---

## Testing checklist

- [ ] Video mode export is unchanged (dimensions, audio, lyric position). This guards against regressions from Phase 1.
- [ ] Image + MP3 → Reel export is 1080×1920, audio is in sync, and the export length matches the song.
- [ ] Image + WAV → YouTube export is 1920×1080.
- [ ] Square, portrait and landscape images in both formats, with both fit modes.
- [ ] A phone JPEG with EXIF rotation shows the right way up.
- [ ] Long lyric lines wrap in Reel format and stay inside the safe zone.
- [ ] Switching mode keeps segments. Shorter audio prompts before trimming.
- [ ] Seek, play and pause from the timeline work against the audio element.
- [ ] Chrome, Edge, and Firefox (audio capture path), plus Safari (MediaRecorder WebM support is limited; document it if it fails).
- [ ] The exported WebM uploads to YouTube and Instagram.

---

## Open questions

1. **Audio-less image mode?** For example, a silent export with a manually set duration so the user can add the music in another editor. Leaving this out for v1 keeps things simpler.
2. **Should video mode get the format choice too?** For example, put a landscape video into a 9:16 reel with blur fill. `renderFrame` makes this easy later.
3. **Motion on the still:** a slow Ken Burns zoom/pan would make image videos feel less static. It's cheap to add in `renderFrame`. v1 or later?
4. **Multiple images:** a slideshow, with an image per lyric section? This fits the existing `LyricSection` model nicely but is clearly a v2 feature.
