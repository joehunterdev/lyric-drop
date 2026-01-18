# Lyric Drop - TODO & Changelog

---

## v0.2.0 - Branding & SEO Update

### SEO Enhancements
- [x] Enhanced `index.html` with comprehensive meta tags
- [x] Added Open Graph tags for Facebook/LinkedIn sharing
- [x] Added Twitter Card tags for Twitter sharing
- [x] Added keywords meta tag for SEO
- [x] Added `theme-color` meta tag (`#03f8bd` - brand primary)
- [x] Added Google Fonts preconnect for Titillium Web
- [x] Added apple-touch-icon support

### Branding - Joe Hunter Theme
- [x] Added Joe Hunter brand tokens to `index.css`
  - Brand primary: `#03f8bd` (cyan)
  - Brand secondary: `#8869b4` (purple)
  - Brand tertiary: `#634c82` (dark purple)
- [x] Updated Tailwind theme colors to use brand palette
- [x] Set Titillium Web as primary font family
- [x] Updated timeline playhead to brand primary color
- [x] Updated timeline segments to brand secondary color

### Header Updates
- [x] Added JH logo (`logo_75.png`) to header
- [x] Title "Lyric Drop" styled in muted grey (less intense)
- [x] Header background with semi-transparent dark overlay
- [x] Export button converted to compact icon-only mode
  - Shows Download icon (or X when processing)
  - Circular progress ring during export
  - Tooltip shows status on hover

### Footer Updates
- [x] Added link to joehunter.dev
- [x] Brand primary color for "Lyric Drop" text
- [x] Semi-transparent dark background matching header

### Assets
- [x] Created `public/assets/images/` directory
- [x] Added `logo_75.png` to public folder
- [x] Added `favicon.png` (32x32) to public folder

### Deployment Config
- [x] Updated SFTP config with `context: "client/dist"` for deploy

---

## v0.1.0 - Timeline Features

### Lyric Sections
- [x] Two-track timeline system (segments track + sections track)
- [x] Sections contain and control segments
- [x] Section resize redistributes segments proportionally
- [x] Segments clamped to section boundaries
- [x] Add section fills remaining video space
- [x] Alert when no room for new section

### Segment Management
- [x] Delete lyric segment → converts to spacer
- [x] Delete spacer → removes and closes gap
- [x] Insert space after selected segment
- [x] Auto-scroll timeline to selected segment

### Export
- [x] Canvas-based video export (15 Mbps VP9 WebM)
- [x] Real-time lyric overlay rendering
- [x] Progress tracking with cancel option

---

## Backlog

### Features
- [ ] OG image for social sharing (1200x630px)
- [ ] Lyric animation effects (fade, slide, etc.)
- [ ] Section labels (Verse, Chorus, Bridge)
- [ ] Keyboard shortcuts
- [ ] Undo/Redo support
- [ ] Multiple font options
- [ ] Export quality presets

### Design
- [ ] When viewing video, lyric on screen should be highlighted in sidebar
- [ ] Add placeholder text for desired line format in text input
- [ ] Restart project - remove media and lyrics
- [ ] Drag & drop file upload
- [ ] Uploadable lyrics (.txt, .lrc)
- [ ] Scroll bar on timeline should be lighter/whiter
- [ ] Scroll bar needs more padding
- [ ] Purple track elements need subtle markers
- [ ] Add skip forward/backward controls
- [ ] Add video reset button
- [ ] All timeline cursors should be pointer (finger)

### Mobile
- [ ] Responsive timeline for touch devices
- [ ] Touch-friendly segment editing
- [ ] Mobile-optimized preview

### Performance
- [ ] Web Worker for export processing
- [ ] Lazy load timeline segments
- [ ] Virtual scrolling for long lyric lists