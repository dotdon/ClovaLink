import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits

/**
 * Generate a random encryption key from the master key and salt
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Derive a company-specific encryption key
 * This ensures each company's data is encrypted with a unique key
 * Even if master key is compromised, cross-company access requires companyId
 */
function deriveCompanyKey(masterKey: string, companyId: string): Buffer {
  // Use company ID as additional entropy for key derivation
  const companySalt = Buffer.from(`company:${companyId}:salt`, 'utf-8');
  return crypto.pbkdf2Sync(masterKey, companySalt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt a buffer using AES-256-GCM
 * @param buffer - The data to encrypt
 * @param masterKey - The master encryption key from environment
 * @returns Object containing encrypted data, IV, auth tag, and salt
 */
export function encryptBuffer(buffer: Buffer, masterKey: string): {
  encryptedData: Buffer;
  iv: Buffer;
  authTag: Buffer;
  salt: Buffer;
} {
  if (!masterKey || masterKey.length < 32) {
    throw new Error('Invalid master key: must be at least 32 characters');
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Derive encryption key from master key and salt
  const key = deriveKey(masterKey, salt);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt data
  const encryptedData = Buffer.concat([
    cipher.update(buffer),
    cipher.final()
  ]);
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedData,
    iv,
    authTag,
    salt
  };
}

/**
 * Decrypt a buffer using AES-256-GCM
 * @param encryptedData - The encrypted data
 * @param iv - The initialization vector
 * @param authTag - The authentication tag
 * @param salt - The salt used for key derivation
 * @param masterKey - The master encryption key from environment
 * @returns Decrypted buffer
 */
export function decryptBuffer(
  encryptedData: Buffer,
  iv: Buffer,
  authTag: Buffer,
  salt: Buffer,
  masterKey: string
): Buffer {
  if (!masterKey || masterKey.length < 32) {
    throw new Error('Invalid master key: must be at least 32 characters');
  }

  // Derive the same encryption key
  const key = deriveKey(masterKey, salt);
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt data
  const decryptedData = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final()
  ]);
  
  return decryptedData;
}

/**
 * Encrypt a file with company-specific key and save encryption metadata
 * @param fileBuffer - The file buffer to encrypt
 * @param companyId - The company ID to derive encryption key from
 * @returns Object containing encrypted buffer and metadata to store in database
 */
export function encryptFile(fileBuffer: Buffer, companyId: string): {
  encryptedBuffer: Buffer;
  encryptionMetadata: {
    iv: string;
    authTag: string;
    salt: string;
    algorithm: string;
  };
} {
  const masterKey = process.env.ENCRYPTION_KEY;
  
  if (!masterKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Derive company-specific encryption key
  const companyKey = deriveCompanyKey(masterKey, companyId);
  
  // Use the company key as the "master key" for this file
  const { encryptedData, iv, authTag, salt } = encryptBuffer(fileBuffer, companyKey.toString('base64'));
  
  return {
    encryptedBuffer: encryptedData,
    encryptionMetadata: {
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
      algorithm: ALGORITHM
    }
  };
}

/**
 * Decrypt a file using stored metadata and company-specific key
 * @param encryptedBuffer - The encrypted file buffer
 * @param companyId - The company ID to derive decryption key from
 * @param metadata - The encryption metadata from database
 * @returns Decrypted file buffer
 */
export function decryptFile(
  encryptedBuffer: Buffer,
  companyId: string,
  metadata: {
    iv: string;
    authTag: string;
    salt: string;
    algorithm: string;
  }
): Buffer {
  const masterKey = process.env.ENCRYPTION_KEY;
  
  if (!masterKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (metadata.algorithm !== ALGORITHM) {
    throw new Error(`Unsupported encryption algorithm: ${metadata.algorithm}`);
  }

  // Derive the same company-specific key used for encryption
  const companyKey = deriveCompanyKey(masterKey, companyId);

  const iv = Buffer.from(metadata.iv, 'base64');
  const authTag = Buffer.from(metadata.authTag, 'base64');
  const salt = Buffer.from(metadata.salt, 'base64');
  
  return decryptBuffer(encryptedBuffer, iv, authTag, salt, companyKey.toString('base64'));
}

/**
 * Check if a document is encrypted based on metadata
 */
export function isDocumentEncrypted(document: any): boolean {
  return !!(document.encryptionIv && document.encryptionAuthTag && document.encryptionSalt);
}

/**
 * Generate a secure random encryption key
 * Use this to generate the ENCRYPTION_KEY for your .env file
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}
