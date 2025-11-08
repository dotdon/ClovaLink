import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pagination params from URL
    const url = new URL(request.url);
    const employeePage = parseInt(url.searchParams.get('employeePage') || '1');
    const employeesPerPage = parseInt(url.searchParams.get('employeesPerPage') || '10');
    const skip = (employeePage - 1) * employeesPerPage;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
            documents: true,
          },
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

    // Get paginated employees
    const employees = await prisma.employee.findMany({
      where: { companyId: id },
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
      skip,
      take: employeesPerPage,
    });

    // Get recent documents
    const documents = await prisma.document.findMany({
      where: { companyId: id },
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
      take: 10,
    });

    return NextResponse.json({
      ...company,
      employees,
      documents,
      pagination: {
        currentPage: employeePage,
        totalEmployees: company._count.employees,
        totalPages: Math.ceil(company._count.employees / employeesPerPage),
      },
    });
  } catch (error) {
    console.error('Error fetching company:', error);
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
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can edit companies
    if (!hasPermission(session, Permission.EDIT_COMPANIES)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const data = await request.json();

    const company = await prisma.company.update({
      where: { id },
      data: {
        name: data.name,
      },
    });

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Error updating company:', error);
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

    // Only admins can delete companies
    if (!hasPermission(session, Permission.DELETE_COMPANIES)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get company to check if it exists
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        documents: {
          select: {
            path: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Delete all document files from filesystem
    for (const doc of company.documents) {
      try {
        const filePath = path.join(process.cwd(), 'uploads', doc.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Error deleting file ${doc.path}:`, error);
      }
    }

    // Delete company folder if exists
    try {
      const companyFolder = path.join(process.cwd(), 'uploads', id);
      if (fs.existsSync(companyFolder)) {
        fs.rmSync(companyFolder, { recursive: true, force: true });
      }
    } catch (error) {
      console.error(`Error deleting company folder:`, error);
    }

    // Delete company from database (cascading will handle related records)
    await prisma.company.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 