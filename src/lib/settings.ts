/**
 * System settings helper
 * Provides fallback to environment variables if DB settings don't exist
 */

import prisma from './prisma';

interface SettingsCache {
  [key: string]: { value: string; timestamp: number };
}

const cache: SettingsCache = {};
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Get a system setting from DB with fallback to environment variable
 */
export async function getSetting(
  key: string,
  envVarName?: string,
  defaultValue?: string
): Promise<string | null> {
  try {
    // Check cache first
    const cached = cache[key];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.value;
    }

    // Try to get from database
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (setting) {
      // Update cache
      cache[key] = { value: setting.value, timestamp: Date.now() };
      return setting.value;
    }

    // Fallback to environment variable
    if (envVarName && process.env[envVarName]) {
      return process.env[envVarName]!;
    }

    // Return default value
    return defaultValue || null;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    
    // Fallback to environment variable on error
    if (envVarName && process.env[envVarName]) {
      return process.env[envVarName]!;
    }
    
    return defaultValue || null;
  }
}

/**
 * Get multiple settings at once
 */
export async function getSettings(
  keys: Array<{ key: string; envVarName?: string; defaultValue?: string }>
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};

  for (const { key, envVarName, defaultValue } of keys) {
    result[key] = await getSetting(key, envVarName, defaultValue);
  }

  return result;
}

/**
 * Get SMTP configuration
 */
export async function getSmtpConfig() {
  return {
    host: await getSetting('smtp_host', 'SMTP_HOST'),
    port: parseInt(await getSetting('smtp_port', 'SMTP_PORT', '587') || '587', 10),
    user: await getSetting('smtp_user', 'SMTP_USER'),
    password: await getSetting('smtp_password', 'SMTP_PASSWORD'),
    from: await getSetting('smtp_from', 'SMTP_FROM'),
  };
}

/**
 * Get upload configuration
 */
export async function getUploadConfig() {
  return {
    maxSize: parseInt(
      await getSetting('max_upload_size', 'MAX_FILE_SIZE', '104857600') || '104857600',
      10
    ),
    allowedTypes: (await getSetting('allowed_file_types', 'ALLOWED_FILE_TYPES'))
      ?.split(',')
      .map((t) => t.trim()) || [
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.jpg',
      '.jpeg',
      '.png',
    ],
    uploadDir: await getSetting('upload_dir', 'UPLOAD_DIR', './uploads'),
  };
}

/**
 * Clear the settings cache
 */
export function clearSettingsCache() {
  Object.keys(cache).forEach((key) => delete cache[key]);
}

/**
 * Initialize default settings in the database
 */
export async function initializeDefaultSettings() {
  const defaults = [
    // SMTP Settings
    {
      key: 'smtp_host',
      value: process.env.SMTP_HOST || '',
      category: 'smtp',
      description: 'SMTP server hostname',
      isEncrypted: false,
    },
    {
      key: 'smtp_port',
      value: process.env.SMTP_PORT || '587',
      category: 'smtp',
      description: 'SMTP server port',
      isEncrypted: false,
    },
    {
      key: 'smtp_user',
      value: process.env.SMTP_USER || '',
      category: 'smtp',
      description: 'SMTP username',
      isEncrypted: false,
    },
    {
      key: 'smtp_password',
      value: process.env.SMTP_PASSWORD || '',
      category: 'smtp',
      description: 'SMTP password',
      isEncrypted: true,
    },
    {
      key: 'smtp_from',
      value: process.env.SMTP_FROM || '',
      category: 'smtp',
      description: 'From email address',
      isEncrypted: false,
    },
    // Upload Settings
    {
      key: 'max_upload_size',
      value: process.env.MAX_FILE_SIZE || '104857600',
      category: 'upload',
      description: 'Maximum file upload size in bytes (default: 100MB)',
      isEncrypted: false,
    },
    {
      key: 'allowed_file_types',
      value: process.env.ALLOWED_FILE_TYPES || '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png',
      category: 'upload',
      description: 'Comma-separated list of allowed file extensions',
      isEncrypted: false,
    },
    {
      key: 'upload_dir',
      value: process.env.UPLOAD_DIR || './uploads',
      category: 'upload',
      description: 'Directory for uploaded files',
      isEncrypted: false,
    },
    // Security Settings
    {
      key: 'session_timeout',
      value: '3600',
      category: 'security',
      description: 'Session timeout in seconds (default: 1 hour)',
      isEncrypted: false,
    },
    {
      key: 'max_login_attempts',
      value: '5',
      category: 'security',
      description: 'Maximum login attempts before lockout',
      isEncrypted: false,
    },
    // General Settings
    {
      key: 'app_name',
      value: 'ClovaLink',
      category: 'general',
      description: 'Application name',
      isEncrypted: false,
    },
    {
      key: 'default_link_expiry',
      value: '7',
      category: 'general',
      description: 'Default link expiry in days',
      isEncrypted: false,
    },
  ];

  try {
    for (const setting of defaults) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        create: setting,
        update: {}, // Don't override existing values
      });
    }
    console.log('✅ Default settings initialized');
  } catch (error) {
    console.error('Error initializing default settings:', error);
  }
}

