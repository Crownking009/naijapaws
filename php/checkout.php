<?php
// ============================================================
// NaijaPaws - Checkout Endpoint (AJAX)
// ============================================================
define('NAIJAPAWS', true);
require_once '../php/config.php';
require_once '../php/Database.php';
require_once '../php/Auth.php';
require_once '../php/Orders.php';

header('Content-Type: application/json');
Auth::startSession();

if (!Auth::isLoggedIn()) {
    echo json_encode(['success' => false, 'message' => 'Please login to checkout.', 'redirect' => '/login.php']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$csrf = $_SERVER['HTTP_X_CSRF'] ?? '';
if (!Auth::verifyCSRF($csrf)) {
    echo json_encode(['success' => false, 'message' => 'Security token invalid.']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
$clientCart = $body['cart'] ?? [];

if (empty($clientCart)) {
    echo json_encode(['success' => false, 'message' => 'Your cart is empty.']);
    exit;
}

$userId = Auth::getUserId();

// Sync client-side cart to DB first
Database::query('DELETE FROM cart_items WHERE user_id = ?', [$userId]);
foreach ($clientCart as $item) {
    $itemId   = (int)($item['id'] ?? 0);
    $itemType = in_array($item['type'] ?? '', ['dog','product']) ? $item['type'] : null;
    $qty      = max(1, (int)($item['qty'] ?? 1));
    if (!$itemId || !$itemType) continue;

    Database::query("
        INSERT IGNORE INTO cart_items (user_id, item_type, item_id, quantity)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = ?
    ", [$userId, $itemType, $itemId, $qty, $qty]);
}

$result = Orders::buildWhatsAppCheckout($userId);
echo json_encode($result);
exit;
