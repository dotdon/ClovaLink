import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyAuthenticationResponseOpts,
  AuthenticatorDevice,
  PublicKeyCredentialRequestOptionsJSON,
  PublicKeyCredentialCreationOptionsJSON,
} from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/types';

// Get the origin from environment or use localhost for development
export function getOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

// Get the RP ID (relying party identifier)
export function getRPID(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  const url = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000');
  return url.hostname;
}

// Convert stored device to AuthenticatorDevice format
export function convertPasskeyToDevice(passkey: {
  credentialId: string;
  publicKey: string;
  counter: number;
}): AuthenticatorDevice {
  return {
    credentialID: Buffer.from(passkey.credentialId, 'base64url'),
    credentialPublicKey: Buffer.from(passkey.publicKey, 'base64'),
    counter: passkey.counter,
    transports: ['usb', 'nfc', 'ble', 'internal'] as AuthenticatorTransportFuture[],
  };
}

// Generate registration options for a new passkey
export async function generatePasskeyRegistrationOptions(
  email: string,
  userName: string,
  userId: string
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const opts: GenerateRegistrationOptionsOpts = {
    rpName: 'ClovaLink',
    rpID: getRPID(),
    userID: userId,
    userName: email,
    userDisplayName: userName,
    timeout: 60000,
    attestationType: 'none',
    excludeCredentials: [], // We'll add existing passkeys here if needed
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Prefer platform authenticators (iOS Face ID/Touch ID)
      userVerification: 'required',
      requireResidentKey: true,
    },
    supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
  };

  return await generateRegistrationOptions(opts);
}

// Verify registration response
export async function verifyPasskeyRegistration(
  response: any,
  expectedChallenge: string,
  expectedOrigin: string,
  expectedRPID: string
): Promise<{ verified: boolean; credentialID: string; publicKey: string; counter: number }> {
  const opts: VerifyRegistrationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin,
    expectedRPID,
    requireUserVerification: true,
  };

  const verification = await verifyRegistrationResponse(opts);

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Passkey registration verification failed');
  }

  return {
    verified: true,
    credentialID: Buffer.from(verification.registrationInfo.credentialID).toString('base64url'),
    publicKey: Buffer.from(verification.registrationInfo.credentialPublicKey).toString('base64'),
    counter: verification.registrationInfo.counter,
  };
}

// Generate authentication options
export async function generatePasskeyAuthenticationOptions(
  passkeys: Array<{
    credentialId: string;
    counter: number;
  }>
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const opts: GenerateAuthenticationOptionsOpts = {
    rpID: getRPID(),
    timeout: 60000,
    allowCredentials: passkeys.map((pk) => ({
      id: Buffer.from(pk.credentialId, 'base64url'),
      type: 'public-key' as const,
      transports: ['usb', 'nfc', 'ble', 'internal'] as AuthenticatorTransportFuture[],
    })),
    userVerification: 'required',
  };

  return await generateAuthenticationOptions(opts);
}

// Verify authentication response
export async function verifyPasskeyAuthentication(
  response: any,
  expectedChallenge: string,
  expectedOrigin: string,
  expectedRPID: string,
  passkey: {
    credentialId: string;
    publicKey: string;
    counter: number;
  }
): Promise<{ verified: boolean; newCounter: number }> {
  const device = convertPasskeyToDevice(passkey);

  const opts: VerifyAuthenticationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin,
    expectedRPID,
    authenticator: device,
    requireUserVerification: true,
  };

  const verification = await verifyAuthenticationResponse(opts);

  if (!verification.verified) {
    throw new Error('Passkey authentication verification failed');
  }

  return {
    verified: true,
    newCounter: verification.authenticationInfo.newCounter,
  };
}

