import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient, Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the employee and their company
    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email },
      include: { company: true }
    });

    if (!employee?.company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim() || '';
    const fileTypes = searchParams.get('fileTypes')?.split(',') || [];
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // If no search query, return empty results
    if (!query) {
      return NextResponse.json([]);
    }

    // First, find all matching documents
    const documents = await prisma.document.findMany({
      where: {
        companyId: employee.company.id,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { path: { contains: query, mode: 'insensitive' } },
          {
            folder: {
              name: { contains: query, mode: 'insensitive' }
            }
          }
        ],
        ...(fileTypes.length > 0 && {
          mimeType: { in: fileTypes }
        }),
        ...(dateFrom || dateTo ? {
          createdAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) })
          }
        } : {})
      },
      include: {
        folder: true,
        uploadedBy: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group documents by folder
    const documentsByFolder = documents.reduce((acc, doc) => {
      const folderName = doc.folder?.name || '';
      if (!acc[folderName]) {
        acc[folderName] = [];
      }
      acc[folderName].push(doc);
      return acc;
    }, {} as Record<string, typeof documents>);

    // Format the response
    const documentTree = Object.entries(documentsByFolder).map(([folder, docs]) => ({
      folder,
      documents: docs,
      count: docs.length,
    }));

    return NextResponse.json(documentTree);
  } catch (error) {
    console.error('Error searching documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 