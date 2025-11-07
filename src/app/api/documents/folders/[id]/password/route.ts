import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

// POST /api/documents/folders/[id]/password - Set or change folder password (Manager only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and admins can set passwords
    if (session.user.role !== 'MANAGER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Only managers and admins can set folder passwords' 
      }, { status: 403 });
    }

    const { password } = await request.json();

    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Password is required' 
      }, { status: 400 });
    }

    // Find the folder
    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        company: true,
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Verify the employee belongs to the same company
    const employee = await prisma.employee.findFirst({
      where: {
        email: session.user.email,
      },
      include: {
        company: true,
        crossCompanyAccess: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if user has access to this company
    const hasAccess = 
      employee.company.id === folder.companyId ||
      employee.crossCompanyAccess.some(access => access.companyId === folder.companyId);

    if (!hasAccess) {
      return NextResponse.json({ 
        error: 'You do not have access to this folder' 
      }, { status: 403 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Setting password for folder:', {
      folderId: id,
      folderName: folder.name,
      inputPassword: password,
      hashedPasswordLength: hashedPassword.length,
      existingPassword: !!folder.password
    });

    // Update the folder with the hashed password
    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });
    
    console.log('Password set successfully for folder:', folder.name);

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'UPDATE',
        description: `Password protection ${folder.password ? 'changed' : 'added'} for folder: ${folder.name}`,
        employeeId: employee.id,
        companyId: folder.companyId,
      },
    });

    return NextResponse.json({
      success: true,
      message: folder.password ? 'Password changed successfully' : 'Password protection enabled',
    });
  } catch (error) {
    console.error('Error setting folder password:', error);
    return NextResponse.json(
      { error: 'Failed to set folder password' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/folders/[id]/password - Remove folder password (Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can remove passwords
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Only admins can remove folder passwords' 
      }, { status: 403 });
    }

    // Find the folder
    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        company: true,
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    if (!folder.password) {
      return NextResponse.json({ 
        error: 'This folder is not password protected' 
      }, { status: 400 });
    }

    // Verify the employee belongs to the same company
    const employee = await prisma.employee.findFirst({
      where: {
        email: session.user.email,
      },
      include: {
        company: true,
        crossCompanyAccess: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if user has access to this company
    const hasAccess = 
      employee.company.id === folder.companyId ||
      employee.crossCompanyAccess.some(access => access.companyId === folder.companyId);

    if (!hasAccess) {
      return NextResponse.json({ 
        error: 'You do not have access to this folder' 
      }, { status: 403 });
    }

    // Remove the password
    await prisma.folder.update({
      where: { id },
      data: {
        password: null,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'UPDATE',
        description: `Password protection removed from folder: ${folder.name}`,
        employeeId: employee.id,
        companyId: folder.companyId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password protection removed successfully',
    });
  } catch (error) {
    console.error('Error removing folder password:', error);
    return NextResponse.json(
      { error: 'Failed to remove folder password' },
      { status: 500 }
    );
  }
}

