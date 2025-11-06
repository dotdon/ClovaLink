import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Get cross-company access for an employee
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user has permission to view this employee's access
    // Users can view their own, admins can view anyone's, managers can view non-admin users
    const targetEmployee = await prisma.employee.findUnique({
      where: { id },
      select: { role: true, companyId: true },
    });

    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Permission checks
    const canView = 
      session.user.id === id || // User viewing their own
      session.user.role === 'ADMIN' || // Admins can view anyone
      (session.user.role === 'MANAGER' && targetEmployee.role !== 'ADMIN'); // Managers can view non-admins

    if (!canView) {
      // Return empty array instead of error - graceful degradation
      return NextResponse.json([]);
    }

    const access = await prisma.employeeCompanyAccess.findMany({
      where: { employeeId: id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        grantedAt: 'desc',
      },
    });

    return NextResponse.json(access);
  } catch (error) {
    console.error('[Cross-Company Access] Error fetching:', error);
    // Return empty array on error to prevent UI issues
    return NextResponse.json([]);
  }
}

// POST: Grant cross-company access
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get the target employee
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Permission checks:
    // - Admins can grant access to anyone for any company
    // - Managers can only grant access to non-managers/non-admins in their own company
    if (session.user.role === 'ADMIN') {
      // Admins can do anything
    } else if (session.user.role === 'MANAGER') {
      // Managers can only grant access to users (not other managers or admins)
      if (employee.role === 'ADMIN' || employee.role === 'MANAGER') {
        return NextResponse.json(
          { error: 'Managers cannot grant cross-company access to admins or other managers' },
          { status: 403 }
        );
      }
      // Manager can only grant access to companies they have access to
      const managerCompanies = await getEmployeeAccessibleCompanies(session.user.id);
      if (!managerCompanies.includes(companyId)) {
        return NextResponse.json(
          { error: 'You can only grant access to companies you have access to' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Prevent granting access to primary company
    if (employee.companyId === companyId) {
      return NextResponse.json(
        { error: 'Employee already has access to their primary company' },
        { status: 400 }
      );
    }

    // Check if access already exists
    const existingAccess = await prisma.employeeCompanyAccess.findUnique({
      where: {
        employeeId_companyId: {
          employeeId,
          companyId,
        },
      },
    });

    if (existingAccess) {
      return NextResponse.json(
        { error: 'Employee already has access to this company' },
        { status: 400 }
      );
    }

    // Grant access
    const access = await prisma.employeeCompanyAccess.create({
      data: {
        employeeId,
        companyId,
        grantedBy: session.user.id,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(access);
  } catch (error) {
    console.error('Error granting cross-company access:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Revoke cross-company access
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get the target employee
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Permission checks: same as POST
    if (session.user.role === 'ADMIN') {
      // Admins can do anything
    } else if (session.user.role === 'MANAGER') {
      if (employee.role === 'ADMIN' || employee.role === 'MANAGER') {
        return NextResponse.json(
          { error: 'Managers cannot revoke access for admins or other managers' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Revoke access
    await prisma.employeeCompanyAccess.delete({
      where: {
        employeeId_companyId: {
          employeeId,
          companyId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking cross-company access:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get all companies an employee has access to
async function getEmployeeAccessibleCompanies(employeeId: string): Promise<string[]> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      crossCompanyAccess: {
        select: {
          companyId: true,
        },
      },
    },
  });

  if (!employee) return [];

  const companies = [employee.companyId];
  employee.crossCompanyAccess.forEach((access) => {
    companies.push(access.companyId);
  });

  return companies;
}

