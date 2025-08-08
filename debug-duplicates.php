<?php
require_once 'api/config/database.php';

try {
    $pdo = getDBConnection();
    
    // Unit-based duplicate analysis
    echo "<h2>Unit-Based Duplicate Analysis</h2>";
    
    $unit_sql = "SELECT id, date, type, category, unit, price, total_price, project_id, created_at
                 FROM savings_records 
                 ORDER BY created_at DESC 
                 LIMIT 20";
    
    $unit_stmt = $pdo->prepare($unit_sql);
    $unit_stmt->execute();
    $records = $unit_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<table border='1' cellpadding='5'>";
    echo "<tr style='background-color: #f0f0f0'>";
    echo "<th>ID</th><th>Date</th><th>Type</th><th>Category</th><th>Unit</th><th>Price</th><th>Total Price</th><th>Project</th><th>Created At</th>";
    echo "</tr>";
    
    foreach ($records as $record) {
        $highlight = $record['unit'] > 1 ? 'background-color: #ffcccc' : '';
        echo "<tr style='$highlight'>";
        echo "<td>{$record['id']}</td>";
        echo "<td>{$record['date']}</td>";
        echo "<td>{$record['type']}</td>";
        echo "<td>{$record['category']}</td>";
        echo "<td><strong>{$record['unit']}</strong></td>";
        echo "<td>{$record['price']}</td>";
        echo "<td>{$record['total_price']}</td>";
        echo "<td>{$record['project_id']}</td>";
        echo "<td>{$record['created_at']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    
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
            echo "<p style='color: red'>ID {$dup['id']} appears {$dup['count']} times</p>";
        }
    }
    
    // Aynı record'lar var mı kontrol et (farklı ID ile)
    echo "<h2>Identical Records Analysis (Different IDs)</h2>";
    
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
            echo "<p style='color: orange'>Identical record appears <strong>{$identical['count']}</strong> times: {$identical['date']} - {$identical['type']} - Unit: {$identical['unit']} - {$identical['total_price']} {$identical['currency']}</p>";
        }
    }
    
    // High unit records
    echo "<h2>High Unit Records (Unit > 1)</h2>";
    
    $high_unit_sql = "SELECT id, date, type, category, unit, price, total_price
                      FROM savings_records 
                      WHERE unit > 1
                      ORDER BY unit DESC, created_at DESC 
                      LIMIT 10";
    
    $high_unit_stmt = $pdo->prepare($high_unit_sql);
    $high_unit_stmt->execute();
    $high_units = $high_unit_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($high_units) > 0) {
        echo "<table border='1' cellpadding='5'>";
        echo "<tr style='background-color: #ffffcc'>";
        echo "<th>ID</th><th>Date</th><th>Type</th><th>Category</th><th>Unit</th><th>Price</th><th>Total Price</th>";
        echo "</tr>";
        foreach ($high_units as $hu) {
            echo "<tr>";
            echo "<td>{$hu['id']}</td>";
            echo "<td>{$hu['date']}</td>";
            echo "<td>{$hu['type']}</td>";
            echo "<td>{$hu['category']}</td>";
            echo "<td style='background-color: #ffcccc'><strong>{$hu['unit']}</strong></td>";
            echo "<td>{$hu['price']}</td>";
            echo "<td>{$hu['total_price']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p>No records with unit > 1 found</p>";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>