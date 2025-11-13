import { z } from 'zod';

/**
 * Common validation schemas
 */
export const schemas = {
  // String validation with sanitization
  sanitizedString: (min: number = 1, max: number = 1000) =>
    z
      .string()
      .min(min, `Must be at least ${min} characters`)
      .max(max, `Must be at most ${max} characters`)
      .transform((val) => sanitizeHtml(val.trim())),

  // Email validation
  email: z.string().email('Invalid email address').toLowerCase().trim(),

  // ID validation (CUID format)
  id: z.string().cuid('Invalid ID format'),

  // Optional ID
  optionalId: z.string().cuid('Invalid ID format').optional().nullable(),

  // Positive integer
  positiveInt: z.number().int().positive('Must be a positive integer'),

  // Non-negative integer
  nonNegativeInt: z.number().int().nonnegative('Must be a non-negative integer'),

  // Date string
  dateString: z.string().datetime('Invalid date format'),

  // File name validation
  fileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name too long')
    .regex(/^[^<>:"/\\|?*\x00-\x1F]+$/, 'File name contains invalid characters'),

  // Folder name validation
  folderName: z
    .string()
    .min(1, 'Folder name is required')
    .max(255, 'Folder name too long')
    .regex(/^[^<>:"/\\|?*\x00-\x1F]+$/, 'Folder name contains invalid characters')
    .transform((val) => val.trim()),

  // Company name validation
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(100, 'Company name too long')
    .transform((val) => sanitizeHtml(val.trim())),

  // Password validation
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  // URL validation
  url: z.string().url('Invalid URL format'),

  // Pagination
  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(10),
  }),
};

/**
 * Sanitize HTML to prevent XSS
 * Removes HTML tags and dangerous characters
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
  
  // Remove dangerous characters that could be used for XSS
  sanitized = sanitized.replace(/[<>'"&]/g, '');
  
  return sanitized.trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeHtml(sanitized[key]) as T[Extract<keyof T, string>];
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]) as T[Extract<keyof T, string>];
    }
  }
  return sanitized;
}

/**
 * Validate request body with Zod schema
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string; errors: string[] }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.errors.map((err) => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
      });
      return {
        success: false,
        error: 'Validation failed',
        errors,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: 'Invalid JSON',
        errors: ['Request body must be valid JSON'],
      };
    }
    return {
      success: false,
      error: 'Validation error',
      errors: ['Failed to parse request body'],
    };
  }
}

/**
 * Validate query parameters with Zod schema
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string; errors: string[] } {
  const params: Record<string, string | string[]> = {};
  searchParams.forEach((value, key) => {
    if (params[key]) {
      // Multiple values for same key
      const existing = params[key];
      params[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      params[key] = value;
    }
  });

  const result = schema.safeParse(params);

  if (!result.success) {
    const errors = result.error.errors.map((err) => {
      const path = err.path.join('.');
      return path ? `${path}: ${err.message}` : err.message;
    });
    return {
      success: false,
      error: 'Validation failed',
      errors,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

