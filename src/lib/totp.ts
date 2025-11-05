import { TOTP, Secret } from 'otpauth';
import QRCode from 'qrcode';

export interface TOTPConfig {
  secret: string;
  issuer: string;
  user: string;
}

/**
 * Generate a new TOTP secret
 */
export function generateTOTPSecret(): string {
  // Generate a random secret using the Secret class
  const secret = new Secret();
  return secret.base32;
}

/**
 * Create a TOTP instance from a secret
 */
export function createTOTP(secret: string, issuer: string, user: string): TOTP {
  return new TOTP({
    issuer,
    label: user,
    secret: secret,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });
}

/**
 * Generate TOTP URI for QR code
 */
export function generateTOTPURI(secret: string, issuer: string, user: string): string {
  const totp = createTOTP(secret, issuer, user);
  return totp.toString();
}

/**
 * Generate QR code data URL for TOTP
 */
export async function generateTOTPQRCode(secret: string, issuer: string, user: string): Promise<string> {
  const uri = generateTOTPURI(secret, issuer, user);
  const qrCodeDataUrl = await QRCode.toDataURL(uri);
  return qrCodeDataUrl;
}

/**
 * Verify a TOTP code
 */
export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  try {
    const totp = new TOTP({
      secret: secret,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    // Verify the token with a time window (default 1 period = 30 seconds)
    return totp.validate({ token, window: [window] }) !== null;
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

/**
 * Generate backup codes for 2FA
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-digit backup codes
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    codes.push(code);
  }
  return codes;
}

