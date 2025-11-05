import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { verifyPasskeyRegistration, getOrigin, getRPID } from '@/lib/webauthn';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { response, challenge, deviceName } = body;

    if (!response || !challenge) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the registration
    const verification = await verifyPasskeyRegistration(
      response,
      challenge,
      getOrigin(),
      getRPID()
    );

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Registration verification failed' },
        { status: 400 }
      );
    }

    // Save the passkey to the database
    const passkey = await prisma.passkey.create({
      data: {
        credentialId: verification.credentialID,
        publicKey: verification.publicKey,
        counter: verification.counter,
        deviceName: deviceName || 'Unknown Device',
        employeeId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      passkey: {
        id: passkey.id,
        deviceName: passkey.deviceName,
        createdAt: passkey.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error verifying passkey registration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify registration' },
      { status: 500 }
    );
  }
}

