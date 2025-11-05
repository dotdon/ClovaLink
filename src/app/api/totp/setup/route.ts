import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateTOTPSecret, generateTOTPQRCode } from '@/lib/totp';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
    });

    if (!employee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate a new TOTP secret
    const secret = generateTOTPSecret();

    // Generate QR code
    const issuer = 'ClovaLink';
    const qrCodeDataUrl = await generateTOTPQRCode(
      secret,
      issuer,
      employee.email
    );

    // Store the secret temporarily (user needs to verify before enabling)
    // We'll update the database after verification
    // For now, return the secret and QR code
    // Note: In production, you might want to store this temporarily in Redis or session

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
      manualEntryKey: secret, // For manual entry
    });
  } catch (error) {
    console.error('Error setting up TOTP:', error);
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}

