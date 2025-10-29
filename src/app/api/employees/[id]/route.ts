import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { hasPermission, Permission, canManageEmployee } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

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

    // Delete the employee
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