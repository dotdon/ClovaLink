#!/usr/bin/env node
/**
 * Generate a secure AES-256 encryption key for document encryption
 * This script generates a 32-byte (256-bit) random key encoded in base64
 */

const crypto = require('crypto');

function generateEncryptionKey() {
  const key = crypto.randomBytes(32).toString('base64');
  return key;
}

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║        ClovaLink Document Encryption Key Generator            ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const key = generateEncryptionKey();

console.log('✅ Generated secure AES-256-GCM encryption key:\n');
console.log(`ENCRYPTION_KEY=${key}\n`);
console.log('📝 Instructions:');
console.log('1. Copy the line above');
console.log('2. Add it to your podman-compose.yml under the "app" service environment section');
console.log('3. Restart your containers: podman compose restart');
console.log('\n⚠️  IMPORTANT:');
console.log('- Keep this key SECRET and SECURE');
console.log('- NEVER commit this key to version control');
console.log('- Losing this key means you CANNOT decrypt existing files');
console.log('- Back up this key in a secure password manager\n');

