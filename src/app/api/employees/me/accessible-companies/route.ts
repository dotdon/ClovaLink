import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Get all companies the current user has access to
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.user.id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        crossCompanyAccess: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    let companies;

    // If admin, return ALL companies
    if (session.user.role === 'ADMIN') {
      const allCompanies = await prisma.company.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      companies = allCompanies.map((company) => ({
        id: company.id,
        name: company.name,
        isPrimary: company.id === employee.companyId,
      }));
    } else {
      // Build list of accessible companies for non-admins
      companies = [
        {
          id: employee.company.id,
          name: employee.company.name,
          isPrimary: true,
        },
        ...employee.crossCompanyAccess.map((access) => ({
          id: access.company.id,
          name: access.company.name,
          isPrimary: false,
        })),
      ];
    }

    return NextResponse.json({ companies });
  } catch (error) {
    console.error('Error fetching accessible companies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

