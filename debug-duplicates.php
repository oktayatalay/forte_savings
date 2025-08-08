<?php
require_once 'api/config/database.php';

try {
    $pdo = getDBConnection();
    
    // Duplicate ID'leri kontrol et
    echo "<h2>Duplicate ID Analysis</h2>";
    
    $duplicate_sql = "SELECT id, COUNT(*) as count 
                      FROM savings_records 
                      GROUP BY id 
                      HAVING count > 1";
    
    $duplicate_stmt = $pdo->prepare($duplicate_sql);
    $duplicate_stmt->execute();
    $duplicates = $duplicate_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p>Found " . count($duplicates) . " duplicate IDs</p>";
    
    if (count($duplicates) > 0) {
        foreach ($duplicates as $dup) {
            echo "<p>ID {$dup['id']} appears {$dup['count']} times</p>";
        }
    }
    
    // Aynı record'lar var mı kontrol et (farklı ID ile)
    echo "<h2>Identical Records Analysis</h2>";
    
    $identical_sql = "SELECT date, type, explanation_category, category, price, unit, currency, total_price, project_id, COUNT(*) as count
                      FROM savings_records 
                      GROUP BY date, type, explanation_category, category, price, unit, currency, total_price, project_id
                      HAVING count > 1";
    
    $identical_stmt = $pdo->prepare($identical_sql);
    $identical_stmt->execute();
    $identicals = $identical_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p>Found " . count($identicals) . " sets of identical records</p>";
    
    if (count($identicals) > 0) {
        foreach ($identicals as $identical) {
            echo "<p>Identical record appears {$identical['count']} times: {$identical['date']} - {$identical['type']} - {$identical['total_price']} {$identical['currency']}</p>";
        }
    }
    
    // Son 10 kayıt detayı
    echo "<h2>Latest 10 Records</h2>";
    
    $latest_sql = "SELECT id, date, type, category, total_price, currency, project_id, created_at
                   FROM savings_records 
                   ORDER BY created_at DESC 
                   LIMIT 10";
    
    $latest_stmt = $pdo->prepare($latest_sql);
    $latest_stmt->execute();
    $latest = $latest_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<table border='1'>";
    echo "<tr><th>ID</th><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Currency</th><th>Project</th><th>Created</th></tr>";
    foreach ($latest as $record) {
        echo "<tr>";
        echo "<td>{$record['id']}</td>";
        echo "<td>{$record['date']}</td>";
        echo "<td>{$record['type']}</td>";
        echo "<td>{$record['category']}</td>";
        echo "<td>{$record['total_price']}</td>";
        echo "<td>{$record['currency']}</td>";
        echo "<td>{$record['project_id']}</td>";
        echo "<td>{$record['created_at']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>