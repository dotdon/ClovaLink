import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPasskeyAuthentication, getOrigin, getRPID } from '@/lib/webauthn';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { response, challenge, userId } = body;

    // Validate required fields are present and not empty
    if (!response) {
      return NextResponse.json(
        { error: 'Authentication response is required' },
        { status: 400 }
      );
    }

    if (!challenge || typeof challenge !== 'string' || challenge.trim() === '') {
      return NextResponse.json(
        { error: 'Challenge is required' },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find the employee and their passkeys
    const employee = await prisma.employee.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find the passkey being used
    // response.id is already base64url encoded
    const credentialIdBase64 = response.id;
    const passkey = employee.passkeys.find(
      (pk) => {
        // Compare base64url encoded credential IDs
        try {
          const pkBuffer = Buffer.from(pk.credentialId, 'base64url');
          const responseBuffer = Buffer.from(credentialIdBase64, 'base64url');
          return pkBuffer.equals(responseBuffer);
        } catch {
          return pk.credentialId === credentialIdBase64;
        }
      }
    );

    if (!passkey) {
      return NextResponse.json(
        { error: 'Passkey not found' },
        { status: 404 }
      );
    }

    // Verify the authentication
    const verification = await verifyPasskeyAuthentication(
      response,
      challenge,
      getOrigin(),
      getRPID(),
      {
        credentialId: passkey.credentialId,
        publicKey: passkey.publicKey,
        counter: passkey.counter,
      }
    );

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Authentication verification failed' },
        { status: 400 }
      );
    }

    // Update passkey counter and last used timestamp
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: verification.newCounter,
        lastUsedAt: new Date(),
      },
    });

    // Return success with user info for NextAuth signin
    return NextResponse.json({
      success: true,
      userId: employee.id,
      email: employee.email,
      name: employee.name,
      role: employee.role,
      companyId: employee.companyId,
    });
  } catch (error: any) {
    console.error('Error verifying passkey authentication:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify authentication' },
      { status: 500 }
    );
  }
}

