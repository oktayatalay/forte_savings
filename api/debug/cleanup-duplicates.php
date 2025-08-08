<?php
header('Content-Type: text/html; charset=UTF-8');
require_once '../config/database.php';

try {
    $pdo = getDBConnection();
    
    echo "<h1>DUPLICATE CLEANUP TOOL</h1>";
    
    // Check if cleanup was requested
    $cleanup_requested = isset($_POST['cleanup']) && $_POST['cleanup'] === 'yes';
    
    if (!$cleanup_requested) {
        // Show analysis and cleanup form
        echo "<h2>Analysis</h2>";
        
        // Find identical records
        $identical_sql = "SELECT 
            project_id, date, type, explanation_category, explanation_custom, 
            category, price, unit, currency, total_price, 
            COUNT(*) as count,
            GROUP_CONCAT(id ORDER BY id) as ids,
            GROUP_CONCAT(created_at ORDER BY id) as created_ats
            FROM savings_records 
            GROUP BY project_id, date, type, explanation_category, explanation_custom, 
                     category, price, unit, currency, total_price
            HAVING count > 1 
            ORDER BY count DESC, project_id";
        
        $identical_stmt = $pdo->prepare($identical_sql);
        $identical_stmt->execute();
        $identical_records = $identical_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($identical_records) > 0) {
            echo "<p style='color: red'><strong>🚨 Found " . count($identical_records) . " groups of identical records:</strong></p>";
            
            $total_to_delete = 0;
            echo "<table border='1' cellpadding='5' style='border-collapse: collapse'>";
            echo "<tr style='background-color: #f0f0f0'>";
            echo "<th>Project</th><th>Date</th><th>Type</th><th>Category</th><th>Unit</th><th>Total</th><th>Count</th><th>Keep ID</th><th>Delete IDs</th>";
            echo "</tr>";
            
            foreach ($identical_records as $record) {
                $ids = explode(',', $record['ids']);
                $keep_id = $ids[0]; // Keep the oldest (lowest ID)
                $delete_ids = array_slice($ids, 1);
                $total_to_delete += count($delete_ids);
                
                echo "<tr>";
                echo "<td>{$record['project_id']}</td>";
                echo "<td>{$record['date']}</td>";
                echo "<td>{$record['type']}</td>";
                echo "<td>{$record['category']}</td>";
                echo "<td style='background-color: #ffcccc'><strong>{$record['unit']}</strong></td>";
                echo "<td>{$record['total_price']} {$record['currency']}</td>";
                echo "<td style='background-color: #dc3545; color: white'><strong>{$record['count']}</strong></td>";
                echo "<td style='background-color: #28a745; color: white'><strong>{$keep_id}</strong></td>";
                echo "<td style='background-color: #dc3545; color: white'>" . implode(', ', $delete_ids) . "</td>";
                echo "</tr>";
            }
            echo "</table>";
            
            echo "<br><p><strong>Summary:</strong> Will delete {$total_to_delete} duplicate records, keeping the oldest of each group.</p>";
            
            // Show cleanup form
            echo "<form method='POST' onsubmit='return confirm(\"Are you sure you want to delete {$total_to_delete} duplicate records? This cannot be undone!\")'>";
            echo "<input type='hidden' name='cleanup' value='yes'>";
            echo "<button type='submit' style='background-color: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer'>🗑️ DELETE {$total_to_delete} DUPLICATE RECORDS</button>";
            echo "</form>";
            
        } else {
            echo "<p style='color: green'><strong>✅ No duplicate records found!</strong></p>";
        }
        
    } else {
        // Perform cleanup
        echo "<h2>Performing Cleanup...</h2>";
        
        $pdo->beginTransaction();
        
        try {
            // Find identical records again
            $identical_sql = "SELECT 
                GROUP_CONCAT(id ORDER BY id) as ids
                FROM savings_records 
                GROUP BY project_id, date, type, explanation_category, explanation_custom, 
                         category, price, unit, currency, total_price
                HAVING COUNT(*) > 1";
            
            $identical_stmt = $pdo->prepare($identical_sql);
            $identical_stmt->execute();
            $identical_records = $identical_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $total_deleted = 0;
            
            foreach ($identical_records as $record) {
                $ids = explode(',', $record['ids']);
                if (count($ids) > 1) {
                    // Keep the first (lowest) ID, delete the rest
                    $delete_ids = array_slice($ids, 1);
                    
                    $delete_sql = "DELETE FROM savings_records WHERE id IN (" . implode(',', array_map('intval', $delete_ids)) . ")";
                    $delete_stmt = $pdo->prepare($delete_sql);
                    $delete_stmt->execute();
                    
                    $deleted_count = $delete_stmt->rowCount();
                    $total_deleted += $deleted_count;
                    
                    echo "<p>✅ Deleted {$deleted_count} duplicates, kept ID {$ids[0]}</p>";
                }
            }
            
            $pdo->commit();
            
            echo "<h3 style='color: green'>✅ Cleanup Complete!</h3>";
            echo "<p><strong>Total records deleted:</strong> {$total_deleted}</p>";
            echo "<p><a href='?' style='color: blue; text-decoration: underline'>Run analysis again</a></p>";
            
        } catch (Exception $e) {
            $pdo->rollback();
            throw $e;
        }
    }
    
} catch (Exception $e) {
    echo "<p style='color: red'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}
?>

<style>
body { font-family: Arial, sans-serif; margin: 20px; }
table { width: 100%; }
button:hover { opacity: 0.8; }
</style>