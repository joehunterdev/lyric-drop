# Lyric Overlay Editor

> A React + TypeScript application for adding synchronized lyrics to short-form video content.

---

## 📋 Overview

Lyric Overlay is a web-based video editor designed to simplify the process of adding lyric overlays to videos destined for social media platforms like **Instagram**, **TikTok**, and **YouTube**.

### The Problem

Existing lyric overlay tools often require users to manually segment large blocks of lyrics into smaller chunks and position them frame-by-frame across a timeline. This becomes tedious when working with full song lyrics (3+ pages) over videos ranging from 60 seconds to 5 minutes.

### The Solution

A streamlined editor that allows users to:

- Paste entire lyric sheets at once
- Define start/end points on a visual timeline
- Automatically handle lyric distribution across video duration
- Export ready-to-share video content

---

## 🛠️ Tech Stack

| Layer    | Technology          |
|----------|---------------------|
| Frontend | React + TypeScript  |
| Backend  | PHP (if necessary)  |
| Video    | MP4 format          |

---

## ✨ Core Features

### Timeline-Based Lyric Editor

The heart of the application is a timeline interface that supports:

- **Bulk Lyric Input** — Paste full lyric sheets without pre-segmentation
- **Keyframe Definition** — Set start and end points for lyric segments
- **Visual Timeline** — Drag-and-drop positioning inspired by subtitle editing workflows

### UI/UX Approach

| Inspiration        | Purpose                                      |
|--------------------|----------------------------------------------|
| Subtitle Editors   | Familiar timeline-based editing patterns     |
| Instagram Editor   | Mobile-first, touch-friendly interface       |

The interface should prioritize **mobile usability** while remaining functional on desktop.

---

## 🚀 MVP Scope

The minimum viable product focuses on core functionality with intentional constraints:

| Feature           | MVP Scope                              |
|-------------------|----------------------------------------|
| Video Format      | MP4 (or simplest compatible format)    |
| Video Length      | Short, compressed videos               |
| Typography        | Basic fonts, no advanced styling       |
| Storage           | No persistent file storage required    |
| Export            | Direct download                        |

### Out of Scope (MVP)

- Custom fonts and advanced text styling
- Cloud storage / user accounts
- Long-form video support
- Multiple export formats

---

## 🎯 Success Criteria

1. User can upload a short video (MP4)
2. User can paste a full lyrics block
3. User can define lyric segments on a timeline
4. User can preview the video with overlaid lyrics
5. User can export the final video

---

## 📁 Project Structure (Suggested)

```text
src/
├── components/
│   ├── VideoPlayer/        # Video playback & preview
│   ├── Timeline/           # Timeline editor component
│   ├── LyricEditor/        # Text input & segmentation
│   └── ExportButton/       # Video export handling
├── hooks/
│   ├── useVideoPlayer.ts   # Video state management
│   └── useTimeline.ts      # Timeline state & operations
├── types/
│   └── index.ts            # TypeScript interfaces
├── utils/
│   ├── videoUtils.ts       # Video processing helpers
│   └── lyricParser.ts      # Lyric text parsing
└── App.tsx
```

---

## 📐 Key TypeScript Interfaces

```typescript
interface LyricSegment {
  id: string;
  text: string;
  startTime: number;  // in seconds
  endTime: number;    // in seconds
}

interface VideoState {
  file: File | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
}

interface Project {
  video: VideoState;
  segments: LyricSegment[];
}
```

---

## 🔄 User Flow

```text
┌─────────────────┐
│  Upload Video   │
└────────┬────────┘
         ▼
┌─────────────────┐
│  Paste Lyrics   │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Define Segments │◄──┐
│  on Timeline    │   │ (iterate)
└────────┬────────┘───┘
         ▼
┌─────────────────┐
│    Preview      │
└────────┬────────┘
         ▼
┌─────────────────┐
│     Export      │
└─────────────────┘
```

---

## 📝 Notes

- Prioritize **performance** — video editing can be resource-intensive
- Consider using **Web Workers** for video processing to avoid UI blocking
- Explore libraries like `ffmpeg.wasm` for client-side video manipulation
- Keep the initial implementation simple; optimize based on real usage

---

Document created: January 2026
