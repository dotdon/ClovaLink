import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { userHas2FA, is2FARequired } from '@/lib/twoFactor';

// Route segment config to prevent timeouts on fast navigation
// Short timeout for quick auth checks
export const maxDuration = 5;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isRequired = await is2FARequired(session.user.companyId);
    const has2FA = await userHas2FA(session.user.id);

    return NextResponse.json({
      required: isRequired,
      has2FA,
      needs2FA: isRequired && !has2FA,
    });
  } catch (error) {
    console.error('Error checking 2FA requirement:', error);
    return NextResponse.json(
      { error: 'Failed to check 2FA requirement' },
      { status: 500 }
    );
  }
}

