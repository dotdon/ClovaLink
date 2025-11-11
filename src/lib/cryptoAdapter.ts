/**
 * Crypto Adapter - Unified interface for JS and Rust crypto implementations
 * 
 * This adapter provides a seamless way to switch between JavaScript (Node.js crypto)
 * and Rust implementations based on the USE_RUST_CRYPTO environment variable.
 * 
 * NO APPLICATION LOGIC CHANGES REQUIRED - just replace imports with this adapter.
 */

import { Buffer } from 'buffer';
import crypto from 'crypto';

// Feature flag - set USE_RUST_CRYPTO=true in .env to enable Rust acceleration
const USE_RUST = process.env.USE_RUST_CRYPTO === 'true';

// Lazy load Rust bindings (only if enabled and available)
let rustCore: any = null;
let rustLoadAttempted = false;
let rustAvailable = false;

function getRustCore() {
  if (!rustLoadAttempted && USE_RUST) {
    rustLoadAttempted = true;
    try {
      // Load at runtime to avoid webpack bundling issues
      const path = require('path');
      const fs = require('fs');
      
      // Determine the correct .node file for current platform
      const platform = process.platform;
      const arch = process.arch;
      
      let nodeName = '';
      if (platform === 'linux' && arch === 'arm64') {
        nodeName = 'clovalink-rust-core.linux-arm64-gnu.node';
      } else if (platform === 'linux' && arch === 'x64') {
        nodeName = 'clovalink-rust-core.linux-x64-gnu.node';
      } else if (platform === 'darwin' && arch === 'arm64') {
        nodeName = 'clovalink-rust-core.darwin-arm64.node';
      } else if (platform === 'darwin' && arch === 'x64') {
        nodeName = 'clovalink-rust-core.darwin-x64.node';
      }
      
      // Try multiple possible paths
      const possiblePaths = [
        path.join(process.cwd(), 'rust-core', nodeName),
        path.join('/app', 'rust-core', nodeName),
        path.join(__dirname, '../../rust-core', nodeName),
      ];
      
      let loaded = false;
      for (const nodePath of possiblePaths) {
        if (nodeName && fs.existsSync(nodePath)) {
          try {
            rustCore = require(nodePath);
            rustAvailable = true;
            loaded = true;
            console.log(`✓ Rust crypto core loaded: ${nodeName} from ${nodePath}`);
            break;
          } catch (reqErr: any) {
            console.warn(`  Failed to require ${nodePath}:`, reqErr.message);
          }
        }
      }
      
      if (!loaded) {
        console.warn(`⚠ Rust binary not found in any of: ${possiblePaths.join(', ')}`);
        rustAvailable = false;
      }
    } catch (err: any) {
      console.warn('⚠ Failed to load Rust core, falling back to JavaScript crypto:', err.message);
      rustAvailable = false;
    }
  }
  return rustAvailable ? rustCore : null;
}

/**
 * Generate a random encryption key
 * - Rust: 32 bytes (for XChaCha20-Poly1305)
 * - JS: 32 bytes (for AES-256-GCM)
 */
export function generateEncryptionKey(): Buffer {
  const rust = getRustCore();
  if (rust) {
    return rust.generateKey();
  }
  
  // Fallback to Node.js crypto
  return crypto.randomBytes(32);
}

/**
 * Generate a random nonce/IV
 * - Rust: 24 bytes (for XChaCha20-Poly1305)
 * - JS: 16 bytes (for AES-256-GCM)
 * 
 * NOTE: Nonces are stored with encrypted data, so format doesn't need to match
 */
export function generateNonce(): Buffer {
  const rust = getRustCore();
  if (rust) {
    return rust.generateNonce(); // 24 bytes
  }
  
  // Fallback to Node.js crypto
  return crypto.randomBytes(16); // AES-GCM IV
}

/**
 * Encrypt a data chunk
 * - Rust: XChaCha20-Poly1305 (faster, more secure)
 * - JS: AES-256-GCM (standard, widely supported)
 * 
 * @param data - Data to encrypt
 * @param key - Encryption key (32 bytes)
 * @param nonce - Nonce/IV (24 bytes for Rust, 16 bytes for JS)
 * @returns Encrypted data with authentication tag
 */
export function encryptChunk(
  data: Buffer,
  key: Buffer,
  nonce: Buffer
): Buffer {
  const rust = getRustCore();
  if (rust) {
    return rust.encryptChunk(data, key, nonce);
  }
  
  // Fallback to AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Append auth tag to match Rust's output format
  return Buffer.concat([encrypted, authTag]);
}

/**
 * Decrypt a data chunk
 * 
 * @param data - Encrypted data (includes authentication tag)
 * @param key - Decryption key (same as encryption key)
 * @param nonce - Nonce/IV (same as used for encryption)
 * @returns Decrypted plaintext
 * @throws Error if authentication fails (tampered data)
 */
export function decryptChunk(
  data: Buffer,
  key: Buffer,
  nonce: Buffer
): Buffer {
  const rust = getRustCore();
  if (rust) {
    return rust.decryptChunk(data, key, nonce);
  }
  
  // Fallback to AES-256-GCM
  // Extract auth tag (last 16 bytes)
  const authTag = data.slice(-16);
  const encrypted = data.slice(0, -16);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Hash a data chunk
 * - Rust: BLAKE3 (10-20x faster than SHA-256)
 * - JS: SHA-256 (standard)
 * 
 * Both produce 32-byte hashes
 */
export function hashChunk(data: Buffer): Buffer {
  const rust = getRustCore();
  if (rust) {
    return rust.hashChunk(data); // BLAKE3: 32 bytes
  }
  
  // Fallback to SHA-256
  return crypto.createHash('sha256').update(data).digest(); // 32 bytes
}

/**
 * Compute a keyed hash (MAC)
 * - Rust: BLAKE3 keyed hash
 * - JS: HMAC-SHA256
 */
export function hashChunkKeyed(data: Buffer, key: Buffer): Buffer {
  const rust = getRustCore();
  if (rust) {
    return rust.hashChunkKeyed(data, key);
  }
  
  // Fallback to HMAC-SHA256
  return crypto.createHmac('sha256', key).update(data).digest();
}

/**
 * Derive a key from a password
 * - Rust: BLAKE3 KDF (faster)
 * - JS: PBKDF2-SHA256 (100,000 iterations)
 * 
 * @param password - Password string
 * @param salt - Salt for key derivation
 * @param context - Context string for domain separation (e.g., 'clovalink-encryption')
 */
export function deriveKey(
  password: string,
  salt: Buffer,
  context: string = 'clovalink'
): Buffer {
  const rust = getRustCore();
  if (rust) {
    return rust.deriveKey(password, salt, context);
  }
  
  // Fallback to PBKDF2
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/**
 * Get the current crypto implementation being used
 */
export function getCryptoImplementation(): 'rust' | 'javascript' {
  return rustAvailable ? 'rust' : 'javascript';
}

/**
 * Check if Rust crypto is available and enabled
 */
export function isRustCryptoEnabled(): boolean {
  return rustAvailable;
}

// Log the active implementation on module load
if (USE_RUST) {
  getRustCore(); // Trigger load attempt
  if (rustAvailable) {
    console.log('🦀 Using Rust crypto core for high-performance encryption');
  } else {
    console.log('📦 Using JavaScript crypto (Rust core not available)');
  }
} else {
  console.log('📦 Using JavaScript crypto (Rust disabled via USE_RUST_CRYPTO env var)');
}

