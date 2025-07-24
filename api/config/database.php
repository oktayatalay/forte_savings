<?php
class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $conn;

    public function __construct() {
        $this->host = $_ENV['DB_HOST'] ?? 'localhost';
        $this->db_name = $_ENV['DB_NAME'] ?? 'forte_savings';
        $this->username = $_ENV['DB_USER'] ?? 'root';
        $this->password = $_ENV['DB_PASS'] ?? '';
    }

    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password,
                array(
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8",
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                )
            );
        } catch(PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());
            throw new Exception("Database connection failed");
        }

        return $this->conn;
    }

    public function testConnection() {
        try {
            $conn = $this->getConnection();
            $stmt = $conn->query("SELECT 1");
            return [
                'success' => true,
                'message' => 'Database connection successful',
                'server_info' => $conn->getAttribute(PDO::ATTR_SERVER_INFO)
            ];
        } catch(Exception $e) {
            return [
                'success' => false,
                'message' => 'Database connection failed: ' . $e->getMessage()
            ];
        }
    }
}
?>