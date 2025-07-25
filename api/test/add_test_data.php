<?php
require_once '../config/cors.php';
require_once '../config/database.php';

header('Content-Type: application/json');

try {
    $pdo = getDBConnection();
    
    // Test data SQL dosyasını oku
    $sql_file = __DIR__ . '/../../database/test_data.sql';
    
    if (!file_exists($sql_file)) {
        throw new Exception("Test data SQL dosyası bulunamadı: " . $sql_file);
    }
    
    $sql_content = file_get_contents($sql_file);
    
    if (empty($sql_content)) {
        throw new Exception("SQL dosyası boş veya okunamadı");
    }
    
    // SQL dosyasını noktalı virgül ile ayır ve çalıştır
    $statements = explode(';', $sql_content);
    $executed_count = 0;
    $results = [];
    
    foreach ($statements as $statement) {
        $statement = trim($statement);
        
        // Boş satırları ve yorumları atla
        if (empty($statement) || str_starts_with($statement, '--') || str_starts_with($statement, '/*')) {
            continue;
        }
        
        try {
            $stmt = $pdo->prepare($statement);
            $stmt->execute();
            $executed_count++;
            
            // Eğer SELECT statement ise sonuçları al
            if (stripos($statement, 'SELECT') === 0) {
                $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
                if (!empty($result)) {
                    $results[] = $result;
                }
            }
        } catch (PDOException $e) {
            // Hata oluşursa logla ama devam et
            error_log("SQL Statement Error: " . $e->getMessage() . " | Statement: " . substr($statement, 0, 100));
        }
    }
    
    // Sonuçları kontrol et
    $project_count_stmt = $pdo->prepare("SELECT COUNT(*) as count FROM projects WHERE frn LIKE 'FRN-2025-%'");
    $project_count_stmt->execute();
    $project_count = $project_count_stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $savings_count_stmt = $pdo->prepare("
        SELECT COUNT(*) as count FROM savings_records 
        WHERE project_id IN (SELECT id FROM projects WHERE frn LIKE 'FRN-2025-%')
    ");
    $savings_count_stmt->execute();
    $savings_count = $savings_count_stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    echo json_encode([
        'success' => true,
        'message' => 'Test verisi başarıyla eklendi!',
        'data' => [
            'executed_statements' => $executed_count,
            'projects_added' => $project_count,
            'savings_records_added' => $savings_count,
            'results' => $results
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Add test data error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}
?>