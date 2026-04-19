<?php
// ============================================================
// NaijaPaws - Favorites AJAX Handler
// ============================================================
define('NAIJAPAWS', true);
require_once 'php/config.php';
require_once 'php/Database.php';
require_once 'php/Auth.php';

header('Content-Type: application/json');
Auth::startSession();

if (!Auth::isLoggedIn()) {
    echo json_encode(['success' => false]);
    exit;
}

$body   = json_decode(file_get_contents('php://input'), true);
$id     = (int)($body['id']     ?? 0);
$type   = in_array($body['type'] ?? '', ['dog','product']) ? $body['type'] : null;
$action = in_array($body['action'] ?? '', ['add','remove']) ? $body['action'] : null;

if (!$id || !$type || !$action) {
    echo json_encode(['success' => false]);
    exit;
}

$userId = Auth::getUserId();
if ($action === 'add') {
    try {
        Database::insert('favorites', [
            'user_id'   => $userId,
            'item_type' => $type,
            'item_id'   => $id,
        ]);
    } catch (Exception $e) {
        // Duplicate — ignore
    }
} else {
    Database::query('DELETE FROM favorites WHERE user_id = ? AND item_type = ? AND item_id = ?', [$userId, $type, $id]);
}

echo json_encode(['success' => true]);
