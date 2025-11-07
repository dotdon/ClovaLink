import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

// POST /api/documents/[id]/verify-password - Verify document password
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ 
        success: false,
        error: 'Password is required' 
      }, { status: 400 });
    }

    // Find the document
    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        password: true,
        companyId: true,
      },
    });

    if (!document) {
      return NextResponse.json({ 
        success: false,
        error: 'Document not found' 
      }, { status: 404 });
    }

    if (!document.password) {
      return NextResponse.json({ 
        success: false,
        error: 'Document is not password protected' 
      }, { status: 400 });
    }

    // Verify the employee has access to this company
    const employee = await prisma.employee.findFirst({
      where: {
        id: session.user.id,
      },
      include: {
        company: true,
        crossCompanyAccess: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ 
        success: false,
        error: 'Employee not found' 
      }, { status: 404 });
    }

    // Check if user has access to this company
    const hasAccess = 
      employee.company.id === document.companyId ||
      employee.crossCompanyAccess.some(access => access.companyId === document.companyId) ||
      session.user.role === 'ADMIN';

    if (!hasAccess) {
      return NextResponse.json({ 
        success: false,
        error: 'You do not have access to this document' 
      }, { status: 403 });
    }

    // Verify the password
    console.log('Verifying password for document:', {
      documentId: document.id,
      documentName: document.name,
      hasPassword: !!document.password,
      passwordLength: document.password?.length,
      inputPasswordLength: password.length
    });
    
    const isPasswordCorrect = await bcrypt.compare(password, document.password);
    
    console.log('Password verification result:', isPasswordCorrect);

    if (!isPasswordCorrect) {
      console.log('Password incorrect for document:', document.name);
      return NextResponse.json({
        success: false,
        error: 'Incorrect password'
      }, { status: 401 });
    }
    
    console.log('Password correct for document:', document.name);

    // Log activity for accessing password-protected document
    await prisma.activity.create({
      data: {
        type: 'VIEW',
        description: `Accessed password-protected document: ${document.name}`,
        employeeId: employee.id,
        documentId: document.id,
        companyId: document.companyId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password verified successfully',
    });
  } catch (error) {
    console.error('Error verifying document password:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to verify document password' 
      },
      { status: 500 }
    );
  }
}

