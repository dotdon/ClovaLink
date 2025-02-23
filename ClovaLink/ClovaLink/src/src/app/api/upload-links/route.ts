import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateToken } from '@/lib/utils';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { hasPermission, Permission } from '@/lib/permissions';
import prisma from '@/lib/prisma';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Helper function to sanitize folder name
function sanitizeFolderName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create upload links
    if (!hasPermission(session, Permission.CREATE_UPLOAD_LINKS)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const data = await request.json();
    const { name, maxUses = 1, expiresInDays = 7 } = data;

    // Validate input
    if (maxUses < 1) {
      return NextResponse.json({ error: 'Maximum uses must be at least 1' }, { status: 400 });
    }

    if (expiresInDays < 1 || expiresInDays > 30) {
      return NextResponse.json({ error: 'Expiration days must be between 1 and 30' }, { status: 400 });
    }

    // Get employee details
    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Generate a random token
    const token = generateToken();

    // Create upload link using the UploadLink model
    const uploadLink = await prisma.uploadLink.create({
      data: {
        name: name ? sanitizeFolderName(name) : null,
        token,
        maxUses,
        useCount: 0,
        used: false,
        expiresAt,
        employeeId: employee.id,
        metadata: {
          folderName: name ? sanitizeFolderName(name) : 'uncategorized'
        }
      },
      include: {
        employee: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Create activity record
    await prisma.activity.create({
      data: {
        type: 'UPLOAD_LINK_CREATED',
        description: name 
          ? `Created upload link "${name}" with ${maxUses} max uses, expires in ${expiresInDays} days`
          : `Created upload link with ${maxUses} max uses, expires in ${expiresInDays} days`,
        employeeId: employee.id,
        companyId: employee.companyId,
      }
    });

    return NextResponse.json({
      success: true,
      data: uploadLink
    });
  } catch (error) {
    console.error('Error creating upload link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view upload links
    if (!hasPermission(session, Permission.VIEW_UPLOAD_LINKS)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Use Prisma's built-in query builder with the UploadLink model
    const uploadLinks = await prisma.uploadLink.findMany({
      where: session.user.role === 'ADMIN' 
        ? {} // Admins can see all links
        : {
            employee: {
              companyId: session.user.companyId // Others can only see links from their company
            }
          },
      include: {
        employee: {
          select: {
            name: true,
            email: true,
            companyId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: uploadLinks
    });
  } catch (error) {
    console.error('Error fetching upload links:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 