import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { verifyTOTP, generateBackupCodes } from '@/lib/totp';
import { hash } from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code, secret } = body;

    if (!code || !secret) {
      return NextResponse.json(
        { error: 'Code and secret are required' },
        { status: 400 }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid code format. Must be 6 digits.' },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = verifyTOTP(secret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code. Please try again.' },
        { status: 400 }
      );
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    
    // Hash backup codes before storing (for security)
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => hash(code, 10))
    );

    // Enable 2FA and save the secret
    await prisma.employee.update({
      where: { id: session.user.id },
      data: {
        totpSecret: secret,
        totpEnabled: true,
        backupCodes: hashedBackupCodes,
      },
    });

    // Return backup codes (this is the only time they'll be shown)
    return NextResponse.json({
      success: true,
      backupCodes, // Show these to the user - they won't be returned again
      message: '2FA has been enabled successfully. Please save your backup codes.',
    });
  } catch (error: any) {
    console.error('Error verifying TOTP:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enable 2FA' },
      { status: 500 }
    );
  }
}

