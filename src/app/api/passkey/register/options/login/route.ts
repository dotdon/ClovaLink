import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generatePasskeyRegistrationOptions } from '@/lib/webauthn';
import { compare } from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Validate required fields are present and not empty
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

    // Generate registration options
    const options = await generatePasskeyRegistrationOptions(
      employee.email,
      employee.name,
      employee.id
    );

    return NextResponse.json({
      options,
      challenge: options.challenge,
    });
  } catch (error) {
    console.error('Error generating passkey registration options:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    );
  }
}

