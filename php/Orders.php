<?php
// ============================================================
// NaijaPaws - Orders & Cart Class
// ============================================================

class Orders {

    // ---- CART -----------------------------------------------
    public static function addToCart(int $userId, string $itemType, int $itemId, int $qty = 1): array {
        // Check item exists and is approved
        if ($itemType === 'dog') {
            $item = Database::fetchOne('SELECT id, status, price, category FROM dog_listings WHERE id = ? AND status = "approved"', [$itemId]);
            if ($item && $item['category'] === 'mating') {
                return ['success' => false, 'message' => 'Mating requests cannot be added to cart. Contact the seller directly.'];
            }
        } else {
            $item = Database::fetchOne('SELECT id, status, price, stock_qty FROM products WHERE id = ? AND status = "approved"', [$itemId]);
            if ($item && $item['stock_qty'] < $qty) {
                return ['success' => false, 'message' => 'Insufficient stock.'];
            }
        }

        if (!$item) return ['success' => false, 'message' => 'Item not available.'];

        // Check if already in cart
        $existing = Database::fetchOne(
            'SELECT id, quantity FROM cart_items WHERE user_id = ? AND item_type = ? AND item_id = ?',
            [$userId, $itemType, $itemId]
        );

        if ($existing) {
            Database::query(
                'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
                [$qty, $existing['id']]
            );
        } else {
            Database::insert('cart_items', [
                'user_id'   => $userId,
                'item_type' => $itemType,
                'item_id'   => $itemId,
                'quantity'  => $qty,
            ]);
        }

        return ['success' => true, 'message' => 'Added to cart.'];
    }

    public static function removeFromCart(int $userId, int $cartItemId): bool {
        Database::query('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [$cartItemId, $userId]);
        return true;
    }

    public static function getCart(int $userId): array {
        $items = Database::fetchAll("
            SELECT ci.*, ci.id as cart_item_id,
                   CASE 
                       WHEN ci.item_type = 'dog' THEN dl.title
                       WHEN ci.item_type = 'product' THEN p.name
                   END as item_name,
                   CASE 
                       WHEN ci.item_type = 'dog' THEN dl.price
                       WHEN ci.item_type = 'product' THEN p.price
                   END as item_price,
                   CASE 
                       WHEN ci.item_type = 'dog' THEN (SELECT image_path FROM dog_images WHERE listing_id = dl.id AND is_primary = 1 LIMIT 1)
                       WHEN ci.item_type = 'product' THEN (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1)
                   END as item_image,
                   CASE 
                       WHEN ci.item_type = 'dog' THEN us.full_name
                       WHEN ci.item_type = 'product' THEN up.full_name
                   END as seller_name,
                   CASE 
                       WHEN ci.item_type = 'dog' THEN us.phone
                       WHEN ci.item_type = 'product' THEN up.phone
                   END as seller_phone,
                   CASE 
                       WHEN ci.item_type = 'dog' THEN dl.seller_id
                       WHEN ci.item_type = 'product' THEN p.seller_id
                   END as seller_id
            FROM cart_items ci
            LEFT JOIN dog_listings dl ON ci.item_type = 'dog' AND ci.item_id = dl.id
            LEFT JOIN products p ON ci.item_type = 'product' AND ci.item_id = p.id
            LEFT JOIN users us ON ci.item_type = 'dog' AND dl.seller_id = us.id
            LEFT JOIN users up ON ci.item_type = 'product' AND p.seller_id = up.id
            WHERE ci.user_id = ?
            ORDER BY ci.added_at DESC
        ", [$userId]);

        $total = 0;
        foreach ($items as &$item) {
            $item['subtotal'] = $item['item_price'] * $item['quantity'];
            $total += $item['subtotal'];
        }

        $commissionRate = (float)(Database::fetchOne('SELECT setting_value FROM settings WHERE setting_key = "commission_rate"')['setting_value'] ?? 30);

        return [
            'items'           => $items,
            'total'           => $total,
            'commission_rate' => $commissionRate,
            'count'           => count($items),
        ];
    }

    public static function clearCart(int $userId): void {
        Database::query('DELETE FROM cart_items WHERE user_id = ?', [$userId]);
    }

    // ---- CHECKOUT -------------------------------------------
    public static function buildWhatsAppCheckout(int $userId): array {
        $cart = self::getCart($userId);
        if (empty($cart['items'])) return ['success' => false, 'message' => 'Cart is empty.'];

        $buyer = Database::fetchOne('SELECT full_name, phone FROM users WHERE id = ?', [$userId]);
        if (!$buyer) return ['success' => false, 'message' => 'User not found.'];

        $adminWhatsApp = Database::fetchOne('SELECT setting_value FROM settings WHERE setting_key = "admin_whatsapp"')['setting_value'] ?? ADMIN_WHATSAPP;
        $commissionRate = $cart['commission_rate'];

        // Build order in DB
        $orderRef = 'NP-' . date('Y') . '-' . str_pad(rand(1, 99999), 5, '0', STR_PAD_LEFT);
        $commission = $cart['total'] * ($commissionRate / 100);

        Database::beginTransaction();
        try {
            $orderId = Database::insert('orders', [
                'order_ref'         => $orderRef,
                'buyer_id'          => $userId,
                'total_amount'      => $cart['total'],
                'commission_amount' => $commission,
                'commission_rate'   => $commissionRate,
                'status'            => 'pending',
                'whatsapp_sent'     => 1,
                'whatsapp_sent_at'  => date('Y-m-d H:i:s'),
            ]);

            foreach ($cart['items'] as $item) {
                $itemCommission = $item['subtotal'] * ($commissionRate / 100);
                Database::insert('order_items', [
                    'order_id'         => $orderId,
                    'seller_id'        => $item['seller_id'],
                    'item_type'        => $item['item_type'],
                    'item_id'          => $item['item_id'],
                    'item_name'        => $item['item_name'],
                    'item_price'       => $item['item_price'],
                    'quantity'         => $item['quantity'],
                    'subtotal'         => $item['subtotal'],
                    'commission_amount'=> $itemCommission,
                    'seller_payout'    => $item['subtotal'] - $itemCommission,
                ]);
            }

            Database::commit();
        } catch (Exception $e) {
            Database::rollback();
            error_log($e->getMessage());
            return ['success' => false, 'message' => 'Order creation failed.'];
        }

        // Build WhatsApp message
        $message = self::buildWhatsAppMessage($orderRef, $cart, $buyer, $commissionRate);
        $waUrl = 'https://wa.me/' . preg_replace('/\D/', '', $adminWhatsApp) . '?text=' . urlencode($message);

        // Clear cart after order created
        self::clearCart($userId);

        Auth::logActivity($userId, 'checkout', 'order', $orderId, "Checkout order #{$orderRef}");

        return [
            'success'    => true,
            'order_id'   => $orderId,
            'order_ref'  => $orderRef,
            'wa_url'     => $waUrl,
            'message'    => 'Order created. Redirecting to WhatsApp...',
        ];
    }

    private static function buildWhatsAppMessage(string $orderRef, array $cart, array $buyer, float $commissionRate): string {
        $msg = "🐾 *NaijaPaws Order Request*\n";
        $msg .= "━━━━━━━━━━━━━━━━━━━\n";
        $msg .= "📋 Order Ref: *{$orderRef}*\n";
        $msg .= "👤 Buyer: *{$buyer['full_name']}*\n";
        $msg .= "📱 Buyer Phone: *{$buyer['phone']}*\n";
        $msg .= "━━━━━━━━━━━━━━━━━━━\n\n";
        $msg .= "🛒 *ORDER ITEMS:*\n\n";

        $currentSeller = '';
        foreach ($cart['items'] as $item) {
            if ($item['seller_name'] !== $currentSeller) {
                $msg .= "🏪 *Seller: {$item['seller_name']}*\n";
                $msg .= "   📞 {$item['seller_phone']}\n";
                $currentSeller = $item['seller_name'];
            }
            $msg .= "  • {$item['item_name']}\n";
            $msg .= "    Qty: {$item['quantity']} × ₦" . number_format($item['item_price']) . "\n";
            $msg .= "    Subtotal: ₦" . number_format($item['subtotal']) . "\n\n";
        }

        $msg .= "━━━━━━━━━━━━━━━━━━━\n";
        $msg .= "💰 *Total Amount: ₦" . number_format($cart['total']) . "*\n";
        $msg .= "📊 Platform Commission ({$commissionRate}%): ₦" . number_format($cart['total'] * ($commissionRate / 100)) . "\n";
        $msg .= "━━━━━━━━━━━━━━━━━━━\n\n";
        $msg .= "⚠️ *Please pay ONLY to NaijaPaws Admin — Never pay sellers directly*\n\n";
        $msg .= "Thank you for shopping with NaijaPaws! 🐶";

        return $msg;
    }

    // ---- VET REQUEST ----------------------------------------
    public static function submitVetRequest(array $data, ?int $userId = null): array {
        $requestId = Database::insert('vet_requests', [
            'user_id'          => $userId,
            'full_name'        => htmlspecialchars(trim($data['full_name'])),
            'phone'            => trim($data['phone']),
            'whatsapp_number'  => trim($data['whatsapp_number']),
            'state'            => trim($data['state']),
            'city'             => trim($data['city'] ?? ''),
            'address'          => trim($data['address'] ?? ''),
            'dog_issue'        => htmlspecialchars(trim($data['dog_issue'])),
            'urgency'          => $data['urgency'] ?? 'normal',
            'whatsapp_sent'    => 1,
        ]);

        $adminWA = Database::fetchOne('SELECT setting_value FROM settings WHERE setting_key = "admin_whatsapp"')['setting_value'] ?? ADMIN_WHATSAPP;
        $urgencyEmoji = match($data['urgency'] ?? 'normal') { 'emergency' => '🚨', 'urgent' => '⚡', default => '🩺' };

        $msg = "{$urgencyEmoji} *Vet Service Request - NaijaPaws*\n";
        $msg .= "━━━━━━━━━━━━━━━━━━━\n";
        $msg .= "👤 Name: *{$data['full_name']}*\n";
        $msg .= "📱 Phone: *{$data['phone']}*\n";
        $msg .= "💬 WhatsApp: *{$data['whatsapp_number']}*\n";
        $msg .= "📍 Location: *{$data['state']}" . (!empty($data['city']) ? ", {$data['city']}" : '') . "*\n";
        $msg .= "❗ Urgency: *" . strtoupper($data['urgency'] ?? 'normal') . "*\n\n";
        $msg .= "🐶 *Issue Description:*\n{$data['dog_issue']}\n\n";
        $msg .= "━━━━━━━━━━━━━━━━━━━\n";
        $msg .= "Request ID: #VET-{$requestId}";

        $waUrl = 'https://wa.me/' . preg_replace('/\D/', '', $adminWA) . '?text=' . urlencode($msg);

        return ['success' => true, 'vet_request_id' => $requestId, 'wa_url' => $waUrl];
    }

    // ---- ADMIN ORDER MANAGEMENT ------------------------------
    public static function updateOrderStatus(int $orderId, string $status, int $adminId, ?string $note = null): bool {
        $updates = ['status' => $status];
        if ($status === 'payment_received') $updates['payment_confirmed_at'] = date('Y-m-d H:i:s');
        if ($status === 'completed')        $updates['completed_at'] = date('Y-m-d H:i:s');
        if ($note)                          $updates['admin_note'] = $note;

        Database::update('orders', $updates, 'id = ?', [$orderId]);

        $order = Database::fetchOne('SELECT buyer_id, order_ref FROM orders WHERE id = ?', [$orderId]);
        if ($order) {
            $statusMessages = [
                'confirmed'        => 'Your order has been confirmed by admin.',
                'payment_received' => 'Your payment has been received. We\'ll connect you with the seller shortly.',
                'completed'        => 'Your order is complete! Thank you for shopping with NaijaPaws.',
                'cancelled'        => 'Your order has been cancelled. Contact admin for details.',
            ];
            if (isset($statusMessages[$status])) {
                Database::insert('notifications', [
                    'user_id'    => $order['buyer_id'],
                    'title'      => 'Order Update - ' . $order['order_ref'],
                    'message'    => $statusMessages[$status],
                    'type'       => 'order',
                    'action_url' => '/orders.php?ref=' . $order['order_ref'],
                ]);
            }
        }

        Auth::logActivity($adminId, 'update_order_status', 'order', $orderId, "Status changed to {$status}");
        return true;
    }

    public static function getOrders(array $filters = [], int $page = 1): array {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['status']))   { $where[] = 'o.status = ?'; $params[] = $filters['status']; }
        if (!empty($filters['buyer_id'])) { $where[] = 'o.buyer_id = ?'; $params[] = $filters['buyer_id']; }

        $whereClause = implode(' AND ', $where);
        $offset = ($page - 1) * ITEMS_PER_PAGE;
        $total = Database::fetchOne("SELECT COUNT(*) as cnt FROM orders o WHERE {$whereClause}", $params)['cnt'];

        $orders = Database::fetchAll("
            SELECT o.*, u.full_name as buyer_name, u.phone as buyer_phone
            FROM orders o JOIN users u ON u.id = o.buyer_id
            WHERE {$whereClause}
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        ", array_merge($params, [ITEMS_PER_PAGE, $offset]));

        foreach ($orders as &$order) {
            $order['items'] = Database::fetchAll('SELECT * FROM order_items WHERE order_id = ?', [$order['id']]);
        }

        return ['orders' => $orders, 'total' => (int)$total, 'pages' => ceil($total / ITEMS_PER_PAGE)];
    }
}
