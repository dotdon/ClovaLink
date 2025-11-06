import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { hasPermission, Permission, canManageEmployee } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

// GET: Get a single employee by ID
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

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        profilePicture: true,
        totpEnabled: true,
        createdAt: true,
        updatedAt: true,
        passkeys: {
          select: {
            id: true,
          },
        },
        crossCompanyAccess: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check permissions - users can see their own data or employees in their company
    if (session.user.role !== 'ADMIN' && 
        session.user.id !== id && 
        session.user.companyId !== employee.companyId) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const response = NextResponse.json(employee);
    // Cache for 30 seconds to reduce API calls
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.email || !data.role || !data.companyId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the target employee
    const targetEmployee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!targetEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to manage this employee
    if (!canManageEmployee(session, targetEmployee)) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Verify the company exists
    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Only admins can move employees between companies
    if (data.companyId !== targetEmployee.companyId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can move employees between companies' },
        { status: 403 }
      );
    }

    // Only admins can change roles to ADMIN
    if (data.role === 'ADMIN' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can create admin users' },
        { status: 403 }
      );
    }

    // Check if email is already in use by another employee
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        email: data.email,
        NOT: {
          id,
        },
      },
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      name: data.name,
      email: data.email,
      role: data.role,
      companyId: data.companyId,
    };

    // Only update password if provided
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
      // Force password change when admin sets/resets password
      updateData.mustChangePassword = true;
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
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
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to manage this employee
    if (!canManageEmployee(session, employee)) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Prevent deleting the last admin
    const adminCount = await prisma.employee.count({
      where: {
        role: 'ADMIN',
      },
    });

    if (adminCount === 1 && employee.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete the last admin user' },
        { status: 400 }
      );
    }

    // Delete related records first to avoid foreign key constraints
    // Delete activities (preserve audit trail by keeping them but removing employee reference)
    // Since employeeId is required, we need to delete activities
    await prisma.activity.deleteMany({
      where: { employeeId: id },
    });

    // Delete passkeys (already has onDelete: Cascade, but doing it explicitly for clarity)
    await prisma.passkey.deleteMany({
      where: { employeeId: id },
    });

    // Delete upload links
    await prisma.uploadLink.deleteMany({
      where: { employeeId: id },
    });

    // Delete download links created by this employee
    await prisma.downloadLink.deleteMany({
      where: { createdById: id },
    });

    // Reassign folders and documents to company admin/manager to preserve them
    // Try to find an admin or manager in the same company
    const companyAdmin = await prisma.employee.findFirst({
      where: {
        companyId: employee.companyId,
        role: { in: ['ADMIN', 'MANAGER'] },
        id: { not: id }, // Don't reassign to the employee being deleted
      },
    });

    if (companyAdmin) {
      // Reassign folders created by this employee to company admin/manager
      await prisma.folder.updateMany({
        where: { createdById: id },
        data: { createdById: companyAdmin.id },
      });

      // Reassign documents to company admin/manager
      await prisma.document.updateMany({
        where: { employeeId: id },
        data: { employeeId: companyAdmin.id },
      });
    } else {
      // No admin/manager available - this should be rare
      // For folders: try to find any employee in the company
      const anyCompanyEmployee = await prisma.employee.findFirst({
        where: {
          companyId: employee.companyId,
          id: { not: id },
        },
      });

      if (anyCompanyEmployee) {
        // Reassign to any company employee as fallback
        await prisma.folder.updateMany({
          where: { createdById: id },
          data: { createdById: anyCompanyEmployee.id },
        });

        await prisma.document.updateMany({
          where: { employeeId: id },
          data: { employeeId: anyCompanyEmployee.id },
        });
      } else {
        // Last resort: delete folders and documents if no one to reassign to
        // This should only happen if deleting the last employee in a company
        await prisma.folder.deleteMany({
          where: { createdById: id },
        });

        await prisma.document.deleteMany({
          where: { employeeId: id },
        });
      }
    }

    // Finally, delete the employee
    await prisma.employee.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the target employee
    const targetEmployee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if user has permission to manage this employee
    if (!canManageEmployee(session, targetEmployee)) {
      return NextResponse.json({ error: 'Permission denied to manage this employee' }, { status: 403 });
    }

    const data = await request.json();
    
    // Prevent managers from changing employee roles to ADMIN
    if (session.user.role === 'MANAGER' && data.role === 'ADMIN') {
      return NextResponse.json({ error: 'Managers cannot promote employees to admin role' }, { status: 403 });
    }

    // Update employee
    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        updatedAt: new Date()
      }
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'UPDATE',
        description: `Updated employee: ${updatedEmployee.name}`,
        employeeId: session.user.id,
        companyId: session.user.companyId,
        metadata: {
          updatedFields: Object.keys(data)
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedEmployee
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 