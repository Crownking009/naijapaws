# NaijaPaws — Complete Implementation Guide
## Nigeria's #1 Dog Marketplace & Service Platform

---

## 📁 PROJECT STRUCTURE

```
naijapaws/
├── .htaccess                    ← Apache security & URL rules
├── index.php                    ← Homepage
├── marketplace.php              ← Dog listings (sale/adoption/mating)
├── dog.php                      ← Single dog listing detail
├── products.php                 ← Dog products store
├── product.php                  ← Single product detail
├── services.php                 ← Vet services + request form
├── login.php                    ← Login page
├── register.php                 ← Registration page
├── logout.php                   ← Logout handler
├── dashboard.php                ← User & seller dashboard
├── seller-verification.php      ← Seller signup/verification
├── contact.php                  ← Contact page
├── 404.php                      ← Error pages
│
├── css/
│   └── main.css                 ← Complete stylesheet
│
├── js/
│   └── main.js                  ← All frontend JavaScript
│
├── php/
│   ├── config.php               ← Configuration constants
│   ├── Database.php             ← PDO database class
│   ├── Auth.php                 ← Authentication & sessions
│   ├── Listings.php             ← Listings CRUD
│   ├── Orders.php               ← Cart, checkout, orders, vet
│   ├── checkout.php             ← AJAX checkout endpoint
│   └── favorites.php            ← AJAX favorites handler
│
├── includes/
│   ├── header.php               ← HTML head, navbar, cart drawer
│   └── footer.php               ← Footer, scripts
│
├── admin/
│   └── index.php                ← Admin dashboard
│
├── database.sql                 ← Complete MySQL schema
│
└── uploads/
    ├── dogs/                    ← Dog listing images
    ├── products/                ← Product images
    └── ids/                     ← Seller ID documents (private)
```

---

## ⚙️ STEP 1: SERVER REQUIREMENTS

### Minimum Requirements
- PHP 8.0+ (8.2 recommended)
- MySQL 5.7+ or MariaDB 10.4+
- Apache 2.4+ with mod_rewrite enabled
- SSL certificate (HTTPS required)
- 1GB+ RAM, 10GB+ disk space

### PHP Extensions Required
```
pdo_mysql, mbstring, gd, fileinfo, openssl, json
```

---

## 🗄️ STEP 2: DATABASE SETUP

```bash
# Login to MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE naijapaws CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'naijapaws_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON naijapaws.* TO 'naijapaws_user'@'localhost';
FLUSH PRIVILEGES;

# Import schema
mysql -u naijapaws_user -p naijapaws < database.sql
```

---

## 🔧 STEP 3: CONFIGURATION

Edit `php/config.php`:

```php
// Database
define('DB_HOST', 'localhost');
define('DB_NAME', 'naijapaws');
define('DB_USER', 'naijapaws_user');
define('DB_PASS', 'StrongPassword123!');

// Admin WhatsApp (International format: 234 + number without leading 0)
define('ADMIN_WHATSAPP', '2349048239391');

// App URL (no trailing slash)
define('APP_URL', 'https://naijapaws.com');
```

---

## 🔑 STEP 4: CREATE ADMIN ACCOUNT

Run this once to create the admin account:

```php
<?php
require_once 'php/config.php';
require_once 'php/Database.php';

$hash = password_hash('Admin@NaijaPaws2024', PASSWORD_BCRYPT, ['cost' => 12]);
Database::update('users',
    ['password_hash' => $hash],
    "email = 'admin@naijapaws.com'"
);
echo "Admin password set!";
// DELETE THIS FILE AFTER RUNNING
```

Or insert fresh admin:
```sql
INSERT INTO users (full_name, email, phone, password_hash, role, is_verified, is_approved)
VALUES (
  'NaijaPaws Admin',
  'admin@naijapaws.com',
  '09048239391',
  '$2y$12$YOUR_BCRYPT_HASH_HERE',
  'admin', 1, 1
);
```

**Admin Login:** `admin@naijapaws.com` / `Admin@NaijaPaws2024`
**⚠️ Change password immediately after first login!**

---

## 📁 STEP 5: UPLOADS DIRECTORY PERMISSIONS

```bash
# Create directories
mkdir -p uploads/dogs uploads/products uploads/ids

# Set permissions (web server needs write access)
chmod 755 uploads/
chmod 755 uploads/dogs/ uploads/products/
chmod 700 uploads/ids/  # IDs: more restricted

# Ownership (adjust 'www-data' to your web server user)
chown -R www-data:www-data uploads/
```

---

## 🌐 STEP 6: APACHE VHOST CONFIGURATION

```apache
<VirtualHost *:443>
    ServerName naijapaws.com
    ServerAlias www.naijapaws.com
    DocumentRoot /var/www/naijapaws

    <Directory /var/www/naijapaws>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    SSLEngine on
    SSLCertificateFile    /etc/letsencrypt/live/naijapaws.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/naijapaws.com/privkey.pem

    ErrorLog  ${APACHE_LOG_DIR}/naijapaws-error.log
    CustomLog ${APACHE_LOG_DIR}/naijapaws-access.log combined
</VirtualHost>

# Redirect HTTP → HTTPS
<VirtualHost *:80>
    ServerName naijapaws.com
    Redirect permanent / https://naijapaws.com/
</VirtualHost>
```

---

## 📧 STEP 7: EMAIL CONFIGURATION (PHPMailer)

Install PHPMailer via Composer:
```bash
composer require phpmailer/phpmailer
```

Update `php/config.php`:
```php
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'noreply@naijapaws.com');
define('SMTP_PASS', 'your_app_password');
```

---

## 🔐 STEP 8: SECURITY CHECKLIST

### Before Going Live
- [ ] Change all default passwords
- [ ] Set `display_errors = Off` in php.ini
- [ ] Enable HTTPS/SSL
- [ ] Set up regular database backups
- [ ] Restrict uploads/ids/ directory via .htaccess
- [ ] Configure firewall (allow only 80, 443, 22)
- [ ] Install fail2ban to block brute force
- [ ] Set up log monitoring
- [ ] Validate all file uploads (MIME type + extension)
- [ ] Test CSRF protection on all forms

### PHP Security Settings (php.ini)
```ini
display_errors = Off
log_errors = On
error_log = /var/log/php/naijapaws.log
session.cookie_httponly = 1
session.cookie_secure = 1
session.use_strict_mode = 1
file_uploads = On
upload_max_filesize = 6M
post_max_size = 10M
max_execution_time = 60
```

---

## 👤 USER FLOWS

### Buyer Flow
1. Visit site → Browse dogs/products
2. Register/Login required to purchase
3. Add item to cart → Checkout
4. WhatsApp opens with order details sent to Admin
5. Admin confirms with seller
6. Buyer pays Admin
7. Admin connects buyer & seller
8. 30% deducted, 70% paid to seller

### Seller Flow
1. Register as buyer first
2. Submit seller verification form (ID + details)
3. Admin reviews & approves (24-48hrs)
4. Seller can now post unlimited listings
5. Listings require admin approval before going live
6. Seller sees pending orders in dashboard
7. Admin handles all payment coordination

### Admin Flow
1. Login → `naijapaws.com/admin/`
2. Review seller verifications (approve/reject)
3. Review new listings (approve/reject)
4. Receive WhatsApp orders
5. Confirm with sellers
6. Receive payment
7. Connect buyer with seller
8. Update order status in dashboard
9. Platform keeps 30% commission

---

## 💬 WHATSAPP INTEGRATION

The checkout system automatically generates WhatsApp messages in this format:

```
🐾 NaijaPaws Order Request
━━━━━━━━━━━━━━━━━━━
📋 Order Ref: NP-2024-00123
👤 Buyer: John Doe
📱 Buyer Phone: 08012345678
━━━━━━━━━━━━━━━━━━━

🛒 ORDER ITEMS:

🏪 Seller: Chukwuka Pets
   📞 08056789012
  • Boerboel Puppy Male 3 Months
    Qty: 1 × ₦250,000
    Subtotal: ₦250,000

━━━━━━━━━━━━━━━━━━━
💰 Total Amount: ₦250,000
📊 Platform Commission (30%): ₦75,000
━━━━━━━━━━━━━━━━━━━
```

To change admin WhatsApp number, update `settings` table:
```sql
UPDATE settings SET setting_value = '2349012345678' WHERE setting_key = 'admin_whatsapp';
```

---

## 🚀 DEPLOYMENT CHECKLIST

```bash
# 1. Upload all files to server
rsync -avz ./naijapaws/ user@server:/var/www/naijapaws/

# 2. Set permissions
find /var/www/naijapaws -type f -name "*.php" -exec chmod 644 {} \;
find /var/www/naijapaws -type d -exec chmod 755 {} \;
chmod -R 755 /var/www/naijapaws/uploads/

# 3. Import database
mysql -u naijapaws_user -p naijapaws < database.sql

# 4. Set up config
cp php/config.php php/config.production.php
nano php/config.php  # Edit with production values

# 5. Enable Apache modules
a2enmod rewrite headers expires deflate
systemctl restart apache2

# 6. Set up SSL
certbot --apache -d naijapaws.com -d www.naijapaws.com

# 7. Set up cron jobs
crontab -e
# Add: 0 2 * * * /usr/bin/php /var/www/naijapaws/cron/expire-listings.php
```

---

## 📊 ADDITIONAL PAGES NEEDED

These pages follow the same pattern as existing files:

| Page           | File              | Description              |
|----------------|-------------------|--------------------------|
| Product Detail | `product.php`     | Single product view      |
| Contact        | `contact.php`     | Contact form             |
| How It Works   | `how-it-works.php`| Platform explanation     |
| Safety Tips    | `safety-tips.php` | Anti-fraud guidance      |
| Terms          | `terms.php`       | Terms of service         |
| Privacy        | `privacy.php`     | Privacy policy           |
| FAQ            | `faq.php`         | Frequently asked questions|
| 404 Error      | `404.php`         | Not found page           |
| Submit Review  | `submit-review.php`| Review form handler     |

---

## 🗃️ DATABASE MAINTENANCE

```sql
-- View pending seller verifications
SELECT sv.*, u.email FROM seller_verifications sv
JOIN users u ON u.id = sv.user_id WHERE sv.status = 'pending';

-- View pending listings
SELECT dl.title, u.full_name, dl.category, dl.created_at
FROM dog_listings dl JOIN users u ON u.id = dl.seller_id
WHERE dl.status = 'pending' ORDER BY dl.created_at;

-- Revenue report
SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
       SUM(total_amount) as gmv,
       SUM(commission_amount) as revenue,
       COUNT(*) as orders
FROM orders WHERE status = 'completed'
GROUP BY month ORDER BY month DESC;

-- Expire old listings
UPDATE dog_listings SET status = 'expired'
WHERE expires_at < CURDATE() AND status = 'approved';
```

---

## 💡 PERFORMANCE TIPS

1. **Images**: Use WebP format, compress before upload
2. **CDN**: Serve static assets via Cloudflare or BunnyCDN
3. **Caching**: Add Redis/Memcached for database query caching
4. **Database**: Add indexes on frequently queried columns (already done in schema)
5. **Lazy loading**: All listing images use `loading="lazy"`
6. **Pagination**: Default 12 items per page

---

## 📱 MOBILE OPTIMIZATION

- All pages are mobile-first responsive
- Breakpoints: 480px, 768px, 1024px
- Touch-friendly: 44px minimum touch targets
- Swipe support on hero carousel
- Mobile drawer navigation
- Cart slides in from right on mobile
- Forms stack vertically on mobile

---

## 🎨 DESIGN SYSTEM

### Colors
```css
--forest:      #3D5A3E  /* Primary green */
--sage:        #6B8F6B  /* Light green */
--cream:       #FAF7F2  /* Background */
--dark-brown:  #4A2E14  /* Dark text/headers */
--amber:       #D97706  /* Accent orange */
--orange:      #EA580C  /* CTA buttons */
```

### Typography
- **Display**: Playfair Display (headings)
- **Body**: DM Sans (content)

### Key Components
- `.listing-card` — Dog/product cards
- `.btn-primary` — Main CTA (green)
- `.btn-whatsapp` — WhatsApp (green)
- `.btn-orange` — High-urgency CTA
- `.fraud-banner` — Anti-fraud warning
- `.status-badge` — Order/listing status

---

*Built with ❤️ for Nigeria 🇳🇬 by NaijaPaws*
