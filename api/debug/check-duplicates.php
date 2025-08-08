<?php
header('Content-Type: text/html; charset=UTF-8');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    echo "<h1>DATABASE DUPLICATE ANALYSIS</h1>";
    
    // 1. Check for duplicate IDs (shouldn't happen with auto-increment)
    echo "<h2>1. Duplicate ID Check</h2>";
    $dup_id_sql = "SELECT id, COUNT(*) as count FROM savings_records GROUP BY id HAVING count > 1";
    $dup_id_stmt = $pdo->prepare($dup_id_sql);
    $dup_id_stmt->execute();
    $dup_ids = $dup_id_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($dup_ids) > 0) {
        echo "<p style='color: red'><strong>🚨 DUPLICATE IDs FOUND:</strong></p>";
        foreach ($dup_ids as $dup) {
            echo "<p style='color: red'>- ID {$dup['id']} appears {$dup['count']} times</p>";
        }
    } else {
        echo "<p style='color: green'><strong>✅ No duplicate IDs found</strong></p>";
    }
    
    // 2. Check for identical records (same content, different IDs)
    echo "<h2>2. Identical Records Check</h2>";
    $identical_sql = "SELECT 
        project_id, date, type, explanation_category, explanation_custom, 
        category, price, unit, currency, total_price, 
        COUNT(*) as count,
        GROUP_CONCAT(id ORDER BY id) as ids
        FROM savings_records 
        GROUP BY project_id, date, type, explanation_category, explanation_custom, 
                 category, price, unit, currency, total_price
        HAVING count > 1 
        ORDER BY count DESC, project_id";
    
    $identical_stmt = $pdo->prepare($identical_sql);
    $identical_stmt->execute();
    $identical_records = $identical_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($identical_records) > 0) {
        echo "<p style='color: red'><strong>🚨 IDENTICAL RECORDS FOUND:</strong></p>";
        echo "<table border='1' cellpadding='5' style='border-collapse: collapse'>";
        echo "<tr style='background-color: #f0f0f0'>";
        echo "<th>Project</th><th>Date</th><th>Type</th><th>Category</th><th>Unit</th><th>Price</th><th>Total</th><th>Count</th><th>IDs</th>";
        echo "</tr>";
        
        foreach ($identical_records as $record) {
            echo "<tr>";
            echo "<td>{$record['project_id']}</td>";
            echo "<td>{$record['date']}</td>";
            echo "<td>{$record['type']}</td>";
            echo "<td>{$record['category']}</td>";
            echo "<td style='background-color: #ffcccc'><strong>{$record['unit']}</strong></td>";
            echo "<td>{$record['price']}</td>";
            echo "<td>{$record['total_price']} {$record['currency']}</td>";
            echo "<td style='background-color: #dc3545; color: white'><strong>{$record['count']}</strong></td>";
            echo "<td>{$record['ids']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p style='color: green'><strong>✅ No identical records found</strong></p>";
    }
    
    // 3. Show all records for project 3 (the one with issues)
    echo "<h2>3. Project 3 Records Analysis</h2>";
    $project3_sql = "SELECT id, date, type, category, explanation_category, price, unit, total_price, currency, created_at 
                     FROM savings_records 
                     WHERE project_id = 3 
                     ORDER BY id DESC";
    
    $project3_stmt = $pdo->prepare($project3_sql);
    $project3_stmt->execute();
    $project3_records = $project3_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p><strong>Project 3 has " . count($project3_records) . " records:</strong></p>";
    
    if (count($project3_records) > 0) {
        echo "<table border='1' cellpadding='5' style='border-collapse: collapse'>";
        echo "<tr style='background-color: #f0f0f0'>";
        echo "<th>ID</th><th>Date</th><th>Type</th><th>Category</th><th>Unit</th><th>Price</th><th>Total</th><th>Created At</th>";
        echo "</tr>";
        
        foreach ($project3_records as $record) {
            $highlight = '';
            // Check if this record appears to be a duplicate by comparing with previous records
            foreach ($project3_records as $other) {
                if ($other['id'] != $record['id'] && 
                    $other['date'] == $record['date'] && 
                    $other['category'] == $record['category'] && 
                    $other['unit'] == $record['unit'] && 
                    $other['price'] == $record['price']) {
                    $highlight = 'background-color: #ffcccc';
                    break;
                }
            }
            
            echo "<tr style='$highlight'>";
            echo "<td><strong>{$record['id']}</strong></td>";
            echo "<td>{$record['date']}</td>";
            echo "<td>{$record['type']}</td>";
            echo "<td>{$record['category']}</td>";
            echo "<td style='background-color: #ffffcc'><strong>{$record['unit']}</strong></td>";
            echo "<td>{$record['price']}</td>";
            echo "<td>{$record['total_price']} {$record['currency']}</td>";
            echo "<td>{$record['created_at']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
    // 4. Generate cleanup SQL if duplicates found
    if (count($identical_records) > 0) {
        echo "<h2>4. Cleanup SQL Commands</h2>";
        echo "<p style='color: orange'><strong>⚠️ Run these commands to remove duplicate records (keeping the oldest):</strong></p>";
        echo "<pre style='background-color: #f8f9fa; padding: 10px; border: 1px solid #ddd'>";
        
        foreach ($identical_records as $record) {
            $ids = explode(',', $record['ids']);
            if (count($ids) > 1) {
                // Keep the first (lowest) ID, delete the rest
                $keep_id = $ids[0];
                $delete_ids = array_slice($ids, 1);
                echo "-- Keep ID {$keep_id}, delete IDs: " . implode(', ', $delete_ids) . "\n";
                echo "DELETE FROM savings_records WHERE id IN (" . implode(',', $delete_ids) . ");\n\n";
            }
        }
        echo "</pre>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}
?>