<?php
/**
 * Lyric Drop API
 * 
 * Base URL: http://lyric-drop.joehunter.local:8081/api
 * 
 * Endpoints (Phase 3):
 * - POST /api/transcode.php - Convert video formats to MP4
 * - POST /api/export.php    - Burn subtitles into video
 * - GET  /api/download.php  - Download processed files
 */

header('Content-Type: application/json');

echo json_encode([
    'name' => 'Lyric Drop API',
    'version' => '1.0.0',
    'status' => 'ok',
    'endpoints' => [
        'transcode' => '/api/transcode.php (Phase 3)',
        'export' => '/api/export.php (Phase 3)',
        'download' => '/api/download.php (Phase 3)',
    ],
    'note' => 'Server-side transcoding requires FFmpeg installation',
]);
