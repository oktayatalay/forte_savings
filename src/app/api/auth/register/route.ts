import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
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
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long';
  }

  if (!data.first_name || typeof data.first_name !== 'string') {
    errors.first_name = 'First name is required';
  } else if (data.first_name.length > 50) {
    errors.first_name = 'First name must be less than 50 characters';
  }

  if (!data.last_name || typeof data.last_name !== 'string') {
    errors.last_name = 'Last name is required';
  } else if (data.last_name.length > 50) {
    errors.last_name = 'Last name must be less than 50 characters';
  }

  return errors;
}

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map();
const RATE_LIMIT = 5; // max 5 requests per hour per IP
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
        { error: 'RATE_LIMIT_EXCEEDED', message: 'Too many registration attempts. Please try again later.' },
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

    const { email, password, first_name, last_name } = body;

    // Create database connection
    const connection = await createConnection();

    try {
      // Check if email already exists
      const [existingUsers] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        return NextResponse.json(
          { error: 'EMAIL_EXISTS', message: 'Email address is already registered' },
          { status: 400 }
        );
      }

      // Hash password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Generate verification token
      const verification_token = randomBytes(32).toString('hex');

      // Insert new user
      const [result] = await connection.execute(
        `INSERT INTO users (email, password_hash, first_name, last_name, email_verification_token, created_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [email, password_hash, first_name, last_name, verification_token]
      );

      const user_id = (result as any).insertId;

      // Create audit log entry
      await connection.execute(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent, created_at) 
         VALUES (?, 'CREATE', 'users', ?, ?, ?, ?, NOW())`,
        [
          user_id,
          user_id,
          JSON.stringify({
            email,
            first_name,
            last_name,
            role: 'user'
          }),
          ip,
          request.headers.get('user-agent') || 'unknown'
        ]
      );

      // TODO: Send verification email
      // For now, we'll return the token for manual verification
      const emailSent = false; // Set to true when email service is implemented

      return NextResponse.json({
        message: 'User registered successfully',
        user_id,
        email,
        verification_required: true,
        email_sent: emailSent,
        verification_token: emailSent ? null : verification_token
      }, { status: 201 });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('Registration error:', error);
    
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
        message: 'Registration failed due to server error'
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