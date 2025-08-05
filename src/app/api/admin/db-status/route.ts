import { NextRequest, NextResponse } from 'next/server';
import { testConnection, checkDatabaseHealth, initializeDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Test basic connection
    const connectionTest = await testConnection();
    
    // Check database health
    const healthCheck = await checkDatabaseHealth();
    
    return NextResponse.json({
      connection: connectionTest,
      health: healthCheck,
      timestamp: new Date().toISOString(),
      config: {
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'forte_savings',
        user: process.env.DB_USER || 'root',
        // Don't expose password in response
      }
    });
  } catch (error) {
    console.error('Database status check failed:', error);
    return NextResponse.json(
      { 
        error: 'Database status check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'initialize') {
      const result = await initializeDatabase();
      return NextResponse.json(result);
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Database initialization failed:', error);
    return NextResponse.json(
      { 
        error: 'Database initialization failed',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}