import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generatePasskeyAuthenticationOptions } from '@/lib/webauthn';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    // Validate email is present, not empty, and valid format
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Find employee by email
    const employee = await prisma.employee.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { passkeys: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (employee.passkeys.length === 0) {
      return NextResponse.json(
        { error: 'No passkeys registered for this user' },
        { status: 400 }
      );
    }

    // Generate authentication options
    const options = await generatePasskeyAuthenticationOptions(
      employee.passkeys.map((pk) => ({
        credentialId: pk.credentialId,
        counter: pk.counter,
      }))
    );

    return NextResponse.json({
      options,
      challenge: options.challenge,
      userId: employee.id,
    });
  } catch (error) {
    console.error('Error generating authentication options:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication options' },
      { status: 500 }
    );
  }
}

