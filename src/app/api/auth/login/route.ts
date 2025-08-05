import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createConnection } from '@/lib/database';

// Input validation
function validateInput(data: any) {
  const errors: Record<string, string> = {};

  if (!data.email || typeof data.email !== 'string') {
    errors.email = 'Email is required';
  } else if (!data.email.endsWith('@fortetourism.com')) {
    errors.email = 'Only @fortetourism.com email addresses are allowed';
  }

  if (!data.password || typeof data.password !== 'string') {
    errors.password = 'Password is required';
  }

  return errors;
}

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map();
const RATE_LIMIT = 10; // max 10 requests per hour per IP
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }
  
  const requests = rateLimitMap.get(ip).filter((time: number) => time > windowStart);
  rateLimitMap.set(ip, requests);
  
  if (requests.length >= RATE_LIMIT) {
    return false;
  }
  
  requests.push(now);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'RATE_LIMIT_EXCEEDED', message: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validationErrors = validateInput(body);
    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json(
        { 
          error: 'VALIDATION_ERROR', 
          message: 'Invalid input data',
          details: validationErrors 
        },
        { status: 400 }
      );
    }

    const { email, password } = body;

    // Create database connection
    const connection = await createConnection();

    try {
      // Find user by email
      const [users] = await connection.execute(
        'SELECT id, email, password_hash, first_name, last_name, role, is_active, email_verified FROM users WHERE email = ?',
        [email]
      );

      if (!Array.isArray(users) || users.length === 0) {
        return NextResponse.json(
          { error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
          { status: 401 }
        );
      }

      const user = users[0] as any;

      // Check if user is active
      if (!user.is_active) {
        return NextResponse.json(
          { error: 'ACCOUNT_DISABLED', message: 'Account is disabled' },
          { status: 401 }
        );
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Get JWT secret from database or use fallback
      let jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        const [settings] = await connection.execute(
          'SELECT setting_value FROM system_settings WHERE setting_key = ?',
          ['jwt_secret']
        );
        if (Array.isArray(settings) && settings.length > 0) {
          jwtSecret = (settings[0] as any).setting_value;
        } else {
          // Generate a temporary secret - not recommended for production
          jwtSecret = require('crypto').randomBytes(64).toString('hex');
        }
      }

      // Generate JWT token
      const tokenPayload = {
        user_id: user.id,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      };

      if (!jwtSecret) {
        return NextResponse.json(
          { error: 'SERVER_ERROR', message: 'JWT secret not configured' },
          { status: 500 }
        );
      }

      const token = jwt.sign(tokenPayload, jwtSecret, { algorithm: 'HS256' });

      // Create audit log entry
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent, created_at) 
         VALUES (?, 'LOGIN', 'users', ?, ?, ?, ?, NOW())`,
        [
          user.id,
          user.id,
          JSON.stringify({ action: 'successful_login' }),
          ip,
          request.headers.get('user-agent') || 'unknown'
        ]
      );

      return NextResponse.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          email_verified: user.email_verified
        }
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ER_NO_SUCH_TABLE')) {
        return NextResponse.json(
          { 
            error: 'DATABASE_ERROR', 
            message: 'Database tables not found. Please run database migration first.' 
          },
          { status: 500 }
        );
      }
      
      if (error.message.includes('ER_ACCESS_DENIED')) {
        return NextResponse.json(
          { 
            error: 'DATABASE_ERROR', 
            message: 'Database connection failed. Please check database configuration.' 
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'INTERNAL_SERVER_ERROR', 
        message: 'Login failed due to server error'
      },
      { status: 500 }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://savings.forte.works',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '3600',
    },
  });
}