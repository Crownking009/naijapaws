<?php
// ============================================================
// NaijaPaws - Vet Request Submission Endpoint
// ============================================================

header('Content-Type: application/json');

require_once '../php/config.php';
require_once '../php/Database.php';
require_once '../php/VetRequests.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        die(json_encode(['success' => false, 'message' => 'Method not allowed']));
    }

    // Parse form data
    $data = [
        'full_name'       => $_POST['full_name'] ?? '',
        'phone'           => $_POST['phone'] ?? '',
        'whatsapp_number' => $_POST['whatsapp_number'] ?? '',
        'state'           => $_POST['state'] ?? '',
        'city'            => $_POST['city'] ?? '',
        'address'         => $_POST['address'] ?? '',
        'dog_issue'       => $_POST['dog_issue'] ?? '',
        'urgency'         => $_POST['urgency'] ?? 'normal',
    ];

    // Handle file upload
    $image = null;
    if (isset($_FILES['pet_image']) && $_FILES['pet_image']['size'] > 0) {
        $image = $_FILES['pet_image'];
    }

    // Submit vet request
    $result = VetRequests::submitRequest($data, $image);
    
    http_response_code($result['success'] ? 200 : 400);
    echo json_encode($result);

} catch (Exception $e) {
    error_log('Submit Vet Request Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error. Please try again later.',
    ]);
}
