<?php
/**
 * Download API Endpoint
 * 
 * GET /api/download.php?file=xxx
 * 
 * Serves processed video files for download
 * 
 * Request:
 *   - Query param: file (filename)
 * 
 * Response:
 *   - 200: Binary file stream
 *   - 400: { error: "No file specified" }
 *   - 404: { error: "File not found" }
 * 
 * @todo Implement in Phase 3 when FFmpeg processing is available
 */

header('Access-Control-Allow-Origin: *');

// Only allow GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Content-Type: application/json');
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed']));
}

$file = $_GET['file'] ?? null;

if (!$file) {
    header('Content-Type: application/json');
    http_response_code(400);
    exit(json_encode(['error' => 'No file specified']));
}

// Security: only allow alphanumeric filenames with extensions
if (!preg_match('/^[a-zA-Z0-9_-]+\.(mp4|webm|mov)$/', $file)) {
    header('Content-Type: application/json');
    http_response_code(400);
    exit(json_encode(['error' => 'Invalid filename']));
}

// Output directory (to be configured in Phase 3)
$outputDir = sys_get_temp_dir() . '/lyric-drop/output/';
$filePath = $outputDir . $file;

if (!file_exists($filePath)) {
    header('Content-Type: application/json');
    http_response_code(404);
    exit(json_encode(['error' => 'File not found']));
}

// Serve file
$mimeType = mime_content_type($filePath) ?: 'application/octet-stream';
header('Content-Type: ' . $mimeType);
header('Content-Disposition: attachment; filename="' . $file . '"');
header('Content-Length: ' . filesize($filePath));

readfile($filePath);
exit;
