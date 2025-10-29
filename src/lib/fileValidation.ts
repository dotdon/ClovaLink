/**
 * File validation utilities for secure file uploads
 */

// Maximum file size: 100MB (configurable via env var)
export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100MB in bytes

// Allowed MIME types (can be extended via env var)
const DEFAULT_ALLOWED_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  // Other
  'application/json',
  'application/xml',
  'text/xml',
];

export const ALLOWED_MIME_TYPES = process.env.ALLOWED_MIME_TYPES
  ? process.env.ALLOWED_MIME_TYPES.split(',')
  : DEFAULT_ALLOWED_TYPES;

// Dangerous file extensions that should never be allowed
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.dll', '.msi', '.app', '.deb', '.rpm', '.sh', '.bash', '.ps1'
];

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components
  const basename = filename.split(/[/\\]/).pop() || 'file';
  
  // Remove or replace dangerous characters
  let sanitized = basename
    .replace(/[^\w\s.-]/g, '_') // Replace non-alphanumeric (except spaces, dots, dashes)
    .replace(/\s+/g, '_')        // Replace spaces with underscores
    .replace(/\.+/g, '.')        // Replace multiple dots with single dot
    .replace(/^\./, '')          // Remove leading dot
    .substring(0, 255);          // Limit length

  // Ensure file has an extension
  if (!sanitized.includes('.')) {
    sanitized += '.txt';
  }

  return sanitized || 'file.txt';
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): { valid: boolean; error?: string } {
  if (size <= 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (size > MAX_FILE_SIZE) {
    const maxSizeMB = (MAX_FILE_SIZE / 1048576).toFixed(2);
    return { 
      valid: false, 
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB` 
    };
  }

  return { valid: true };
}

/**
 * Validate MIME type
 */
export function validateMimeType(mimeType: string): { valid: boolean; error?: string } {
  if (!mimeType) {
    return { valid: false, error: 'MIME type not specified' };
  }

  // Normalize MIME type
  const normalizedType = mimeType.toLowerCase().trim();

  if (!ALLOWED_MIME_TYPES.includes(normalizedType)) {
    return { 
      valid: false, 
      error: `File type '${mimeType}' is not allowed` 
    };
  }

  return { valid: true };
}

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string): { valid: boolean; error?: string } {
  const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();

  if (BLOCKED_EXTENSIONS.includes(extension)) {
    return { 
      valid: false, 
      error: `File extension '${extension}' is not allowed for security reasons` 
    };
  }

  return { valid: true };
}

/**
 * Comprehensive file validation
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
}

export function validateFile(
  file: File | { name: string; size: number; type: string }
): FileValidationResult {
  // Validate filename
  const sanitizedFilename = sanitizeFilename(file.name);

  // Validate extension
  const extValidation = validateFileExtension(sanitizedFilename);
  if (!extValidation.valid) {
    return { valid: false, error: extValidation.error };
  }

  // Validate size
  const sizeValidation = validateFileSize(file.size);
  if (!sizeValidation.valid) {
    return { valid: false, error: sizeValidation.error };
  }

  // Validate MIME type
  const mimeValidation = validateMimeType(file.type);
  if (!mimeValidation.valid) {
    return { valid: false, error: mimeValidation.error };
  }

  return { 
    valid: true, 
    sanitizedFilename 
  };
}

/**
 * Magic bytes for common file types (for advanced validation)
 * Can be used to verify file type beyond just checking MIME type
 */
export const FILE_SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'application/zip': [0x50, 0x4B, 0x03, 0x04],
};

/**
 * Verify file signature (magic bytes)
 * This provides an additional layer of security beyond MIME type checking
 */
export async function verifyFileSignature(
  buffer: ArrayBuffer,
  expectedMimeType: string
): Promise<boolean> {
  const signature = FILE_SIGNATURES[expectedMimeType];
  if (!signature) {
    // If we don't have a signature for this type, skip verification
    return true;
  }

  const uint8Array = new Uint8Array(buffer);
  const fileHeader = Array.from(uint8Array.slice(0, signature.length));

  return signature.every((byte, index) => byte === fileHeader[index]);
}

