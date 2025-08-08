<?php
// Test detail API with your user credentials
header('Content-Type: application/json');

try {
    // Simulate your API call
    $token = $_GET['token'] ?? null;
    if (!$token) {
        echo json_encode(['error' => 'Add ?token=YOUR_AUTH_TOKEN to URL']);
        exit;
    }
    
    $project_id = $_GET['project_id'] ?? 1; // FRN-2025-001 project ID
    
    // Make internal API call
    $url = "https://savings.forte.works/api/projects/detail.php?id=" . $project_id;
    
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "Authorization: Bearer " . $token
        ]
    ]);
    
    $response = file_get_contents($url, false, $context);
    $data = json_decode($response, true);
    
    if (isset($data['data']['savings_records'])) {
        echo json_encode([
            'total_records_from_api' => count($data['data']['savings_records']),
            'records_summary' => array_map(function($record) {
                return [
                    'id' => $record['id'],
                    'amount' => $record['total_price'],
                    'type' => $record['type'], 
                    'created_by' => $record['created_by_name']
                ];
            }, $data['data']['savings_records'])
        ], JSON_PRETTY_PRINT);
    } else {
        echo json_encode(['error' => 'No records found', 'raw_response' => $data], JSON_PRETTY_PRINT);
    }
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>