import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

// POST /api/documents/folders/[id]/verify-password - Verify folder password
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

    // Find the folder
    const folder = await prisma.folder.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        password: true,
        companyId: true,
      },
    });

    if (!folder) {
      return NextResponse.json({ 
        success: false,
        error: 'Folder not found' 
      }, { status: 404 });
    }

    if (!folder.password) {
      return NextResponse.json({ 
        success: false,
        error: 'Folder is not password protected' 
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
      employee.company.id === folder.companyId ||
      employee.crossCompanyAccess.some(access => access.companyId === folder.companyId) ||
      session.user.role === 'ADMIN';

    if (!hasAccess) {
      return NextResponse.json({ 
        success: false,
        error: 'You do not have access to this folder' 
      }, { status: 403 });
    }

    // Verify the password
    console.log('Verifying password for folder:', {
      folderId: folder.id,
      folderName: folder.name,
      hasPassword: !!folder.password,
      passwordLength: folder.password?.length,
      inputPasswordLength: password.length
    });
    
    const isPasswordCorrect = await bcrypt.compare(password, folder.password);
    
    console.log('Password verification result:', isPasswordCorrect);

    if (!isPasswordCorrect) {
      console.log('Password incorrect for folder:', folder.name);
      return NextResponse.json({
        success: false,
        error: 'Incorrect password'
      }, { status: 401 });
    }
    
    console.log('Password correct for folder:', folder.name);

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'VIEW',
        description: `Accessed password-protected folder: ${folder.name}`,
        employeeId: employee.id,
        companyId: folder.companyId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password verified successfully',
    });
  } catch (error) {
    console.error('Error verifying folder password:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to verify folder password' 
      },
      { status: 500 }
    );
  }
}

