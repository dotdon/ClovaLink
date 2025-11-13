import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Cache stats for 30 seconds to reduce database load
export const revalidate = 30;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to access stats
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get total counts
    const [
      totalCompanies,
      totalEmployees,
      totalDocuments,
      activeDownloadLinks,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.employee.count(),
      prisma.document.count(),
      prisma.downloadLink.count({
        where: {
          AND: [
            { expiresAt: { gt: new Date() } },
            { isActive: true }
          ]
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalCompanies,
        totalEmployees,
        totalDocuments,
        activeDownloadLinks,
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 