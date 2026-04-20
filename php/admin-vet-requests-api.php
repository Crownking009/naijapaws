<?php
// ============================================================
// Admin Vet Requests View - API Endpoint
// ============================================================

header('Content-Type: application/json');

require_once '../php/config.php';
require_once '../php/Database.php';
require_once '../php/VetRequests.php';

try {
    $action = $_GET['action'] ?? '';

    switch ($action) {
        case 'list':
            $status = $_GET['status'] ?? 'all';
            $page = intval($_GET['page'] ?? 1);
            $limit = 20;
            $offset = ($page - 1) * $limit;

            $requests = VetRequests::getRequests($status, $limit, $offset);
            $stats = VetRequests::getCountByStatus();

            echo json_encode([
                'success' => true,
                'requests' => $requests,
                'stats' => $stats,
                'page' => $page,
                'limit' => $limit,
            ]);
            break;

        case 'detail':
            $requestId = intval($_GET['id'] ?? 0);
            if (!$requestId) {
                throw new Exception('Request ID required');
            }

            $request = VetRequests::getRequest($requestId);
            if (!$request) {
                throw new Exception('Request not found');
            }

            echo json_encode([
                'success' => true,
                'request' => $request,
            ]);
            break;

        case 'update':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('POST method required');
            }

            $requestId = intval($_POST['id'] ?? 0);
            $status = $_POST['status'] ?? null;
            $vetName = $_POST['assigned_vet'] ?? null;
            $adminNote = $_POST['admin_note'] ?? null;

            if (!$requestId || !$status) {
                throw new Exception('Request ID and status required');
            }

            if (VetRequests::updateStatus($requestId, $status, $vetName, $adminNote)) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Vet request updated successfully',
                ]);
            } else {
                throw new Exception('Failed to update request');
            }
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }

} catch (Exception $e) {
    error_log('Admin Vet Requests API Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}
