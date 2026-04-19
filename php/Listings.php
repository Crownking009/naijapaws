<?php
// ============================================================
// NaijaPaws - Listings Class
// ============================================================

class Listings {

    // ---- CREATE DOG LISTING ----------------------------------
    public static function createDogListing(int $sellerId, array $data, array $images): array {
        // Validate minimum images
        if (count($images['tmp_name'] ?? []) < MIN_LISTING_IMAGES) {
            return ['success' => false, 'message' => 'Minimum ' . MIN_LISTING_IMAGES . ' images required.'];
        }

        // Validate seller is approved
        $seller = Database::fetchOne('SELECT id, is_approved, commission_accepted FROM users WHERE id = ? AND role = "seller"', [$sellerId]);
        if (!$seller || !$seller['is_approved']) {
            return ['success' => false, 'message' => 'Seller account not yet approved.'];
        }
        if (!$seller['commission_accepted']) {
            return ['success' => false, 'message' => 'You must accept the commission agreement first.'];
        }

        Database::beginTransaction();
        try {
            $listingId = Database::insert('dog_listings', [
                'seller_id'            => $sellerId,
                'title'                => self::sanitize($data['title']),
                'category'             => $data['category'],
                'breed'                => self::sanitize($data['breed']),
                'age_months'           => (int)$data['age_months'],
                'gender'               => $data['gender'],
                'state'                => self::sanitize($data['state']),
                'city'                 => self::sanitize($data['city'] ?? ''),
                'price'                => $data['category'] === 'adoption' ? 0 : (float)$data['price'],
                'is_free'              => $data['category'] === 'adoption' ? 1 : 0,
                'is_pedigree'          => (int)($data['is_pedigree'] ?? 0),
                'is_vaccinated'        => (int)($data['is_vaccinated'] ?? 0),
                'vaccination_details'  => self::sanitize($data['vaccination_details'] ?? ''),
                'temperament'          => $data['temperament'],
                'purpose'              => $data['purpose'],
                'description'          => self::sanitize($data['description']),
                'health_status'        => self::sanitize($data['health_status'] ?? ''),
                'mating_fee'           => $data['category'] === 'mating' ? (float)($data['mating_fee'] ?? 0) : null,
                'status'               => 'pending',
                'expires_at'           => date('Y-m-d', strtotime('+' . LISTING_EXPIRY_DAYS . ' days')),
            ]);

            // Upload images
            $uploadedImages = self::uploadListingImages($listingId, $images, 'dog');
            if (!$uploadedImages['success']) {
                Database::rollback();
                return $uploadedImages;
            }

            Database::commit();
            Auth::logActivity($sellerId, 'create_listing', 'dog_listing', $listingId, 'New dog listing created');
            self::notifyAdmin('new_listing', $listingId, 'dog');

            return ['success' => true, 'listing_id' => $listingId, 'message' => 'Listing submitted for review.'];
        } catch (Exception $e) {
            Database::rollback();
            error_log($e->getMessage());
            return ['success' => false, 'message' => 'Failed to create listing. Please try again.'];
        }
    }

    // ---- CREATE PRODUCT LISTING ------------------------------
    public static function createProduct(int $sellerId, array $data, array $images): array {
        $seller = Database::fetchOne('SELECT id, is_approved, commission_accepted FROM users WHERE id = ? AND role = "seller"', [$sellerId]);
        if (!$seller || !$seller['is_approved']) return ['success' => false, 'message' => 'Seller not approved.'];

        Database::beginTransaction();
        try {
            $productId = Database::insert('products', [
                'seller_id'     => $sellerId,
                'name'          => self::sanitize($data['name']),
                'category'      => $data['category'],
                'price'         => (float)$data['price'],
                'compare_price' => !empty($data['compare_price']) ? (float)$data['compare_price'] : null,
                'stock_qty'     => (int)$data['stock_qty'],
                'description'   => self::sanitize($data['description']),
                'ingredients'   => self::sanitize($data['ingredients'] ?? ''),
                'weight_kg'     => !empty($data['weight_kg']) ? (float)$data['weight_kg'] : null,
                'brand'         => self::sanitize($data['brand'] ?? ''),
                'status'        => 'pending',
            ]);

            $uploadResult = self::uploadListingImages($productId, $images, 'product');
            if (!$uploadResult['success']) {
                Database::rollback();
                return $uploadResult;
            }

            Database::commit();
            return ['success' => true, 'product_id' => $productId, 'message' => 'Product submitted for review.'];
        } catch (Exception $e) {
            Database::rollback();
            return ['success' => false, 'message' => 'Failed to create product.'];
        }
    }

    // ---- IMAGE UPLOAD WITH DUPLICATE DETECTION ---------------
    public static function uploadListingImages(int $itemId, array $files, string $type): array {
        $uploadDir = $type === 'dog' ? DOG_UPLOAD_PATH : PRODUCT_UPLOAD_PATH;
        $table = $type === 'dog' ? 'dog_images' : 'product_images';
        $col = $type === 'dog' ? 'listing_id' : 'product_id';

        $uploaded = 0;
        $errors = [];

        foreach ($files['tmp_name'] as $idx => $tmpName) {
            if ($files['error'][$idx] !== UPLOAD_ERR_OK) continue;

            $mimeType = mime_content_type($tmpName);
            if (!in_array($mimeType, ALLOWED_IMAGE_TYPES)) {
                $errors[] = "File {$idx}: invalid type.";
                continue;
            }

            if ($files['size'][$idx] > MAX_FILE_SIZE) {
                $errors[] = "File {$idx}: exceeds 5MB limit.";
                continue;
            }

            // Hash for duplicate detection
            $hash = hash_file('sha256', $tmpName);
            $exists = Database::fetchOne(
                "SELECT id FROM {$table} WHERE {$col} = ? AND image_hash = ?",
                [$itemId, $hash]
            );
            if ($exists) {
                $errors[] = "Duplicate image detected (image #" . ($idx+1) . ").";
                continue;
            }

            $ext = pathinfo($files['name'][$idx], PATHINFO_EXTENSION) ?: 'jpg';
            $filename = $type . '_' . $itemId . '_' . time() . '_' . $idx . '.' . $ext;
            $destPath = $uploadDir . $filename;

            if (move_uploaded_file($tmpName, $destPath)) {
                Database::insert($table, [
                    $col         => $itemId,
                    'image_path' => 'uploads/' . $type . 's/' . $filename,
                    'image_hash' => $hash,
                    'is_primary' => $uploaded === 0 ? 1 : 0,
                    'sort_order' => $uploaded,
                ]);
                $uploaded++;
            }
        }

        if ($uploaded < MIN_LISTING_IMAGES) {
            return ['success' => false, 'message' => 'Need at least ' . MIN_LISTING_IMAGES . ' valid images. Errors: ' . implode(', ', $errors)];
        }

        return ['success' => true, 'uploaded' => $uploaded, 'errors' => $errors];
    }

    // ---- GET LISTINGS WITH FILTERS ---------------------------
    public static function getDogListings(array $filters = [], int $page = 1): array {
        $where = ['dl.status = "approved"'];
        $params = [];

        if (!empty($filters['category']))    { $where[] = 'dl.category = ?'; $params[] = $filters['category']; }
        if (!empty($filters['breed']))       { $where[] = 'dl.breed = ?';    $params[] = $filters['breed']; }
        if (!empty($filters['gender']))      { $where[] = 'dl.gender = ?';   $params[] = $filters['gender']; }
        if (!empty($filters['state']))       { $where[] = 'dl.state = ?';    $params[] = $filters['state']; }
        if (!empty($filters['is_pedigree'])) { $where[] = 'dl.is_pedigree = 1'; }
        if (!empty($filters['temperament'])) { $where[] = 'dl.temperament = ?'; $params[] = $filters['temperament']; }
        if (!empty($filters['min_price']))   { $where[] = 'dl.price >= ?';   $params[] = (float)$filters['min_price']; }
        if (!empty($filters['max_price']))   { $where[] = 'dl.price <= ?';   $params[] = (float)$filters['max_price']; }
        if (!empty($filters['search']))      { $where[] = 'MATCH(dl.title, dl.breed, dl.description) AGAINST(? IN BOOLEAN MODE)'; $params[] = $filters['search'] . '*'; }

        $whereClause = implode(' AND ', $where);
        $offset = ($page - 1) * ITEMS_PER_PAGE;

        $total = Database::fetchOne("SELECT COUNT(*) as cnt FROM dog_listings dl WHERE {$whereClause}", $params)['cnt'];

        $sort = match($filters['sort'] ?? 'newest') {
            'price_asc'  => 'dl.price ASC',
            'price_desc' => 'dl.price DESC',
            'featured'   => 'dl.is_featured DESC, dl.created_at DESC',
            default      => 'dl.created_at DESC',
        };

        $listings = Database::fetchAll("
            SELECT dl.*, 
                   u.full_name as seller_name, u.phone as seller_phone,
                   (SELECT image_path FROM dog_images WHERE listing_id = dl.id AND is_primary = 1 LIMIT 1) as primary_image,
                   (SELECT AVG(rating) FROM reviews WHERE item_type = 'dog' AND item_id = dl.id) as avg_rating,
                   (SELECT COUNT(*) FROM reviews WHERE item_type = 'dog' AND item_id = dl.id) as review_count
            FROM dog_listings dl
            JOIN users u ON u.id = dl.seller_id
            WHERE {$whereClause}
            ORDER BY {$sort}
            LIMIT ? OFFSET ?
        ", array_merge($params, [ITEMS_PER_PAGE, $offset]));

        return [
            'listings'   => $listings,
            'total'      => (int)$total,
            'pages'      => ceil($total / ITEMS_PER_PAGE),
            'page'       => $page,
        ];
    }

    // ---- GET SINGLE LISTING ----------------------------------
    public static function getDogListing(int $id): ?array {
        $listing = Database::fetchOne("
            SELECT dl.*, u.full_name as seller_name, u.phone as seller_phone, u.is_approved as seller_verified,
                   (SELECT AVG(rating) FROM reviews WHERE item_type = 'dog' AND item_id = dl.id) as avg_rating
            FROM dog_listings dl
            JOIN users u ON u.id = dl.seller_id
            WHERE dl.id = ?
        ", [$id]);

        if ($listing) {
            $listing['images'] = Database::fetchAll('SELECT * FROM dog_images WHERE listing_id = ? ORDER BY sort_order', [$id]);
            $listing['reviews'] = Database::fetchAll("
                SELECT r.*, u.full_name as reviewer_name FROM reviews r
                JOIN users u ON u.id = r.reviewer_id
                WHERE r.item_type = 'dog' AND r.item_id = ? AND r.is_approved = 1
                ORDER BY r.created_at DESC LIMIT 10
            ", [$id]);

            // Increment view count
            Database::query('UPDATE dog_listings SET views = views + 1 WHERE id = ?', [$id]);
        }
        return $listing ?: null;
    }

    // ---- FEATURED LISTINGS -----------------------------------
    public static function getFeaturedListings(string $category = 'sale', int $limit = 6): array {
        return Database::fetchAll("
            SELECT dl.*, 
                   (SELECT image_path FROM dog_images WHERE listing_id = dl.id AND is_primary = 1 LIMIT 1) as primary_image,
                   u.full_name as seller_name
            FROM dog_listings dl
            JOIN users u ON u.id = dl.seller_id
            WHERE dl.status = 'approved' AND dl.category = ? AND dl.is_featured = 1
            ORDER BY dl.created_at DESC LIMIT ?
        ", [$category, $limit]);
    }

    // ---- APPROVE/REJECT (Admin) ------------------------------
    public static function approveListing(int $listingId, int $adminId, string $type = 'dog'): bool {
        $table = $type === 'dog' ? 'dog_listings' : 'products';
        $col = $type === 'dog' ? 'approved_by' : 'id';

        Database::query(
            "UPDATE {$table} SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?",
            [$adminId, $listingId]
        );

        // Notify seller
        $listing = Database::fetchOne("SELECT seller_id FROM {$table} WHERE id = ?", [$listingId]);
        if ($listing) {
            self::notifySeller($listing['seller_id'], 'Listing Approved!', 'Your listing has been approved and is now live.', "/{$type}/{$listingId}");
        }
        Auth::logActivity($adminId, 'approve_listing', $type, $listingId, "Approved {$type} listing #{$listingId}");
        return true;
    }

    public static function rejectListing(int $listingId, int $adminId, string $reason, string $type = 'dog'): bool {
        $table = $type === 'dog' ? 'dog_listings' : 'products';
        Database::query("UPDATE {$table} SET status = 'rejected', admin_note = ? WHERE id = ?", [$reason, $listingId]);

        $listing = Database::fetchOne("SELECT seller_id FROM {$table} WHERE id = ?", [$listingId]);
        if ($listing) {
            self::notifySeller($listing['seller_id'], 'Listing Rejected', "Your listing was rejected: {$reason}", null);
        }
        return true;
    }

    // ---- HELPERS ---------------------------------------------
    private static function sanitize(string $input): string {
        return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
    }

    private static function notifyAdmin(string $type, int $id, string $itemType): void {
        $adminId = Database::fetchOne('SELECT id FROM users WHERE role = "admin" LIMIT 1')['id'] ?? null;
        if ($adminId) {
            Database::insert('notifications', [
                'user_id'    => $adminId,
                'title'      => 'New ' . ucfirst($itemType) . ' Listing Pending Review',
                'message'    => "A new {$itemType} listing #{$id} requires your approval.",
                'type'       => 'listing',
                'action_url' => "/admin/listings.php?id={$id}&type={$itemType}",
            ]);
        }
    }

    private static function notifySeller(int $sellerId, string $title, string $msg, ?string $url): void {
        Database::insert('notifications', [
            'user_id'    => $sellerId,
            'title'      => $title,
            'message'    => $msg,
            'type'       => 'listing',
            'action_url' => $url,
        ]);
    }
}
