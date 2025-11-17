import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getSetting } from '@/lib/settings';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN can trigger cleanup
    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!employee || employee.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Only Super Admins can trigger cleanup' }, { status: 403 });
    }

    // Get retention setting (in days)
    const retentionDaysStr = await getSetting('login_activity_retention_days', 'LOGIN_ACTIVITY_RETENTION_DAYS', '90');
    const retentionDays = parseInt(retentionDaysStr);

    // If retention is 0, never delete
    if (retentionDays === 0) {
      return NextResponse.json({ 
        message: 'Auto-delete is disabled (retention set to 0)', 
        deleted: 0 
      });
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Delete old login activities
    const result = await prisma.loginActivity.deleteMany({
      where: {
        loginAt: {
          lt: cutoffDate,
        },
        // Don't delete suspicious logins that are recent (keep for 180 days minimum)
        NOT: {
          AND: [
            { suspicious: true },
            { 
              loginAt: {
                gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
              }
            }
          ]
        }
      },
    });

    return NextResponse.json({ 
      message: `Deleted login activities older than ${retentionDays} days`,
      deleted: result.count,
      cutoffDate: cutoffDate.toISOString(),
    });
  } catch (error) {
    console.error('Error cleaning up login activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to preview what would be deleted
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only IT and SUPER_ADMIN can view cleanup preview
    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!employee || (employee.role !== 'SUPER_ADMIN' && employee.role !== 'IT')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get retention setting
    const retentionDaysStr = await getSetting('login_activity_retention_days', 'LOGIN_ACTIVITY_RETENTION_DAYS', '90');
    const retentionDays = parseInt(retentionDaysStr);

    if (retentionDays === 0) {
      return NextResponse.json({ 
        retentionDays: 0,
        message: 'Auto-delete is disabled',
        count: 0 
      });
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Count activities that would be deleted
    const count = await prisma.loginActivity.count({
      where: {
        loginAt: {
          lt: cutoffDate,
        },
        NOT: {
          AND: [
            { suspicious: true },
            { 
              loginAt: {
                gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
              }
            }
          ]
        }
      },
    });

    return NextResponse.json({ 
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      count,
      message: `${count} login activities would be deleted`
    });
  } catch (error) {
    console.error('Error previewing cleanup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

