<?php
header('Content-Type: text/html; charset=UTF-8');
require_once '../config/database.php';

$project_id = $_GET['project_id'] ?? 3; // Default to project 3

try {
    $pdo = getDBConnection();
    
    echo "<h1>Debug Project Records - Project ID: $project_id</h1>";
    
    // 1. Raw query without joins
    echo "<h2>1. Raw Savings Records (No Joins)</h2>";
    $raw_sql = "SELECT id, project_id, date, type, category, unit, price, total_price, created_at 
                FROM savings_records 
                WHERE project_id = ? 
                ORDER BY created_at DESC";
    
    $raw_stmt = $pdo->prepare($raw_sql);
    $raw_stmt->execute([$project_id]);
    $raw_records = $raw_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p><strong>Raw record count:</strong> " . count($raw_records) . "</p>";
    
    if (count($raw_records) > 0) {
        echo "<table border='1' cellpadding='5'>";
        echo "<tr style='background-color: #f0f0f0'>";
        echo "<th>ID</th><th>Date</th><th>Type</th><th>Category</th><th>Unit</th><th>Price</th><th>Total</th><th>Created</th>";
        echo "</tr>";
        
        foreach ($raw_records as $record) {
            $highlight = $record['unit'] > 1 ? 'background-color: #ffcccc' : '';
            echo "<tr style='$highlight'>";
            echo "<td>{$record['id']}</td>";
            echo "<td>{$record['date']}</td>";
            echo "<td>{$record['type']}</td>";
            echo "<td>{$record['category']}</td>";
            echo "<td><strong>{$record['unit']}</strong></td>";
            echo "<td>{$record['price']}</td>";
            echo "<td>{$record['total_price']}</td>";
            echo "<td>{$record['created_at']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
    // 2. With JOIN (current API query)
    echo "<h2>2. With JOIN (Current API Query)</h2>";
    $join_sql = "SELECT DISTINCT
        sr.id,
        sr.project_id,
        sr.date,
        sr.type,
        sr.category,
        sr.unit,
        sr.price,
        sr.total_price,
        sr.created_at,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
        FROM savings_records sr
        LEFT JOIN users u ON sr.created_by = u.id
        WHERE sr.project_id = ?
        ORDER BY sr.date DESC, sr.created_at DESC";
    
    $join_stmt = $pdo->prepare($join_sql);
    $join_stmt->execute([$project_id]);
    $join_records = $join_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p><strong>JOIN record count:</strong> " . count($join_records) . "</p>";
    
    if (count($join_records) !== count($raw_records)) {
        echo "<p style='color: red'><strong>⚠️ COUNT MISMATCH!</strong> Raw: " . count($raw_records) . ", JOIN: " . count($join_records) . "</p>";
    } else {
        echo "<p style='color: green'><strong>✅ Counts match</strong></p>";
    }
    
    // 3. Check for duplicate IDs
    echo "<h2>3. Duplicate ID Analysis</h2>";
    $dup_sql = "SELECT id, COUNT(*) as count 
                FROM savings_records 
                WHERE project_id = ?
                GROUP BY id 
                HAVING count > 1";
    
    $dup_stmt = $pdo->prepare($dup_sql);
    $dup_stmt->execute([$project_id]);
    $duplicates = $dup_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($duplicates) > 0) {
        echo "<p style='color: red'><strong>🚨 DUPLICATE IDs FOUND!</strong></p>";
        foreach ($duplicates as $dup) {
            echo "<p>ID {$dup['id']} appears {$dup['count']} times</p>";
        }
    } else {
        echo "<p style='color: green'><strong>✅ No duplicate IDs</strong></p>";
    }
    
    // 4. Check for identical records (different IDs)
    echo "<h2>4. Identical Records Analysis</h2>";
    $identical_sql = "SELECT date, type, category, price, unit, currency, total_price, COUNT(*) as count
                      FROM savings_records 
                      WHERE project_id = ?
                      GROUP BY date, type, category, price, unit, currency, total_price
                      HAVING count > 1";
    
    $identical_stmt = $pdo->prepare($identical_sql);
    $identical_stmt->execute([$project_id]);
    $identicals = $identical_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($identicals) > 0) {
        echo "<p style='color: orange'><strong>⚠️ IDENTICAL RECORDS FOUND!</strong></p>";
        echo "<table border='1' cellpadding='5'>";
        echo "<tr style='background-color: #fff3cd'>";
        echo "<th>Date</th><th>Type</th><th>Category</th><th>Price</th><th>Unit</th><th>Currency</th><th>Total</th><th>Count</th>";
        echo "</tr>";
        foreach ($identicals as $identical) {
            echo "<tr>";
            echo "<td>{$identical['date']}</td>";
            echo "<td>{$identical['type']}</td>";
            echo "<td>{$identical['category']}</td>";
            echo "<td>{$identical['price']}</td>";
            echo "<td style='background-color: #ffcccc'><strong>{$identical['unit']}</strong></td>";
            echo "<td>{$identical['currency']}</td>";
            echo "<td>{$identical['total_price']}</td>";
            echo "<td style='background-color: #dc3545; color: white'><strong>{$identical['count']}</strong></td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p style='color: green'><strong>✅ No identical records</strong></p>";
    }
    
    // 5. Unit correlation analysis
    echo "<h2>5. Unit Correlation Analysis</h2>";
    echo "<p>Testing hypothesis: Number of duplicate records = Unit value</p>";
    
    $unit_analysis = [];
    foreach ($raw_records as $record) {
        $key = $record['date'] . '-' . $record['category'] . '-' . $record['price'];
        if (!isset($unit_analysis[$key])) {
            $unit_analysis[$key] = [];
        }
        $unit_analysis[$key][] = $record;
    }
    
    $correlation_found = false;
    foreach ($unit_analysis as $key => $group) {
        if (count($group) > 1) {
            $first_unit = $group[0]['unit'];
            if (count($group) == $first_unit) {
                echo "<p style='color: red'><strong>🎯 CORRELATION FOUND!</strong> Group '$key' has {count($group)} records and unit = $first_unit</p>";
                $correlation_found = true;
            }
        }
    }
    
    if (!$correlation_found) {
        echo "<p style='color: green'><strong>✅ No unit correlation found</strong></p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}
?>