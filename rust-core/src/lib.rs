use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    XChaCha20Poly1305, XNonce,
};
use blake3::Hasher;
use napi::bindgen_prelude::*;
use napi_derive::napi;

/// Generate a random 32-byte key for encryption
#[napi]
pub fn generate_key() -> Buffer {
    let key = XChaCha20Poly1305::generate_key(&mut OsRng);
    Buffer::from(key.as_slice())
}

/// Generate a random 24-byte nonce for XChaCha20-Poly1305
#[napi]
pub fn generate_nonce() -> Buffer {
    let nonce = XChaCha20Poly1305::generate_nonce(&mut OsRng);
    Buffer::from(nonce.as_slice())
}

/// Encrypt a data chunk using XChaCha20-Poly1305
/// 
/// # Arguments
/// * `data` - The plaintext data to encrypt
/// * `key` - 32-byte encryption key
/// * `nonce` - 24-byte nonce (must be unique for each encryption with the same key)
/// 
/// # Returns
/// Encrypted data (ciphertext + 16-byte authentication tag)
#[napi]
pub fn encrypt_chunk(data: Buffer, key: Buffer, nonce: Buffer) -> Result<Buffer> {
    // Validate input sizes
    if key.len() != 32 {
        return Err(Error::new(
            Status::InvalidArg,
            "Key must be exactly 32 bytes",
        ));
    }
    if nonce.len() != 24 {
        return Err(Error::new(
            Status::InvalidArg,
            "Nonce must be exactly 24 bytes",
        ));
    }

    // Create cipher
    let key_array: [u8; 32] = key
        .as_ref()
        .try_into()
        .map_err(|_| Error::new(Status::InvalidArg, "Invalid key format"))?;
    
    let cipher = XChaCha20Poly1305::new(&key_array.into());

    // Create nonce
    let nonce_array: [u8; 24] = nonce
        .as_ref()
        .try_into()
        .map_err(|_| Error::new(Status::InvalidArg, "Invalid nonce format"))?;
    let xnonce = XNonce::from(nonce_array);

    // Encrypt
    let ciphertext = cipher
        .encrypt(&xnonce, data.as_ref())
        .map_err(|e| Error::new(Status::GenericFailure, format!("Encryption failed: {}", e)))?;

    Ok(Buffer::from(ciphertext))
}

/// Decrypt a data chunk using XChaCha20-Poly1305
/// 
/// # Arguments
/// * `data` - The encrypted data (ciphertext + auth tag)
/// * `key` - 32-byte encryption key (same as used for encryption)
/// * `nonce` - 24-byte nonce (same as used for encryption)
/// 
/// # Returns
/// Decrypted plaintext data
#[napi]
pub fn decrypt_chunk(data: Buffer, key: Buffer, nonce: Buffer) -> Result<Buffer> {
    // Validate input sizes
    if key.len() != 32 {
        return Err(Error::new(
            Status::InvalidArg,
            "Key must be exactly 32 bytes",
        ));
    }
    if nonce.len() != 24 {
        return Err(Error::new(
            Status::InvalidArg,
            "Nonce must be exactly 24 bytes",
        ));
    }

    // Create cipher
    let key_array: [u8; 32] = key
        .as_ref()
        .try_into()
        .map_err(|_| Error::new(Status::InvalidArg, "Invalid key format"))?;
    
    let cipher = XChaCha20Poly1305::new(&key_array.into());

    // Create nonce
    let nonce_array: [u8; 24] = nonce
        .as_ref()
        .try_into()
        .map_err(|_| Error::new(Status::InvalidArg, "Invalid nonce format"))?;
    let xnonce = XNonce::from(nonce_array);

    // Decrypt
    let plaintext = cipher
        .decrypt(&xnonce, data.as_ref())
        .map_err(|e| Error::new(Status::GenericFailure, format!("Decryption failed: {}", e)))?;

    Ok(Buffer::from(plaintext))
}

/// Hash a data chunk using BLAKE3
/// 
/// # Arguments
/// * `data` - The data to hash
/// 
/// # Returns
/// 32-byte hash digest
#[napi]
pub fn hash_chunk(data: Buffer) -> Buffer {
    let mut hasher = Hasher::new();
    hasher.update(data.as_ref());
    let hash = hasher.finalize();
    Buffer::from(hash.as_bytes().to_vec())
}

/// Hash a data chunk with a key (keyed hash / MAC)
/// 
/// # Arguments
/// * `data` - The data to hash
/// * `key` - 32-byte key for keyed hashing
/// 
/// # Returns
/// 32-byte keyed hash
#[napi]
pub fn hash_chunk_keyed(data: Buffer, key: Buffer) -> Result<Buffer> {
    if key.len() != 32 {
        return Err(Error::new(
            Status::InvalidArg,
            "Key must be exactly 32 bytes",
        ));
    }

    let key_array: [u8; 32] = key
        .as_ref()
        .try_into()
        .map_err(|_| Error::new(Status::InvalidArg, "Invalid key format"))?;

    let mut hasher = Hasher::new_keyed(&key_array);
    hasher.update(data.as_ref());
    let hash = hasher.finalize();
    Ok(Buffer::from(hash.as_bytes().to_vec()))
}

/// Derive a key from a password using BLAKE3 KDF
/// 
/// # Arguments
/// * `password` - The password to derive from
/// * `salt` - Salt for key derivation
/// * `context` - Context string for domain separation
/// 
/// # Returns
/// 32-byte derived key
#[napi]
pub fn derive_key(password: String, salt: Buffer, context: String) -> Buffer {
    let mut hasher = Hasher::new_derive_key(&context);
    hasher.update(salt.as_ref());
    hasher.update(password.as_bytes());
    let hash = hasher.finalize();
    Buffer::from(hash.as_bytes().to_vec())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let data = Buffer::from(b"Hello, World!".to_vec());
        let key = generate_key();
        let nonce = generate_nonce();

        let encrypted = encrypt_chunk(data.clone(), key.clone(), nonce.clone()).unwrap();
        let decrypted = decrypt_chunk(encrypted, key, nonce).unwrap();

        assert_eq!(data.as_ref(), decrypted.as_ref());
    }

    #[test]
    fn test_hash_deterministic() {
        let data = Buffer::from(b"Test data".to_vec());
        let hash1 = hash_chunk(data.clone());
        let hash2 = hash_chunk(data);

        assert_eq!(hash1.as_ref(), hash2.as_ref());
        assert_eq!(hash1.len(), 32);
    }

    #[test]
    fn test_keyed_hash() {
        let data = Buffer::from(b"Test data".to_vec());
        let key = generate_key();
        
        let hash1 = hash_chunk_keyed(data.clone(), key.clone()).unwrap();
        let hash2 = hash_chunk_keyed(data, key).unwrap();

        assert_eq!(hash1.as_ref(), hash2.as_ref());
        assert_eq!(hash1.len(), 32);
    }
}

