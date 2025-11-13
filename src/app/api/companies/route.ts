import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { withApiMiddleware, defaultRateLimits } from '@/lib/apiMiddleware';
import { validateRequest, schemas } from '@/lib/validation';
import { successResponse, internalErrorResponse, forbiddenResponse, validationErrorResponse } from '@/lib/apiResponse';
import { z } from 'zod';

// Route segment config to prevent timeouts on fast navigation
export const maxDuration = 15;
export const dynamic = 'force-dynamic';

// Validation schema for creating a company
const createCompanySchema = z.object({
  name: schemas.companyName,
});

async function handlePost(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Permission check
  if (!hasPermission(session!, Permission.CREATE_COMPANIES)) {
    return forbiddenResponse('You do not have permission to create companies');
  }

  // Validate request body
  const validation = await validateRequest(req, createCompanySchema);
  
  if (!validation.success) {
    return validationErrorResponse(validation.errors, 'Invalid company data');
  }

  const { name } = validation.data as { name: string };

  try {
    const company = await prisma.company.create({
      data: {
        name,
      },
      include: {
        _count: {
          select: {
            employees: true,
            documents: true,
          },
        },
      },
    });

    return successResponse({ company }, 'Company created successfully');
  } catch (error) {
    console.error('Error creating company:', error);
    return internalErrorResponse('Failed to create company');
  }
}

export const POST = withApiMiddleware(handlePost, {
  requireAuth: true,
  requireRole: 'ADMIN', // Only admins can create companies
  rateLimit: defaultRateLimits.write,
  allowedMethods: ['POST'],
});

async function handleGet(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Permission check
  if (!hasPermission(session!, Permission.VIEW_COMPANIES)) {
    return forbiddenResponse('You do not have permission to view companies');
  }

  try {
    // Build query based on user role
    const where = session!.user.role === 'ADMIN' 
      ? {} // Admins can see all companies
      : { id: session!.user.companyId }; // Others can only see their own company

    const companies = await prisma.company.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            employees: true,
            documents: true,
          },
        },
      },
    });

    // Calculate storage usage for each company
    const companiesWithStorage = await Promise.all(
      companies.map(async (company) => {
        const storageResult = await prisma.document.aggregate({
          where: {
            companyId: company.id,
          },
          _sum: {
            size: true,
          },
        });

        return {
          ...company,
          storageUsed: storageResult._sum.size || 0,
        };
      })
    );

    return successResponse(
      { companies: companiesWithStorage },
      undefined,
      { total: companiesWithStorage.length }
    );
  } catch (error) {
    console.error('Error fetching companies:', error);
    return internalErrorResponse('Failed to fetch companies');
  }
}

export const GET = withApiMiddleware(handleGet, {
  requireAuth: true,
  rateLimit: defaultRateLimits.read,
  allowedMethods: ['GET'],
}); 