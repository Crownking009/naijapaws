-- ============================================================
-- NaijaPaws Database Schema
-- Nigerian Dog Marketplace & Service Platform
-- ============================================================

CREATE DATABASE IF NOT EXISTS naijapaws CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE naijapaws;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('buyer','seller','admin') DEFAULT 'buyer',
    avatar VARCHAR(255) DEFAULT NULL,
    state VARCHAR(100) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    is_verified TINYINT(1) DEFAULT 0,        -- email verification
    is_approved TINYINT(1) DEFAULT 0,        -- admin approved (sellers)
    is_banned TINYINT(1) DEFAULT 0,
    verification_token VARCHAR(100) DEFAULT NULL,
    reset_token VARCHAR(100) DEFAULT NULL,
    reset_expires DATETIME DEFAULT NULL,
    commission_accepted TINYINT(1) DEFAULT 0, -- seller agreed to 30%
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_approved (is_approved)
);

-- ============================================================
-- SELLER VERIFICATION REQUESTS
-- ============================================================
CREATE TABLE seller_verifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    state VARCHAR(100) NOT NULL,
    nin_number VARCHAR(20) DEFAULT NULL,
    id_type ENUM('nin','voters_card','drivers_license','intl_passport') NOT NULL,
    id_image VARCHAR(255) NOT NULL,
    selfie_image VARCHAR(255) DEFAULT NULL,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    admin_note TEXT DEFAULT NULL,
    reviewed_by INT UNSIGNED DEFAULT NULL,
    reviewed_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_user (user_id)
);

-- ============================================================
-- DOG LISTINGS
-- ============================================================
CREATE TABLE dog_listings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seller_id INT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    category ENUM('sale','adoption','mating') NOT NULL,
    breed VARCHAR(100) NOT NULL,
    age_months INT UNSIGNED NOT NULL,
    gender ENUM('male','female') NOT NULL,
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) DEFAULT NULL,
    price DECIMAL(12,2) DEFAULT 0.00,
    is_free TINYINT(1) DEFAULT 0,
    is_pedigree TINYINT(1) DEFAULT 0,
    is_vaccinated TINYINT(1) DEFAULT 0,
    vaccination_details TEXT DEFAULT NULL,
    temperament ENUM('friendly','aggressive','moderate') DEFAULT 'friendly',
    purpose SET('pet','security','breeding','show') DEFAULT 'pet',
    description TEXT NOT NULL,
    health_status TEXT DEFAULT NULL,
    mating_fee DECIMAL(12,2) DEFAULT NULL,
    status ENUM('pending','approved','rejected','sold','expired') DEFAULT 'pending',
    is_featured TINYINT(1) DEFAULT 0,
    views INT UNSIGNED DEFAULT 0,
    admin_note TEXT DEFAULT NULL,
    approved_by INT UNSIGNED DEFAULT NULL,
    approved_at DATETIME DEFAULT NULL,
    expires_at DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_breed (breed),
    INDEX idx_state (state),
    INDEX idx_featured (is_featured),
    FULLTEXT idx_search (title, breed, description)
);

-- ============================================================
-- DOG LISTING IMAGES
-- ============================================================
CREATE TABLE dog_images (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    listing_id INT UNSIGNED NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    image_hash VARCHAR(64) NOT NULL,       -- SHA-256 hash to prevent duplicates
    is_primary TINYINT(1) DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES dog_listings(id) ON DELETE CASCADE,
    UNIQUE KEY unique_hash_per_listing (listing_id, image_hash),
    INDEX idx_listing (listing_id)
);

-- ============================================================
-- PRODUCTS STORE
-- ============================================================
CREATE TABLE products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seller_id INT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    category ENUM('food','vitamins','leash_collars','tick_flea','grooming','bowls_feeders','beds_cages','medical_cards','accessories') NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    compare_price DECIMAL(12,2) DEFAULT NULL,    -- original price for discount display
    stock_qty INT UNSIGNED DEFAULT 0,
    description TEXT NOT NULL,
    ingredients TEXT DEFAULT NULL,
    weight_kg DECIMAL(6,2) DEFAULT NULL,
    brand VARCHAR(100) DEFAULT NULL,
    status ENUM('pending','approved','rejected','out_of_stock') DEFAULT 'pending',
    is_featured TINYINT(1) DEFAULT 0,
    views INT UNSIGNED DEFAULT 0,
    sales_count INT UNSIGNED DEFAULT 0,
    admin_note TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_featured (is_featured),
    FULLTEXT idx_search (name, description, brand)
);

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================
CREATE TABLE product_images (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    image_hash VARCHAR(64) NOT NULL,
    is_primary TINYINT(1) DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id)
);

-- ============================================================
-- CART
-- ============================================================
CREATE TABLE cart_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    item_type ENUM('dog','product') NOT NULL,
    item_id INT UNSIGNED NOT NULL,
    quantity INT UNSIGNED DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart_item (user_id, item_type, item_id),
    INDEX idx_user (user_id)
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_ref VARCHAR(20) NOT NULL UNIQUE,   -- e.g. NP-2024-00123
    buyer_id INT UNSIGNED NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 30.00,
    status ENUM('pending','confirmed','payment_received','completed','cancelled','refunded') DEFAULT 'pending',
    whatsapp_sent TINYINT(1) DEFAULT 0,
    whatsapp_sent_at DATETIME DEFAULT NULL,
    payment_confirmed_at DATETIME DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    admin_note TEXT DEFAULT NULL,
    buyer_delivery_address TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_buyer (buyer_id),
    INDEX idx_ref (order_ref)
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    seller_id INT UNSIGNED NOT NULL,
    item_type ENUM('dog','product') NOT NULL,
    item_id INT UNSIGNED NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    item_price DECIMAL(12,2) NOT NULL,
    quantity INT UNSIGNED DEFAULT 1,
    subtotal DECIMAL(12,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,
    seller_payout DECIMAL(12,2) NOT NULL,
    item_status ENUM('pending','confirmed','delivered','cancelled') DEFAULT 'pending',
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_order (order_id),
    INDEX idx_seller (seller_id)
);

-- ============================================================
-- FAVORITES / WISHLIST
-- ============================================================
CREATE TABLE favorites (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    item_type ENUM('dog','product') NOT NULL,
    item_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (user_id, item_type, item_id),
    INDEX idx_user (user_id)
);

-- ============================================================
-- REVIEWS & RATINGS
-- ============================================================
CREATE TABLE reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reviewer_id INT UNSIGNED NOT NULL,
    seller_id INT UNSIGNED NOT NULL,
    order_id INT UNSIGNED DEFAULT NULL,
    item_type ENUM('dog','product') NOT NULL,
    item_id INT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT DEFAULT NULL,
    is_approved TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    UNIQUE KEY one_review_per_item (reviewer_id, item_type, item_id),
    INDEX idx_seller (seller_id),
    INDEX idx_item (item_type, item_id)
);

-- ============================================================
-- VET REQUESTS
-- ============================================================
CREATE TABLE vet_requests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED DEFAULT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp_number VARCHAR(20) NOT NULL,
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    dog_issue TEXT NOT NULL,
    urgency ENUM('normal','urgent','emergency') DEFAULT 'normal',
    status ENUM('pending','assigned','resolved') DEFAULT 'pending',
    assigned_vet VARCHAR(150) DEFAULT NULL,
    admin_note TEXT DEFAULT NULL,
    whatsapp_sent TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status)
);

-- ============================================================
-- PLATFORM SETTINGS
-- ============================================================
CREATE TABLE settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_label VARCHAR(200) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO settings (setting_key, setting_value, setting_label) VALUES
('commission_rate', '30', 'Default Commission Rate (%)'),
('admin_whatsapp', '09048239391', 'Admin WhatsApp Number'),
('admin_email', 'admin@naijapaws.com', 'Admin Email'),
('site_name', 'NaijaPaws', 'Platform Name'),
('maintenance_mode', '0', 'Maintenance Mode'),
('max_listing_images', '8', 'Max Images Per Listing'),
('min_listing_images', '3', 'Min Images Required'),
('listing_expiry_days', '90', 'Listing Expiry (Days)'),
('featured_listing_fee', '0', 'Featured Listing Fee (NGN)'),
('currency_symbol', '₦', 'Currency Symbol');

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('order','listing','verification','system','review','vet') DEFAULT 'system',
    is_read TINYINT(1) DEFAULT 0,
    action_url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read)
);

-- ============================================================
-- ACTIVITY LOG (Admin Audit)
-- ============================================================
CREATE TABLE activity_log (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) DEFAULT NULL,
    target_id INT UNSIGNED DEFAULT NULL,
    description TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
);

-- ============================================================
-- BREED REFERENCE
-- ============================================================
CREATE TABLE breeds (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category ENUM('large','medium','small','toy','giant') DEFAULT 'medium',
    is_active TINYINT(1) DEFAULT 1
);

INSERT INTO breeds (name, category) VALUES
('Boerboel', 'large'), ('German Shepherd', 'large'), ('Rottweiler', 'large'),
('Caucasian Shepherd', 'giant'), ('Belgian Malinois', 'large'), ('Doberman', 'large'),
('Great Dane', 'giant'), ('Labrador Retriever', 'large'), ('Golden Retriever', 'large'),
('Bullmastiff', 'large'), ('Cane Corso', 'large'), ('Siberian Husky', 'large'),
('Abokwa', 'medium'), ('Mixed Breed', 'medium'), ('Alsatian', 'large'),
('English Bulldog', 'medium'), ('French Bulldog', 'medium'), ('Poodle', 'medium'),
('Beagle', 'small'), ('Shih Tzu', 'small'), ('Chihuahua', 'toy'),
('Dachshund', 'small'), ('Maltese', 'toy'), ('Bichon Frise', 'small'),
('Pomeranian', 'toy'), ('Yorkshire Terrier', 'toy'), ('Cocker Spaniel', 'medium'),
('Akita', 'large'), ('Pitbull', 'medium'), ('American Bully', 'medium');

-- ============================================================
-- NIGERIA STATES
-- ============================================================
CREATE TABLE nigeria_states (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    region ENUM('north_central','north_east','north_west','south_east','south_south','south_west') NOT NULL
);

INSERT INTO nigeria_states (name, region) VALUES
('Abia','south_east'),('Adamawa','north_east'),('Akwa Ibom','south_south'),
('Anambra','south_east'),('Bauchi','north_east'),('Bayelsa','south_south'),
('Benue','north_central'),('Borno','north_east'),('Cross River','south_south'),
('Delta','south_south'),('Ebonyi','south_east'),('Edo','south_south'),
('Ekiti','south_west'),('Enugu','south_east'),('FCT - Abuja','north_central'),
('Gombe','north_east'),('Imo','south_east'),('Jigawa','north_west'),
('Kaduna','north_west'),('Kano','north_west'),('Katsina','north_west'),
('Kebbi','north_west'),('Kogi','north_central'),('Kwara','north_central'),
('Lagos','south_west'),('Nasarawa','north_central'),('Niger','north_central'),
('Ogun','south_west'),('Ondo','south_west'),('Osun','south_west'),
('Oyo','south_west'),('Plateau','north_central'),('Rivers','south_south'),
('Sokoto','north_west'),('Taraba','north_east'),('Yobe','north_east'),
('Zamfara','north_west');

-- ============================================================
-- DEFAULT ADMIN USER
-- Password: Admin@NaijaPaws2024 (bcrypt hashed - update in production)
-- ============================================================
INSERT INTO users (full_name, email, phone, password_hash, role, is_verified, is_approved)
VALUES (
    'NaijaPaws Admin',
    'admin@naijapaws.com',
    '09048239391',
    '$2y$12$placeholder_replace_with_real_bcrypt_hash',
    'admin',
    1,
    1
);
