import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { verifyTOTP } from '@/lib/totp';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code, password } = body;

    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
    });

    if (!employee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!employee.totpEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      );
    }

    // Verify either TOTP code or password
    let verified = false;

    if (code) {
      // Verify TOTP code
      if (!employee.totpSecret) {
        return NextResponse.json(
          { error: 'TOTP secret not found' },
          { status: 400 }
        );
      }
      verified = verifyTOTP(employee.totpSecret, code);
    } else if (password) {
      // Verify password
      const { compare } = await import('bcryptjs');
      verified = await compare(password, employee.password);
    } else {
      return NextResponse.json(
        { error: 'Either TOTP code or password is required' },
        { status: 400 }
      );
    }

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid verification code or password' },
        { status: 400 }
      );
    }

    // Disable 2FA
    await prisma.employee.update({
      where: { id: session.user.id },
      data: {
        totpEnabled: false,
        totpSecret: null,
        backupCodes: [],
      },
    });

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled successfully',
    });
  } catch (error: any) {
    console.error('Error disabling TOTP:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}

