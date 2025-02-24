import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { headers } from 'next/headers';

const prisma = new PrismaClient();

// Set to 3 days in milliseconds
const CLEANUP_THRESHOLD = 3 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    // Verify the request is authorized (you should replace this with your actual secret)
    const headersList = headers();
    const authHeader = headersList.get('authorization') || '';
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate the date threshold (3 days ago)
    const thresholdDate = new Date(Date.now() - CLEANUP_THRESHOLD);

    // Find used links older than 3 days
    const oldUsedLinks = await prisma.uploadLink.findMany({
      where: {
        AND: [
          { used: true },
          { createdAt: { lt: thresholdDate } }
        ]
      },
      select: {
        id: true,
        name: true,
        employeeId: true,
        employee: {
          select: {
            id: true,
            companyId: true
          }
        }
      }
    });

    // Delete the old links and create activity records
    for (const link of oldUsedLinks) {
      await prisma.$transaction([
        prisma.uploadLink.delete({
          where: { id: link.id }
        }),
        prisma.activity.create({
          data: {
            type: 'UPLOAD_LINK_AUTO_DELETED',
            description: link.name
              ? `Automatically deleted used upload link "${link.name}" after 3 days`
              : 'Automatically deleted used upload link after 3 days',
            employeeId: link.employeeId,
            companyId: link.employee.companyId,
          }
        })
      ]);
    }

    return NextResponse.json({
      success: true,
      deletedCount: oldUsedLinks.length,
      message: `Successfully cleaned up ${oldUsedLinks.length} old used upload links`
    });
  } catch (error) {
    console.error('Error cleaning up old upload links:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 