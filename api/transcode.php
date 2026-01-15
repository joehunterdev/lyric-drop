<?php
/**
 * Transcode API Endpoint
 * 
 * POST /api/transcode.php
 * 
 * Converts uploaded video to web-friendly MP4 (H.264)
 * Requires FFmpeg installed on server
 * 
 * Request:
 *   - multipart/form-data
 *   - Field: video (file)
 * 
 * Response:
 *   - 200: { success: true, url: "/api/download.php?file=xxx", size: 12345 }
 *   - 400: { error: "No video file provided" }
 *   - 500: { error: "Transcode failed", details: "..." }
 * 
 * @todo Implement in Phase 3 when FFmpeg is available
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed']));
}

// Phase 3 placeholder
http_response_code(501);
echo json_encode([
    'error' => 'Not implemented',
    'message' => 'Server-side transcoding is planned for Phase 3',
    'requirements' => [
        'FFmpeg installation',
        'VPS or dedicated hosting',
        'PHP exec() enabled',
    ],
]);
