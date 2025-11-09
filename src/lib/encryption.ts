// End-to-End Encryption using Web Crypto API
// Similar to WhatsApp/Telegram encryption

const ALGORITHM = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

const AES_ALGORITHM = {
  name: 'AES-GCM',
  length: 256,
};

// Generate RSA key pair for a user
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      ALGORITHM,
      true, // extractable
      ['encrypt', 'decrypt']
    );

    // Export keys to store
    const publicKeyExport = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKeyExport = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    // Convert to base64 for storage
    const publicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyExport)));
    const privateKey = btoa(String.fromCharCode(...new Uint8Array(privateKeyExport)));

    return { publicKey, privateKey };
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw error;
  }
}

// Import public key from base64 string
async function importPublicKey(publicKeyStr: string): Promise<CryptoKey> {
  const publicKeyData = Uint8Array.from(atob(publicKeyStr), c => c.charCodeAt(0));
  
  return await window.crypto.subtle.importKey(
    'spki',
    publicKeyData,
    ALGORITHM,
    true,
    ['encrypt']
  );
}

// Import private key from base64 string
async function importPrivateKey(privateKeyStr: string): Promise<CryptoKey> {
  const privateKeyData = Uint8Array.from(atob(privateKeyStr), c => c.charCodeAt(0));
  
  return await window.crypto.subtle.importKey(
    'pkcs8',
    privateKeyData,
    ALGORITHM,
    true,
    ['decrypt']
  );
}

// Generate a random AES key for symmetric encryption
async function generateAESKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    AES_ALGORITHM,
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt message content using AES
async function encryptWithAES(content: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  
  // Generate random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
  };
}

// Decrypt message content using AES
async function decryptWithAES(encryptedContent: string, key: CryptoKey, ivStr: string): Promise<string> {
  const encryptedData = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivStr), c => c.charCodeAt(0));
  
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// Encrypt AES key with recipient's public key
async function encryptAESKey(aesKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
  const exportedKey = await window.crypto.subtle.exportKey('raw', aesKey);
  
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    publicKey,
    exportedKey
  );

  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

// Decrypt AES key with private key
async function decryptAESKey(encryptedKey: string, privateKey: CryptoKey): Promise<CryptoKey> {
  const encryptedData = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
  
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
    },
    privateKey,
    encryptedData
  );

  return await window.crypto.subtle.importKey(
    'raw',
    decrypted,
    AES_ALGORITHM,
    true,
    ['encrypt', 'decrypt']
  );
}

// Main encryption function for sending messages
export async function encryptMessage(
  content: string,
  recipientPublicKey: string
): Promise<{ encryptedContent: string; encryptedKey: string; iv: string }> {
  try {
    // Generate a random AES key for this message
    const aesKey = await generateAESKey();
    
    // Encrypt the message content with AES
    const { encrypted, iv } = await encryptWithAES(content, aesKey);
    
    // Import recipient's public key
    const publicKey = await importPublicKey(recipientPublicKey);
    
    // Encrypt the AES key with recipient's public key
    const encryptedKey = await encryptAESKey(aesKey, publicKey);

    return {
      encryptedContent: encrypted,
      encryptedKey: encryptedKey,
      iv: iv,
    };
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw error;
  }
}

// Main decryption function for receiving messages
export async function decryptMessage(
  encryptedContent: string,
  encryptedKey: string,
  iv: string,
  userPrivateKey: string
): Promise<string> {
  try {
    // Import user's private key
    const privateKey = await importPrivateKey(userPrivateKey);
    
    // Decrypt the AES key
    const aesKey = await decryptAESKey(encryptedKey, privateKey);
    
    // Decrypt the message content
    const content = await decryptWithAES(encryptedContent, aesKey, iv);

    return content;
  } catch (error) {
    console.error('Error decrypting message:', error);
    return '[Decryption failed - message may be corrupted]';
  }
}

// Store keys in localStorage (in production, use more secure storage)
export function storePrivateKey(userId: string, privateKey: string): void {
  localStorage.setItem(`privateKey_${userId}`, privateKey);
}

export function getPrivateKey(userId: string): string | null {
  return localStorage.getItem(`privateKey_${userId}`);
}

export function clearPrivateKey(userId: string): void {
  localStorage.removeItem(`privateKey_${userId}`);
}

// Check if Web Crypto API is available
export function isEncryptionAvailable(): boolean {
  return typeof window !== 'undefined' && 
         window.crypto && 
         window.crypto.subtle !== undefined;
}

