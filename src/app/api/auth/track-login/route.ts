import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notifyLogin, detectAndNotifySuspiciousLogin } from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get IP address from request
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwarded?.split(',')[0]?.trim() || realIp || request.ip || 'Unknown';

    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Get location from IP (non-blocking - if it fails, we'll use "Unknown")
    let location = 'Unknown';
    if (ipAddress && ipAddress !== 'Unknown' && !ipAddress.startsWith('127.') && !ipAddress.startsWith('192.168.') && !ipAddress.startsWith('10.')) {
      try {
        // Use free IP geolocation API (ip-api.com - no API key required for basic usage)
        const geoResponse = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,message,city,country`, {
          signal: AbortSignal.timeout(2000), // 2 second timeout
        });
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData.status === 'success' && geoData.city && geoData.country) {
            location = `${geoData.city}, ${geoData.country}`;
          } else if (geoData.status === 'success' && geoData.country) {
            location = geoData.country;
          }
        }
      } catch (error) {
        // Silently fail - location detection is optional
        // IP might be local/private, or API might be down
      }
    }

    // Find the most recent login activity for this user (created in auth.ts)
    const recentLogin = await prisma.loginActivity.findFirst({
      where: {
        employeeId: session.user.id,
        success: true,
        ipAddress: null, // Find the one we just created without IP
      },
      orderBy: {
        loginAt: 'desc',
      },
    });

    if (recentLogin) {
      // Update with IP, location, and user agent
      await prisma.loginActivity.update({
        where: { id: recentLogin.id },
        data: {
          ipAddress,
          location,
          userAgent,
        },
      });

      // Update employee last login info
      await prisma.employee.update({
        where: { id: session.user.id },
        data: {
          lastLoginIp: ipAddress,
          lastLoginLocation: location,
        },
      });

      // Send login notification email (fire and forget)
      notifyLogin(session.user.id, ipAddress, location, userAgent).catch(err => {
        console.error('Failed to send login notification email:', err);
      });

      // Check for suspicious login and send alert if needed (fire and forget)
      // Pass the loginActivityId so we can mark it as suspicious in the database
      detectAndNotifySuspiciousLogin(session.user.id, ipAddress, location, userAgent, recentLogin.id).catch(err => {
        console.error('Failed to check suspicious login:', err);
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking login:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

