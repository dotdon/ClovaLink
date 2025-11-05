import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPasskeyRegistration, getOrigin, getRPID } from '@/lib/webauthn';
import { compare } from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { response, challenge, email, password, deviceName } = body;

    // Validate required fields are present and not empty
    if (!response) {
      return NextResponse.json(
        { error: 'Registration response is required' },
        { status: 400 }
      );
    }

    if (!challenge || typeof challenge !== 'string' || challenge.trim() === '') {
      return NextResponse.json(
        { error: 'Challenge is required' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.trim() === '') {
      return NextResponse.json(
        { error: 'Password is required' },
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

    // Verify user exists and password is correct
    const employee = await prisma.employee.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await compare(password, employee.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
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
    await prisma.passkey.create({
      data: {
        credentialId: verification.credentialID,
        publicKey: verification.publicKey,
        counter: verification.counter,
        deviceName: deviceName || 'Login Device',
        employeeId: employee.id,
      },
    });

    return NextResponse.json({
      success: true,
      email: employee.email,
      userId: employee.id,
    });
  } catch (error: any) {
    console.error('Error verifying passkey registration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify registration' },
      { status: 500 }
    );
  }
}

