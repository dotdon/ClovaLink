import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import { withApiMiddleware, defaultRateLimits } from '@/lib/apiMiddleware';
import { successResponse, errorResponse, internalErrorResponse } from '@/lib/apiResponse';

export const revalidate = 15;

async function handleGet(req: NextRequest) {
  const session = await getServerSession(authOptions);

  try {
    // Get the employee with their company info
    const employee = await prisma.employee.findUnique({
      where: { id: session!.user.id },
      select: {
        id: true,
        companyId: true,
        role: true,
      },
    });

    if (!employee) {
      return errorResponse('Employee not found', 404);
    }

    // Parse pagination parameters from URL
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100); // Cap at 100
    const skip = (page - 1) * limit;
    const documentId = searchParams.get('documentId');
    const folderId = searchParams.get('folderId');

    // Build where clause based on role and filters
    let where: any = session!.user.role === 'ADMIN'
      ? {} // Admins can see all activities
      : { companyId: employee.companyId }; // Others only see their company's activities

    // Add document or folder filter if provided
    if (documentId) {
      where.documentId = documentId;
    } else if (folderId) {
      where.folderId = folderId;
    }

    // Fetch activities with pagination and total count
    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        take: limit,
        skip: skip,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          employee: {
            select: {
              name: true,
            },
          },
          document: {
            select: {
              name: true,
            },
          },
          folder: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.activity.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    // Return in old format for backward compatibility
    return successResponse(
      { 
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore,
        }
      }
    );
  } catch (error) {
    console.error('Error fetching activities:', error);
    return internalErrorResponse('Failed to fetch activities');
  }
}

export const GET = withApiMiddleware(handleGet, {
  requireAuth: true,
  rateLimit: defaultRateLimits.read,
  allowedMethods: ['GET'],
}); 