import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

// POST /api/documents/[id]/password - Set or change document password (Manager only)
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
        error: 'Only managers and admins can set document passwords' 
      }, { status: 403 });
    }

    const { password } = await request.json();

    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Password is required' 
      }, { status: 400 });
    }

    // Find the document
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        company: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
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

    // Check access
    const hasAccess = 
      employee.company.id === document.companyId ||
      employee.crossCompanyAccess.some(access => access.companyId === document.companyId) ||
      session.user.role === 'ADMIN';

    if (!hasAccess) {
      return NextResponse.json({ 
        error: 'You do not have access to this document' 
      }, { status: 403 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Setting password for document:', {
      documentId: id,
      documentName: document.name,
      inputPassword: password,
      hashedPasswordLength: hashedPassword.length,
      existingPassword: !!document.password
    });

    // Update the document with the hashed password
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });
    
    console.log('Password set successfully for document:', document.name);

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'UPDATE',
        description: `Document password ${document.password ? 'changed' : 'set'}: ${document.name}`,
        employeeId: employee.id,
        documentId: id,
        companyId: document.companyId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Document password updated successfully',
    });
  } catch (error) {
    console.error('Error setting document password:', error);
    return NextResponse.json({ 
      error: 'Failed to set document password' 
    }, { status: 500 });
  }
}

// DELETE /api/documents/[id]/password - Remove document password (Admin only)
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
        error: 'Only admins can remove document passwords' 
      }, { status: 403 });
    }

    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        name: true,
        companyId: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const employee = await prisma.employee.findFirst({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    await prisma.document.update({
      where: { id },
      data: {
        password: null,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'UPDATE',
        description: `Document password removed: ${document.name}`,
        employeeId: employee.id,
        documentId: id,
        companyId: document.companyId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Document password removed successfully',
    });
  } catch (error) {
    console.error('Error removing document password:', error);
    return NextResponse.json({ 
      error: 'Failed to remove document password' 
    }, { status: 500 });
  }
}

