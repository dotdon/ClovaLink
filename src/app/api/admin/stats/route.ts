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

    // Get total counts with additional metrics
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Generate last 7 days for chart data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    const [
      totalCompanies,
      totalEmployees,
      totalDocuments,
      activeDownloadLinks,
      totalFolders,
      recentDocuments,
      documentsLast30Days,
      activeUsers,
      documentsByDay,
      employeesByDay,
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
      prisma.folder.count(),
      prisma.document.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      }),
      prisma.document.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.employee.count({
        where: {
          isActive: true,
        },
      }),
      // Get document counts per day for last 7 days
      Promise.all(
        last7Days.map(async (date) => {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          const count = await prisma.document.count({
            where: {
              createdAt: {
                gte: date,
                lt: nextDay,
              },
            },
          });
          return {
            date: date.toISOString().split('T')[0],
            count,
          };
        })
      ),
      // Get employee counts per day for last 7 days
      Promise.all(
        last7Days.map(async (date) => {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          const count = await prisma.employee.count({
            where: {
              createdAt: {
                gte: date,
                lt: nextDay,
              },
            },
          });
          return {
            date: date.toISOString().split('T')[0],
            count,
          };
        })
      ),
    ]);

    return NextResponse.json({
      stats: {
        totalCompanies,
        totalEmployees,
        totalDocuments,
        activeDownloadLinks,
        totalFolders,
        recentDocuments,
        documentsLast30Days,
        activeUsers,
        chartData: {
          documents: documentsByDay,
          employees: employeesByDay,
        },
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 