import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { withApiMiddleware, defaultRateLimits } from '@/lib/apiMiddleware';
import { validateRequest, schemas } from '@/lib/validation';
import { successResponse, forbiddenResponse, validationErrorResponse, internalErrorResponse, errorResponse } from '@/lib/apiResponse';
import { z } from 'zod';

// Route segment config
export const maxDuration = 15;
export const dynamic = 'force-dynamic';

// Validation schema for creating an employee
const createEmployeeSchema = z.object({
  name: schemas.sanitizedString(1, 100),
  email: schemas.email,
  password: schemas.password,
  companyId: schemas.id,
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).optional().default('USER'),
});

async function handlePost(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!hasPermission(session!, Permission.CREATE_EMPLOYEES)) {
    return forbiddenResponse('You do not have permission to create employees');
  }

  // Validate request body
  const validation = await validateRequest(req, createEmployeeSchema);
  if (!validation.success) {
    return validationErrorResponse(validation.errors, 'Invalid employee data');
  }

  const { name, email, password, companyId, role } = validation.data;

  try {
    // Verify the company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return errorResponse('Company not found', 404);
    }

    // Only admins can create employees in any company
    // Managers can only create employees in their own company
    if (session!.user.role !== 'ADMIN' && session!.user.companyId !== companyId) {
      return forbiddenResponse('You can only create employees in your own company');
    }

    // Check if email is already in use
    const existingEmployee = await prisma.employee.findUnique({
      where: { email },
    });

    if (existingEmployee) {
      return errorResponse('Email already in use', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        companyId,
        mustChangePassword: true, // Force password change on first login
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company: {
          select: {
            name: true,
          },
        },
        createdAt: true,
      },
    });

    return successResponse({ employee }, 'Employee created successfully');
  } catch (error) {
    console.error('Error creating employee:', error);
    return internalErrorResponse('Failed to create employee');
  }
}

export const POST = withApiMiddleware(handlePost, {
  requireAuth: true,
  rateLimit: defaultRateLimits.write,
  allowedMethods: ['POST'],
});

async function handleGet(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!hasPermission(session!, Permission.VIEW_EMPLOYEES)) {
    return forbiddenResponse('You do not have permission to view employees');
  }

  try {
    // Build query based on user's role
    const where = session!.user.role === 'ADMIN'
      ? {} // Admins can see all employees
      : { companyId: session!.user.companyId }; // Others can only see employees in their company

    const employees = await prisma.employee.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        profilePicture: true,
        company: {
          select: {
            name: true,
          },
        },
        createdAt: true,
        totpEnabled: true,
        passkeys: {
          select: {
            id: true,
          },
        },
      },
    });

    const response = successResponse({ employees }, undefined, { total: employees.length });
    // Cache for 10 seconds to reduce API calls on employee list page
    response.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');
    return response;
  } catch (error) {
    console.error('Error fetching employees:', error);
    return internalErrorResponse('Failed to fetch employees');
  }
}

export const GET = withApiMiddleware(handleGet, {
  requireAuth: true,
  rateLimit: defaultRateLimits.read,
  allowedMethods: ['GET'],
}); 