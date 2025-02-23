import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Wait for session and params
    const [session, params] = await Promise.all([
      getServerSession(authOptions),
      Promise.resolve(context.params)
    ]);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            employees: true,
            documents: true,
          },
        },
        employees: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
        documents: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            uploadedBy: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Get only the 10 most recent documents
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if user has access to this company
    if (session.user.role !== 'ADMIN' && session.user.companyId !== company.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 