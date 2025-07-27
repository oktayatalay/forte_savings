/**
 * Input sanitization utilities for XSS prevention
 */

// HTML entity encoding map
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize user input for display
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove potential script tags and dangerous attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate numeric input
 */
export function isValidNumber(value: string): boolean {
  return !isNaN(Number(value)) && isFinite(Number(value));
}

/**
 * Sanitize object properties recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T;
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeInput(value) as T[keyof T];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(value) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validate and sanitize form data
 */
export function validateFormData(data: Record<string, any>): {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedData: Record<string, any>;
} {
  const errors: Record<string, string> = {};
  const sanitizedData = sanitizeObject(data);
  
  // Common validations
  if (data.email && !isValidEmail(data.email)) {
    errors.email = 'Geçersiz email formatı';
  }
  
  if (data.password && data.password.length < 6) {
    errors.password = 'Şifre en az 6 karakter olmalıdır';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData,
  };
}