<?php
// ============================================================
// NaijaPaws - Vet Requests Handler
// ============================================================

class VetRequests {

    /**
     * Submit a vet service request with optional image upload
     */
    public static function submitRequest(array $data, ?array $image = null): array {
        try {
            // Validate required fields
            $requiredFields = ['full_name', 'phone', 'whatsapp_number', 'state', 'dog_issue'];
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    return ['success' => false, 'message' => ucfirst(str_replace('_', ' ', $field)) . ' is required.'];
                }
            }

            // Validate phone numbers
            if (!self::isValidPhone($data['phone'])) {
                return ['success' => false, 'message' => 'Please enter a valid phone number.'];
            }
            if (!self::isValidPhone($data['whatsapp_number'])) {
                return ['success' => false, 'message' => 'Please enter a valid WhatsApp number.'];
            }

            // Handle image upload if provided
            $imagePath = null;
            if ($image && $image['size'] > 0) {
                $uploadResult = self::uploadPetImage($image);
                if (!$uploadResult['success']) {
                    return $uploadResult;
                }
                $imagePath = $uploadResult['path'];
            }

            // Get current user ID if logged in
            $userId = null;
            if (isset($_SESSION['np_user_id'])) {
                $userId = $_SESSION['np_user_id'];
            }

            // Insert vet request into database
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
                'pet_image'        => $imagePath,
                'whatsapp_sent'    => 1,
            ]);

            // Build and send WhatsApp message
            $adminWA = Database::fetchOne('SELECT setting_value FROM settings WHERE setting_key = "admin_whatsapp"')['setting_value'] ?? ADMIN_WHATSAPP;
            $message = self::buildWhatsAppMessage($requestId, $data);
            $waUrl = 'https://wa.me/' . preg_replace('/\D/', '', $adminWA) . '?text=' . urlencode($message);

            return [
                'success'           => true,
                'vet_request_id'    => $requestId,
                'wa_url'            => $waUrl,
                'message'           => 'Vet request submitted successfully!',
                'has_image'         => $imagePath !== null,
            ];
        } catch (Exception $e) {
            error_log('VetRequests::submitRequest Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'An error occurred while processing your request. Please try again.'];
        }
    }

    /**
     * Validate phone number format
     */
    private static function isValidPhone(string $phone): bool {
        // Remove non-numeric characters
        $cleaned = preg_replace('/\D/', '', $phone);
        // Nigerian phone numbers should be 10-11 digits
        return strlen($cleaned) >= 10 && strlen($cleaned) <= 13;
    }

    /**
     * Handle pet image upload
     */
    private static function uploadPetImage(array $image): array {
        // Validate file
        if ($image['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'Error uploading image. Please try again.'];
        }

        $mimeType = mime_content_type($image['tmp_name']);
        if (!in_array($mimeType, ALLOWED_IMAGE_TYPES)) {
            return ['success' => false, 'message' => 'Please upload a valid image (JPEG, PNG, or WebP).'];
        }

        if ($image['size'] > MAX_FILE_SIZE) {
            return ['success' => false, 'message' => 'Image size must be less than 5MB.'];
        }

        // Create upload directory if it doesn't exist
        if (!is_dir(VET_REQUEST_UPLOAD_PATH)) {
            mkdir(VET_REQUEST_UPLOAD_PATH, 0755, true);
        }

        // Generate unique filename
        $extension = match($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            default      => 'jpg',
        };

        $filename = 'vet_' . time() . '_' . uniqid() . '.' . $extension;
        $filePath = VET_REQUEST_UPLOAD_PATH . $filename;

        // Move uploaded file
        if (!move_uploaded_file($image['tmp_name'], $filePath)) {
            return ['success' => false, 'message' => 'Failed to save image. Please try again.'];
        }

        return ['success' => true, 'path' => 'uploads/vet_requests/' . $filename];
    }

    /**
     * Build WhatsApp message for vet request
     */
    private static function buildWhatsAppMessage(int $requestId, array $data): string {
        $urgencyEmoji = match($data['urgency'] ?? 'normal') {
            'emergency' => '🚨',
            'urgent'    => '⚡',
            default     => '🩺',
        };

        $msg = "{$urgencyEmoji} *Vet Service Request - NaijaPaws*\n";
        $msg .= "━━━━━━━━━━━━━━━━━━━\n";
        $msg .= "📋 Request ID: #VET-{$requestId}\n";
        $msg .= "👤 Name: *{$data['full_name']}*\n";
        $msg .= "📱 Phone: *{$data['phone']}*\n";
        $msg .= "💬 WhatsApp: *{$data['whatsapp_number']}*\n";
        $msg .= "📍 Location: *{$data['state']}" . (!empty($data['city']) ? ", {$data['city']}" : '') . "*\n";
        $msg .= "❗ Urgency: *" . strtoupper($data['urgency'] ?? 'normal') . "*\n\n";
        $msg .= "🐶 *Dog Issue:*\n{$data['dog_issue']}\n\n";
        $msg .= "━━━━━━━━━━━━━━━━━━━\n";
        $msg .= "Submitted: " . date('Y-m-d H:i:s');

        return $msg;
    }

    /**
     * Get vet requests for admin dashboard
     */
    public static function getRequests(string $status = 'all', int $limit = 50, int $offset = 0): array {
        if ($status === 'all') {
            $sql = 'SELECT * FROM vet_requests ORDER BY created_at DESC LIMIT ? OFFSET ?';
            $params = [$limit, $offset];
        } else {
            $sql = 'SELECT * FROM vet_requests WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
            $params = [$status, $limit, $offset];
        }

        return Database::fetchAll($sql, $params);
    }

    /**
     * Get single vet request
     */
    public static function getRequest(int $requestId): ?array {
        return Database::fetchOne('SELECT * FROM vet_requests WHERE id = ?', [$requestId]);
    }

    /**
     * Update vet request status
     */
    public static function updateStatus(int $requestId, string $status, string $vetName = null, string $adminNote = null): bool {
        $data = ['status' => $status];
        if ($vetName) {
            $data['assigned_vet'] = $vetName;
        }
        if ($adminNote) {
            $data['admin_note'] = $adminNote;
        }

        return Database::update('vet_requests', $data, 'id = ?', [$requestId]) > 0;
    }

    /**
     * Get request count by status
     */
    public static function getCountByStatus(): array {
        $stats = Database::fetchAll('SELECT status, COUNT(*) as count FROM vet_requests GROUP BY status');
        $result = ['all' => 0];
        foreach ($stats as $stat) {
            $result[$stat['status']] = $stat['count'];
            $result['all'] += $stat['count'];
        }
        return $result;
    }
}
