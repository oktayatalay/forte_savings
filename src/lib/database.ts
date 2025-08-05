import mysql from 'mysql2/promise';

// Database connection configuration
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'forte_savings',
  charset: 'utf8mb4',
  connectionLimit: 10
};

// Create database connection
export async function createConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

// Create connection pool for better performance
export const pool = mysql.createPool(dbConfig);

// Test database connection
export async function testConnection() {
  try {
    const connection = await createConnection();
    await connection.execute('SELECT 1');
    await connection.end();
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    console.error('Database connection test failed:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Database connection failed' 
    };
  }
}

// Initialize database (create tables if they don't exist)
export async function initializeDatabase() {
  try {
    const connection = await createConnection();
    
    // Read and execute the SQL schema
    const createTablesSQL = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(50) NOT NULL,
          last_name VARCHAR(50) NOT NULL,
          role ENUM('admin', 'user') DEFAULT 'user',
          is_active BOOLEAN DEFAULT TRUE,
          email_verified BOOLEAN DEFAULT FALSE,
          email_verification_token VARCHAR(255) NULL,
          password_reset_token VARCHAR(255) NULL,
          password_reset_expires DATETIME NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT chk_email_domain CHECK (email LIKE '%@fortetourism.com')
      );

      -- Audit logs table
      CREATE TABLE IF NOT EXISTS audit_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          action VARCHAR(100) NOT NULL,
          table_name VARCHAR(50) NOT NULL,
          record_id INT NOT NULL,
          old_values JSON,
          new_values JSON,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- System settings table
      CREATE TABLE IF NOT EXISTS system_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          setting_key VARCHAR(100) UNIQUE NOT NULL,
          setting_value TEXT,
          description VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    // Execute the schema creation
    const statements = createTablesSQL.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
      }
    }

    // Insert default system settings
    await connection.execute(`
      INSERT INTO system_settings (setting_key, setting_value, description) VALUES
      ('app_name', 'Forte Savings', 'Application name'),
      ('app_version', '1.0.0', 'Application version'),
      ('default_currency', 'TRY', 'Default currency'),
      ('jwt_secret', '${generateJWTSecret()}', 'JWT Secret Key'),
      ('email_domain', '@fortetourism.com', 'Allowed email domain')
      ON DUPLICATE KEY UPDATE setting_value = COALESCE(NULLIF(setting_value, ''), VALUES(setting_value))
    `);

    await connection.end();
    return { success: true, message: 'Database initialized successfully' };
  } catch (error) {
    console.error('Database initialization failed:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Database initialization failed' 
    };
  }
}

// Generate a secure JWT secret
function generateJWTSecret(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(64).toString('hex');
}

// Check if database exists and is properly set up
export async function checkDatabaseHealth() {
  try {
    const connection = await createConnection();
    
    // Check if required tables exist
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('users', 'audit_logs', 'system_settings')
    `, [dbConfig.database]);

    const tableNames = (tables as any[]).map(t => t.TABLE_NAME);
    const requiredTables = ['users', 'audit_logs', 'system_settings'];
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));

    await connection.end();

    return {
      success: missingTables.length === 0,
      message: missingTables.length === 0 
        ? 'Database health check passed' 
        : `Missing tables: ${missingTables.join(', ')}`,
      details: {
        existingTables: tableNames,
        missingTables
      }
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Database health check failed' 
    };
  }
}