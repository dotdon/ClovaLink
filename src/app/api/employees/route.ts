import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { hasPermission, Permission, canAccessCompany } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

// Route segment config to prevent timeouts on fast navigation
// Shorter timeout to fail fast rather than hang
export const maxDuration = 15;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, Permission.CREATE_EMPLOYEES)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.email || !data.password || !data.companyId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the company exists and user has access
    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Only admins can create employees in any company
    // Managers can only create employees in their own company
    if (session.user.role !== 'ADMIN' && session.user.companyId !== data.companyId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Check if email is already in use
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: data.email },
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const employee = await prisma.employee.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role || 'USER',
        companyId: data.companyId,
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

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session, Permission.VIEW_EMPLOYEES)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Build query based on user's role
    const where = session.user.role === 'ADMIN'
      ? {} // Admins can see all employees
      : { companyId: session.user.companyId }; // Others can only see employees in their company

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

    const response = NextResponse.json(employees);
    // Cache for 10 seconds to reduce API calls on employee list page
    response.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');
    return response;
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 