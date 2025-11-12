import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';

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

    // Check if user has permission to create companies
    if (!hasPermission(session, Permission.CREATE_COMPANIES)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const data = await request.json();
    
    if (!data.name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const company = await prisma.company.create({
      data: {
        name: data.name,
      },
      include: {
        _count: {
          select: {
            employees: true,
            documents: true,
          },
        },
      },
    });

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view companies
    if (!hasPermission(session, Permission.VIEW_COMPANIES)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Build query based on user role
    const where = session.user.role === 'ADMIN' 
      ? {} // Admins can see all companies
      : { id: session.user.companyId }; // Others can only see their own company

    const companies = await prisma.company.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            employees: true,
            documents: true,
          },
        },
      },
    });

    // Calculate storage usage for each company
    const companiesWithStorage = await Promise.all(
      companies.map(async (company) => {
        const storageResult = await prisma.document.aggregate({
          where: {
            companyId: company.id,
          },
          _sum: {
            size: true,
          },
        });

        return {
          ...company,
          storageUsed: storageResult._sum.size || 0,
        };
      })
    );

    return NextResponse.json({ companies: companiesWithStorage });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 