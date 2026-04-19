<?php
// ============================================================
// NaijaPaws - Authentication Class
// ============================================================

class Auth {

    public static function startSession(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_name(SESSION_NAME);
            session_set_cookie_params([
                'lifetime' => 86400 * 7,
                'path'     => '/',
                'secure'   => isset($_SERVER['HTTPS']),
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
            session_start();
        }
    }

    // ---- CSRF -----------------------------------------------
    public static function generateCSRF(): string {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(CSRF_TOKEN_LENGTH));
        }
        return $_SESSION['csrf_token'];
    }

    public static function verifyCSRF(string $token): bool {
        return isset($_SESSION['csrf_token']) &&
               hash_equals($_SESSION['csrf_token'], $token);
    }

    // ---- REGISTER -------------------------------------------
    public static function register(array $data): array {
        $email = strtolower(trim($data['email']));
        $exists = Database::fetchOne('SELECT id FROM users WHERE email = ?', [$email]);
        if ($exists) return ['success' => false, 'message' => 'Email already registered.'];

        $hash = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        $token = bin2hex(random_bytes(32));

        $userId = Database::insert('users', [
            'full_name'          => trim($data['full_name']),
            'email'              => $email,
            'phone'              => trim($data['phone'] ?? ''),
            'password_hash'      => $hash,
            'role'               => 'buyer',
            'verification_token' => $token,
        ]);

        // TODO: Send verification email
        self::logActivity($userId, 'register', 'user', $userId, 'New user registered');

        return ['success' => true, 'user_id' => $userId, 'message' => 'Registration successful. Please verify your email.'];
    }

    // ---- LOGIN -----------------------------------------------
    public static function login(string $email, string $password): array {
        $email = strtolower(trim($email));
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

        // Rate limiting
        $attempts = $_SESSION['login_attempts'][$email] ?? 0;
        $lastAttempt = $_SESSION['login_last_attempt'][$email] ?? 0;

        if ($attempts >= MAX_LOGIN_ATTEMPTS && (time() - $lastAttempt) < LOCKOUT_DURATION) {
            $remaining = LOCKOUT_DURATION - (time() - $lastAttempt);
            return ['success' => false, 'message' => "Too many attempts. Try again in " . ceil($remaining/60) . " minutes."];
        }

        $user = Database::fetchOne(
            'SELECT * FROM users WHERE email = ? AND is_banned = 0',
            [$email]
        );

        if (!$user || !password_verify($password, $user['password_hash'])) {
            $_SESSION['login_attempts'][$email] = $attempts + 1;
            $_SESSION['login_last_attempt'][$email] = time();
            return ['success' => false, 'message' => 'Invalid email or password.'];
        }

        // Clear attempts
        unset($_SESSION['login_attempts'][$email]);

        // Set session
        $_SESSION['user_id']   = $user['id'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['user_name'] = $user['full_name'];
        session_regenerate_id(true);

        self::logActivity($user['id'], 'login', 'user', $user['id'], 'User logged in');

        return ['success' => true, 'role' => $user['role'], 'user' => $user];
    }

    // ---- LOGOUT ----------------------------------------------
    public static function logout(): void {
        if (isset($_SESSION['user_id'])) {
            self::logActivity($_SESSION['user_id'], 'logout', 'user', $_SESSION['user_id'], 'User logged out');
        }
        session_unset();
        session_destroy();
        session_start();
        session_regenerate_id(true);
    }

    // ---- CHECKS ----------------------------------------------
    public static function isLoggedIn(): bool {
        return isset($_SESSION['user_id']);
    }

    public static function isAdmin(): bool {
        return isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin';
    }

    public static function isSeller(): bool {
        return isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'seller';
    }

    public static function requireLogin(string $redirectTo = '/login.php'): void {
        if (!self::isLoggedIn()) {
            $_SESSION['redirect_after_login'] = $_SERVER['REQUEST_URI'];
            header("Location: {$redirectTo}");
            exit;
        }
    }

    public static function requireAdmin(): void {
        self::requireLogin();
        if (!self::isAdmin()) {
            http_response_code(403);
            die('Access denied.');
        }
    }

    public static function requireSeller(): void {
        self::requireLogin();
        $user = self::getCurrentUser();
        if (!$user || $user['role'] !== 'seller' || !$user['is_approved']) {
            header('Location: /seller-verification.php');
            exit;
        }
    }

    // ---- CURRENT USER ----------------------------------------
    public static function getCurrentUser(): ?array {
        if (!self::isLoggedIn()) return null;
        return Database::fetchOne('SELECT * FROM users WHERE id = ?', [$_SESSION['user_id']]);
    }

    public static function getUserId(): ?int {
        return $_SESSION['user_id'] ?? null;
    }

    // ---- PASSWORD RESET --------------------------------------
    public static function initiatePasswordReset(string $email): array {
        $user = Database::fetchOne('SELECT id FROM users WHERE email = ?', [strtolower($email)]);
        if (!$user) return ['success' => true, 'message' => 'If the email exists, a reset link will be sent.']; // Security: don't reveal

        $token = bin2hex(random_bytes(32));
        Database::update('users', [
            'reset_token'   => $token,
            'reset_expires' => date('Y-m-d H:i:s', time() + 3600),
        ], 'id = ?', [$user['id']]);

        // TODO: Send email with reset link
        return ['success' => true, 'message' => 'Password reset email sent.'];
    }

    public static function resetPassword(string $token, string $newPassword): array {
        $user = Database::fetchOne(
            'SELECT id FROM users WHERE reset_token = ? AND reset_expires > NOW()',
            [$token]
        );
        if (!$user) return ['success' => false, 'message' => 'Invalid or expired reset token.'];

        Database::update('users', [
            'password_hash' => password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]),
            'reset_token'   => null,
            'reset_expires' => null,
        ], 'id = ?', [$user['id']]);

        return ['success' => true, 'message' => 'Password updated successfully.'];
    }

    // ---- ACTIVITY LOG ----------------------------------------
    public static function logActivity(int $userId, string $action, string $targetType, int $targetId, string $description): void {
        Database::insert('activity_log', [
            'user_id'     => $userId,
            'action'      => $action,
            'target_type' => $targetType,
            'target_id'   => $targetId,
            'description' => $description,
            'ip_address'  => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent'  => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
        ]);
    }
}
