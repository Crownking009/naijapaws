<?php
// ============================================================
// NaijaPaws - Configuration File
// ============================================================

define('APP_NAME', 'NaijaPaws');
define('APP_URL', 'https://naijapaws.com');
define('APP_VERSION', '1.0.0');

// ============================================================
// DATABASE CONFIGURATION
// ============================================================
define('DB_HOST', 'localhost');
define('DB_NAME', 'naijapaws');
define('DB_USER', 'root');         // Change in production
define('DB_PASS', 'your_password'); // Change in production
define('DB_CHARSET', 'utf8mb4');

// ============================================================
// ADMIN WHATSAPP
// ============================================================
define('ADMIN_WHATSAPP', '2349048239391'); // International format (234 = Nigeria)
define('ADMIN_EMAIL', 'admin@naijapaws.com');
define('COMMISSION_RATE', 30); // 30%

// ============================================================
// PATHS
// ============================================================
define('ROOT_PATH', dirname(__DIR__));
define('UPLOAD_PATH', ROOT_PATH . '/uploads/');
define('DOG_UPLOAD_PATH', UPLOAD_PATH . 'dogs/');
define('PRODUCT_UPLOAD_PATH', UPLOAD_PATH . 'products/');
define('ID_UPLOAD_PATH', UPLOAD_PATH . 'ids/');
define('VET_REQUEST_UPLOAD_PATH', UPLOAD_PATH . 'vet_requests/');

// ============================================================
// SECURITY
// ============================================================
define('SESSION_NAME', 'naijapaws_session');
define('CSRF_TOKEN_LENGTH', 32);
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOCKOUT_DURATION', 900); // 15 minutes
define('MIN_LISTING_IMAGES', 3);
define('MAX_LISTING_IMAGES', 8);
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp']);

// ============================================================
// LISTING CONFIG
// ============================================================
define('LISTING_EXPIRY_DAYS', 90);
define('ITEMS_PER_PAGE', 12);

// ============================================================
// EMAIL (Configure SMTP in production)
// ============================================================
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'noreply@naijapaws.com');
define('SMTP_PASS', 'your_smtp_password');
define('FROM_EMAIL', 'noreply@naijapaws.com');
define('FROM_NAME', 'NaijaPaws');
