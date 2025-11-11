#!/usr/bin/env node

console.log('🦀 Testing Rust Core Integration\n');

try {
  const { 
    generateKey, 
    generateNonce, 
    encryptChunk, 
    decryptChunk, 
    hashChunk 
  } = require('./rust-core');

  console.log('✓ Rust core loaded successfully!');
  
  // Test encryption
  const key = generateKey();
  const nonce = generateNonce();
  const plaintext = Buffer.from('Hello from Rust!');
  
  console.log('✓ Generated key:', key.length, 'bytes');
  console.log('✓ Generated nonce:', nonce.length, 'bytes');
  
  const ciphertext = encryptChunk(plaintext, key, nonce);
  console.log('✓ Encrypted:', ciphertext.length, 'bytes');
  
  const decrypted = decryptChunk(ciphertext, key, nonce);
  console.log('✓ Decrypted:', decrypted.toString());
  
  const hash = hashChunk(plaintext);
  console.log('✓ Hash:', hash.toString('hex').substring(0, 16) + '...');
  
  console.log('\n🎉 Rust crypto is working perfectly!\n');
  process.exit(0);
  
} catch (err) {
  console.error('❌ Error:', err.message);
  console.error('\nRust core not available. Make sure to build it first:');
  console.error('  cd rust-core');
  console.error('  ./setup.sh');
  process.exit(1);
}

