import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rename, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

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

    // Validate request body
    let targetFolderId: string | null = null;
    let targetCompanyId: string | null = null;
    try {
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return NextResponse.json({ 
          error: 'Invalid content type. Expected application/json' 
        }, { status: 400 });
      }

      const body = await request.json();
      targetFolderId = body.targetFolderId || null;
      targetCompanyId = body.targetCompanyId || null;
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 });
    }

    // Get the employee and their accessible companies
    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email },
      include: { 
        company: true,
        crossCompanyAccess: {
          include: {
            company: true
          }
        }
      }
    });

    if (!employee?.company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Build list of accessible company IDs
    const accessibleCompanyIds = [
      employee.company.id,
      ...employee.crossCompanyAccess.map(access => access.company.id)
    ];

    // Get the document to move - check if user has access to source company
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!accessibleCompanyIds.includes(document.companyId)) {
      return NextResponse.json({ error: 'No access to source document' }, { status: 403 });
    }

    // If targetCompanyId is specified, validate access to target company
    const finalTargetCompanyId = targetCompanyId || document.companyId;
    if (!accessibleCompanyIds.includes(finalTargetCompanyId)) {
      return NextResponse.json({ error: 'No access to target company' }, { status: 403 });
    }

    let targetFolderRecord = null;
    
    // If moving to a specific folder, find it by ID and validate it belongs to target company
    if (targetFolderId) {
      targetFolderRecord = await prisma.folder.findFirst({
        where: {
          id: targetFolderId,
          companyId: finalTargetCompanyId,
        },
      });

      if (!targetFolderRecord) {
        return NextResponse.json({ 
          error: 'Target folder not found',
          message: 'The target folder does not exist or you do not have access to it'
        }, { status: 404 });
      }
    }

    // Update the document in database (including company if cross-company move)
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        folderId: targetFolderId,
        companyId: finalTargetCompanyId,
      },
    });

    // Create an activity log
    await prisma.activity.create({
      data: {
        type: 'MOVE',
        description: targetFolderRecord 
          ? `Document moved to folder: ${targetFolderRecord.name}`
          : 'Document moved to root',
        employeeId: employee.id,
        documentId: id,
        companyId: employee.company.id,
      },
    });

    return NextResponse.json({ 
      success: true,
      document: updatedDocument,
      message: targetFolderRecord 
        ? `Document moved to ${targetFolderRecord.name} successfully`
        : 'Document moved to root successfully'
    });
  } catch (error) {
    console.error('Error moving document:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 