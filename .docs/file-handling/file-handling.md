## File Handling Brief

### The Problem
Video processing in the browser (FFmpeg WASM) is **10-20x slower** than native processing. This affects:
- Transcoding non-MP4 formats (MOV, AVI, etc.)
- Exporting final video with Lyric Drops burned in

### Questions
- What file requirements are there?
- Best approach to handle files without long wait times?
- Should we use PHP/server-side processing?

---

## Options for Faster Video Processing

### Option 1: Pre-convert Before Upload (Current Approach)
**User converts MOV → MP4 manually before uploading**

| Pros | Cons |
|------|------|
| No server needed | User friction |
| No backend complexity | Not all users have tools |
| Works offline | Extra step |

---

### Option 2: PHP + Native FFmpeg (Recommended)
**Server-side transcoding using FFmpeg binary**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  PHP API    │────▶│   FFmpeg    │
│  (Upload)   │     │  (Laravel)  │     │  (Native)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Processed  │
                    │    Video    │
                    └─────────────┘
```

**Speed comparison (1 min video):**
| Method | Time |
|--------|------|
| Browser WASM | 3-5 minutes |
| Server FFmpeg | 5-15 seconds |

**PHP Implementation:**
```php
// api/transcode.php
<?php
header('Content-Type: application/json');

$uploadDir = '/tmp/lyric-drop/';
$outputDir = '/tmp/lyric-drop/output/';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed']));
}

if (!isset($_FILES['video'])) {
    http_response_code(400);
    exit(json_encode(['error' => 'No video file provided']));
}

$file = $_FILES['video'];
$inputPath = $uploadDir . uniqid() . '_' . basename($file['name']);
$outputPath = $outputDir . uniqid() . '.mp4';

// Move uploaded file
move_uploaded_file($file['tmp_name'], $inputPath);

// FFmpeg command - fast transcode to H.264 MP4
$cmd = sprintf(
    'ffmpeg -i %s -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart %s 2>&1',
    escapeshellarg($inputPath),
    escapeshellarg($outputPath)
);

exec($cmd, $output, $returnCode);

// Cleanup input
unlink($inputPath);

if ($returnCode !== 0) {
    http_response_code(500);
    exit(json_encode(['error' => 'Transcode failed', 'details' => implode("\n", $output)]));
}

// Return download URL or stream file
echo json_encode([
    'success' => true,
    'url' => '/api/download.php?file=' . basename($outputPath),
    'size' => filesize($outputPath)
]);
```

**Requirements:**
- FFmpeg installed on server (`apt install ffmpeg` or Windows binary)
- PHP with exec() enabled
- Temp directory with write permissions
- Increase `upload_max_filesize` and `post_max_size` in php.ini

---

### Option 3: Queue-Based Processing (For Large Files)
**Background job processing with progress updates**

```
Upload → Queue Job → Worker Process → Notify Client (WebSocket/Polling)
```

Good for:
- Files > 100MB
- Multiple concurrent users
- Production environments

Libraries:
- Laravel Queues + Horizon
- Symfony Messenger
- Simple: Redis + cron job

---

### Option 4: Cloud Transcoding Services
**Offload to specialized services**

| Service | Pricing | Speed |
|---------|---------|-------|
| AWS MediaConvert | ~$0.015/min | Very fast |
| Cloudinary | Free tier available | Fast |
| Mux | $0.015/min | Very fast |
| Coconut.co | $0.01/min | Fast |

Best for production at scale, overkill for personal/MVP use.

---

## Implementation Phases

### Phase 1: Fast Browser Export (Current Priority) ✅

**Goal:** Export videos quickly without server-side processing

**Approach:** Canvas + MediaRecorder

- Plays video on a hidden canvas
- Draws Lyric Drops in real-time
- Records the composited output
- Exports at **playback speed** (30s video = ~30s export)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Video     │────▶│   Canvas    │────▶│ MediaRecorder│
│  Element    │     │  + Overlay  │     │   (WebM)    │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Benefits:**

- ✅ No server required (works on Hostinger shared hosting)
- ✅ Real-time speed (not 10-20x slower like WASM)
- ✅ No FFmpeg dependency
- ✅ Works offline
- ✅ Configurable quality via environment variables

**Limitations:**

- Output format is WebM (not MP4) - but all platforms accept WebM
- Quality depends on bitrate setting (configurable)
- Must play through entire video to export
- Only MP4 and WebM input files supported

**Quality Notes:**

| Bitrate | Quality | ~File Size (20s) |
|---------|---------|------------------|
| 5 Mbps | Good | ~12 MB |
| 10 Mbps | Better | ~25 MB |
| 15 Mbps | High | ~37 MB |
| 20 Mbps | Very High | ~50 MB |

> **Note:** Instagram/TikTok will re-compress on upload anyway, so very high bitrates mainly matter for archival copies.

**Status:** ✅ Implemented in `useCanvasExport.ts`

---

## Configuration

All export and upload settings are configurable via `.env` files:

```env
# ===========================================
# Export Settings
# ===========================================

# Video bitrate in bits per second
# 5000000 = 5 Mbps, 10000000 = 10 Mbps, 15000000 = 15 Mbps
VITE_EXPORT_BITRATE=15000000

# Export frame rate (fps)
VITE_EXPORT_FRAMERATE=30

# ===========================================
# File Upload Settings
# ===========================================

# Allowed video file extensions (comma-separated)
VITE_ALLOWED_VIDEO_EXTENSIONS=.mp4,.webm

# Allowed video MIME types (comma-separated)
VITE_ALLOWED_VIDEO_TYPES=video/mp4,video/webm

# Maximum file size in bytes (1GB = 1073741824)
VITE_MAX_FILE_SIZE=1073741824

# ===========================================
# Lyric Settings
# ===========================================

# Maximum number of lyric segments
VITE_MAX_SEGMENTS=500

# Font size as percentage of video height
VITE_LYRIC_FONT_SIZE_PERCENT=5

# Background opacity (0-1)
VITE_LYRIC_BG_OPACITY=0.7
```

**Config utility:** `client/src/utils/config.ts`

---

### Phase 2: FFmpeg Installation (Future)

**Goal:** Enable server-side video processing for faster transcoding

**Requirements:**
- VPS or dedicated server (NOT shared hosting like Hostinger basic)
- FFmpeg binary installed

**Installation Commands:**

| Platform | Command |
|----------|---------|
| Ubuntu/Debian | `sudo apt install ffmpeg` |
| CentOS/RHEL | `sudo yum install ffmpeg` |
| macOS | `brew install ffmpeg` |
| Windows (Chocolatey) | `choco install ffmpeg` |
| Windows (Winget) | `winget install ffmpeg` |
| Windows (Manual) | Download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) |

**Verify Installation:**
```bash
ffmpeg -version
```

**Hosting Options with FFmpeg Support:**

| Provider | Type | Price | FFmpeg |
|----------|------|-------|--------|
| Hostinger VPS | VPS | ~$5/mo | ✅ Install yourself |
| DigitalOcean | VPS | $6/mo | ✅ Install yourself |
| Linode | VPS | $5/mo | ✅ Install yourself |
| AWS EC2 | Cloud | Variable | ✅ Install yourself |
| Cloudinary | SaaS | Free tier | ✅ Built-in |

---

### Phase 3: Server-Side Transcoding (Future)

**Goal:** Fast transcoding of non-MP4 formats (MOV, AVI, MKV)

**When to implement:**

- Users frequently upload non-MP4 formats
- Need faster-than-realtime processing
- Have VPS hosting with FFmpeg available

**Project Structure:**

```
lyric-drop.joehunter.dev/
├── api/                     # PHP API (outside client)
│   ├── transcode.php        # Convert MOV/AVI → MP4
│   ├── export.php           # Burn subtitles into video
│   └── download.php         # Serve processed files
├── client/                  # React frontend (Vite)
│   ├── src/
│   └── ...
└── .docs/
```

**API URL:** `http://lyric-drop.joehunter.local:8081/api`

Same domain/port as frontend - Apache serves both.

**Apache VirtualHost Configuration:**

```apache
<VirtualHost *:8081>
    ServerName lyric-drop.joehunter.local
    DocumentRoot "E:/www/lyric-drop.joehunter.dev"
    
    # Serve PHP API
    <Directory "E:/www/lyric-drop.joehunter.dev/api">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # Proxy frontend requests to Vite dev server
    ProxyPreserveHost On
    ProxyPass /api !
    ProxyPass / http://localhost:5173/
    ProxyPassReverse / http://localhost:5173/
</VirtualHost>
```

> **Note:** In development, Vite runs on port 5173 and Apache proxies to it.
> The `/api` path is excluded from proxy and served directly by Apache/PHP.

**PHP Configuration:**

```ini
; php.ini
upload_max_filesize = 500M
post_max_size = 500M
max_execution_time = 300
memory_limit = 512M
```

**Speed Comparison:**

| Method | 1 min video | 5 min video |
|--------|-------------|-------------|
| Browser WASM | 3-5 min | 15-25 min |
| Canvas Export | ~1 min | ~5 min |
| Server FFmpeg | 5-15 sec | 30-60 sec |

---

## Current Approach (Phase 1)

For now, we're implementing:

1. **Validation:** Accept MP4, WebM, MOV (browser-playable formats)
2. **No transcoding on upload:** Skip the slow WASM conversion
3. **Fast Canvas export:** Real-time overlay + MediaRecorder
4. **User guidance:** If MOV doesn't play, suggest HandBrake conversion

---

## FFmpeg Commands Reference

**Transcode to web-friendly MP4:**
```bash
ffmpeg -i input.mov -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart output.mp4
```

**Burn ASS subtitles:**
```bash
ffmpeg -i input.mp4 -vf "ass=subtitles.ass" -c:a copy output.mp4
```

**Quick preview (lower quality, faster):**
```bash
ffmpeg -i input.mov -c:v libx264 -preset ultrafast -crf 28 -c:a aac output.mp4
```

---

## Decision Matrix

| Approach | Speed | Complexity | Cost | Best For |
|----------|-------|------------|------|----------|
| Browser WASM | Slow | Low | Free | Occasional use, small files |
| PHP + FFmpeg | Fast | Medium | Free | Personal/small team |
| Queue Workers | Fast | High | Free | Multiple users |
| Cloud Services | Fastest | Low | $$ | Production scale |

---

## Next Steps (By Phase)

### Phase 1: Fast Browser Export ⏳

- [ ] Implement Canvas + MediaRecorder in `ExportButton.tsx`
- [ ] Test with MP4 and WebM files
- [ ] Add progress indicator during export
- [ ] Test output on TikTok/Instagram/YouTube Shorts

### Phase 2: FFmpeg Installation (When Needed)

- [ ] Upgrade to VPS hosting (if staying with Hostinger)
- [ ] Install FFmpeg on server
- [ ] Verify with `ffmpeg -version`
- [ ] Create `/api/` folder structure

### Phase 3: Server Transcoding (When Needed)

- [ ] Implement `/api/transcode.php`
- [ ] Implement `/api/export.php` 
- [ ] Update frontend to call server endpoints
- [ ] Add upload progress indicator
- [ ] Handle large file uploads (chunked if needed)
