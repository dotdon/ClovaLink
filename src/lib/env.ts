/**
 * Environment variable validation and configuration
 * Validates required environment variables at startup
 */

interface EnvConfig {
  DATABASE_URL: string;
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  UPLOAD_DIR?: string;
  MAX_FILE_SIZE?: string;
  LOG_LEVEL?: string;
}

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
] as const;

const OPTIONAL_ENV_VARS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'UPLOAD_DIR',
  'MAX_FILE_SIZE',
  'ALLOWED_MIME_TYPES',
  'LOG_LEVEL',
] as const;

/**
 * Validate that all required environment variables are set
 */
export function validateEnv(): EnvConfig {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  - ${missing.join('\n  - ')}\n\n` +
      'Please copy .env.example to .env and fill in the required values.'
    );
  }

  // Check optional but recommended variables
  if (!process.env.SMTP_HOST) {
    warnings.push('SMTP_HOST not set - email notifications will not work');
  }

  // Validate NEXTAUTH_SECRET length
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    warnings.push('NEXTAUTH_SECRET should be at least 32 characters long for security');
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    warnings.push('DATABASE_URL should start with postgresql://');
  }

  // Validate MAX_FILE_SIZE if set
  if (process.env.MAX_FILE_SIZE) {
    const maxSize = parseInt(process.env.MAX_FILE_SIZE, 10);
    if (isNaN(maxSize) || maxSize <= 0) {
      warnings.push('MAX_FILE_SIZE must be a positive number');
    }
  }

  // Validate LOG_LEVEL if set
  const validLogLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  if (process.env.LOG_LEVEL && !validLogLevels.includes(process.env.LOG_LEVEL)) {
    warnings.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
  }

  // Log warnings if in development
  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('\n⚠️  Environment Configuration Warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
    console.warn('');
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '104857600',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  };
}

/**
 * Get validated environment configuration
 * This will be called at module import time to validate env vars on startup
 */
let envConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!envConfig) {
    envConfig = validateEnv();
  }
  return envConfig;
}

// Validate environment on module load (server-side only)
if (typeof window === 'undefined') {
  try {
    getEnvConfig();
    console.log('✅ Environment variables validated successfully');
  } catch (error) {
    console.error('❌ Environment validation failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

