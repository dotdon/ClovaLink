#!/usr/bin/env node

const { 
  generateKey, 
  generateNonce, 
  encryptChunk, 
  decryptChunk, 
  hashChunk,
  hashChunkKeyed,
  deriveKey
} = require('./index.js');

console.log('🦀 Testing ClovaLink Rust Core\n');
console.log('=' .repeat(50));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.error(`  Error: ${err.message}`);
    failed++;
  }
}

// Test 1: Key Generation
test('Generate 32-byte encryption key', () => {
  const key = generateKey();
  if (key.length !== 32) throw new Error(`Expected 32 bytes, got ${key.length}`);
});

// Test 2: Nonce Generation
test('Generate 24-byte nonce', () => {
  const nonce = generateNonce();
  if (nonce.length !== 24) throw new Error(`Expected 24 bytes, got ${nonce.length}`);
});

// Test 3: Basic Encryption/Decryption
test('Encrypt and decrypt "Hello, World!"', () => {
  const key = generateKey();
  const nonce = generateNonce();
  const plaintext = Buffer.from('Hello, World!');
  
  const ciphertext = encryptChunk(plaintext, key, nonce);
  const decrypted = decryptChunk(ciphertext, key, nonce);
  
  if (!plaintext.equals(decrypted)) {
    throw new Error('Decrypted text does not match original');
  }
});

// Test 4: Empty Data
test('Encrypt and decrypt empty buffer', () => {
  const key = generateKey();
  const nonce = generateNonce();
  const plaintext = Buffer.alloc(0);
  
  const ciphertext = encryptChunk(plaintext, key, nonce);
  const decrypted = decryptChunk(ciphertext, key, nonce);
  
  if (plaintext.length !== decrypted.length) {
    throw new Error('Empty buffer handling failed');
  }
});

// Test 5: Large Data (1MB)
test('Encrypt and decrypt 1MB of data', () => {
  const key = generateKey();
  const nonce = generateNonce();
  const plaintext = Buffer.alloc(1024 * 1024, 'A');
  
  const start = Date.now();
  const ciphertext = encryptChunk(plaintext, key, nonce);
  const encryptTime = Date.now() - start;
  
  const start2 = Date.now();
  const decrypted = decryptChunk(ciphertext, key, nonce);
  const decryptTime = Date.now() - start2;
  
  console.log(`    Encrypt: ${encryptTime}ms, Decrypt: ${decryptTime}ms`);
  
  if (!plaintext.equals(decrypted)) {
    throw new Error('Large data roundtrip failed');
  }
});

// Test 6: Authentication (tampered data should fail)
test('Reject tampered ciphertext', () => {
  const key = generateKey();
  const nonce = generateNonce();
  const plaintext = Buffer.from('Secret message');
  
  const ciphertext = encryptChunk(plaintext, key, nonce);
  
  // Tamper with the ciphertext
  ciphertext[0] ^= 1;
  
  let didThrow = false;
  try {
    decryptChunk(ciphertext, key, nonce);
  } catch (err) {
    didThrow = true;
  }
  
  if (!didThrow) {
    throw new Error('Should have thrown on tampered data');
  }
});

// Test 7: Wrong Key Should Fail
test('Reject decryption with wrong key', () => {
  const key1 = generateKey();
  const key2 = generateKey();
  const nonce = generateNonce();
  const plaintext = Buffer.from('Secret');
  
  const ciphertext = encryptChunk(plaintext, key1, nonce);
  
  let didThrow = false;
  try {
    decryptChunk(ciphertext, key2, nonce);
  } catch (err) {
    didThrow = true;
  }
  
  if (!didThrow) {
    throw new Error('Should have thrown with wrong key');
  }
});

// Test 8: Basic Hashing
test('Hash data deterministically', () => {
  const data = Buffer.from('Test data');
  const hash1 = hashChunk(data);
  const hash2 = hashChunk(data);
  
  if (hash1.length !== 32) throw new Error(`Expected 32-byte hash, got ${hash1.length}`);
  if (!hash1.equals(hash2)) throw new Error('Hash not deterministic');
});

// Test 9: Different Data = Different Hash
test('Different data produces different hashes', () => {
  const data1 = Buffer.from('Data 1');
  const data2 = Buffer.from('Data 2');
  
  const hash1 = hashChunk(data1);
  const hash2 = hashChunk(data2);
  
  if (hash1.equals(hash2)) {
    throw new Error('Different data should produce different hashes');
  }
});

// Test 10: Keyed Hashing
test('Keyed hash (MAC)', () => {
  const data = Buffer.from('Message');
  const key = generateKey();
  
  const mac1 = hashChunkKeyed(data, key);
  const mac2 = hashChunkKeyed(data, key);
  
  if (mac1.length !== 32) throw new Error(`Expected 32-byte MAC, got ${mac1.length}`);
  if (!mac1.equals(mac2)) throw new Error('Keyed hash not deterministic');
});

// Test 11: Key Derivation
test('Derive key from password', () => {
  const password = 'my-secure-password';
  const salt = Buffer.from('random-salt-12345678901234567890');
  const context = 'clovalink-test';
  
  const key1 = deriveKey(password, salt, context);
  const key2 = deriveKey(password, salt, context);
  
  if (key1.length !== 32) throw new Error(`Expected 32-byte derived key, got ${key1.length}`);
  if (!key1.equals(key2)) throw new Error('Key derivation not deterministic');
});

// Test 12: Different Passwords = Different Keys
test('Different passwords produce different keys', () => {
  const salt = Buffer.from('salt');
  const context = 'test';
  
  const key1 = deriveKey('password1', salt, context);
  const key2 = deriveKey('password2', salt, context);
  
  if (key1.equals(key2)) {
    throw new Error('Different passwords should produce different keys');
  }
});

// Performance Benchmark
console.log('\n' + '='.repeat(50));
console.log('📊 Performance Benchmark\n');

const sizes = [
  { name: '1 KB', size: 1024 },
  { name: '10 KB', size: 10 * 1024 },
  { name: '100 KB', size: 100 * 1024 },
  { name: '1 MB', size: 1024 * 1024 },
  { name: '10 MB', size: 10 * 1024 * 1024 },
];

sizes.forEach(({ name, size }) => {
  const key = generateKey();
  const nonce = generateNonce();
  const data = Buffer.alloc(size);
  
  const encStart = Date.now();
  const encrypted = encryptChunk(data, key, nonce);
  const encTime = Date.now() - encStart;
  
  const decStart = Date.now();
  decryptChunk(encrypted, key, nonce);
  const decTime = Date.now() - decStart;
  
  const hashStart = Date.now();
  hashChunk(data);
  const hashTime = Date.now() - hashStart;
  
  const throughputEnc = ((size / 1024 / 1024) / (encTime / 1000)).toFixed(2);
  const throughputHash = ((size / 1024 / 1024) / (hashTime / 1000)).toFixed(2);
  
  console.log(`${name.padEnd(8)} Encrypt: ${encTime}ms (${throughputEnc} MB/s), Decrypt: ${decTime}ms, Hash: ${hashTime}ms (${throughputHash} MB/s)`);
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`\n✓ Passed: ${passed}`);
if (failed > 0) {
  console.log(`✗ Failed: ${failed}`);
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
}

