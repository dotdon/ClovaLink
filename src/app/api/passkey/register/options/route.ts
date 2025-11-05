import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generatePasskeyRegistrationOptions, getOrigin, getRPID } from '@/lib/webauthn';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      include: { passkeys: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate registration options
    const options = await generatePasskeyRegistrationOptions(
      employee.email,
      employee.name,
      employee.id
    );

    // Store challenge in session or database (simplified - using a temp store)
    // In production, use Redis or a proper session store
    const challenge = options.challenge;
    
    // Store challenge temporarily (you might want to use a cache like Redis)
    // For now, we'll return it and the client will send it back
    // In production, store in session/cache with expiration

    return NextResponse.json({
      options,
      challenge,
    });
  } catch (error) {
    console.error('Error generating passkey registration options:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    );
  }
}

