import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { Alert } from 'react-bootstrap';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, Permission } from '@/lib/permissions';
import DashboardLayout from '@/components/ui/DashboardLayout';
import DashboardContent from '@/components/dashboard/DashboardContent';

// Cache the session fetch to avoid duplicate requests
const getCachedSession = cache(async () => {
  return await getServerSession(authOptions);
});

// Cache stats fetch for request deduplication
const getCachedStats = cache(async () => {
  const [
    totalCompanies,
    totalEmployees,
    totalDocuments,
    activeDownloadLinks,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.employee.count(),
    prisma.document.count(),
    prisma.downloadLink.count({
      where: {
        AND: [
          { expiresAt: { gt: new Date() } },
          { isActive: true }
        ]
      },
    }),
  ]);

  return {
    totalCompanies,
    totalEmployees,
    totalDocuments,
    activeDownloadLinks,
  };
});

// Cache activities fetch
const getCachedActivities = cache(async (employeeId: string, companyId: string, role: string, page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const where = role === 'ADMIN'
    ? {} // Admins can see all activities
    : { companyId }; // Others only see their company's activities

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      take: limit,
      skip,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
        document: {
          select: {
            name: true,
          },
        },
        folder: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.activity.count({ where }),
  ]);

  // Map activities to include timestamp field
  const activitiesWithTimestamp = activities.map(activity => ({
    ...activity,
    timestamp: activity.timestamp || activity.createdAt.toISOString(),
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    activities: activitiesWithTimestamp,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
});

// Revalidate every 30 seconds for fresh data
export const revalidate = 30;

export default async function DashboardPage() {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    return (
      <DashboardLayout>
        <div className="dashboard-container">
          <Alert variant="warning">Please sign in to view the dashboard.</Alert>
        </div>
      </DashboardLayout>
    );
  }

  // Get employee with company info
  const employee = await prisma.employee.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      companyId: true,
      role: true,
    },
  });

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="dashboard-container">
          <Alert variant="danger">Employee not found.</Alert>
        </div>
      </DashboardLayout>
    );
  }

  // Fetch data in parallel
  const [statsData, activitiesData] = await Promise.all([
    // Only fetch stats if user is admin
    session.user.role === 'ADMIN' ? getCachedStats() : Promise.resolve(null),
    // Fetch activities for all logged-in users
    hasPermission(session, Permission.VIEW_ACTIVITIES)
      ? getCachedActivities(employee.id, employee.companyId, employee.role)
      : Promise.resolve({ activities: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasMore: false } }),
  ]);

  return (
    <DashboardLayout>
      <DashboardContent
        initialStats={statsData}
        initialActivities={activitiesData.activities}
        initialPagination={activitiesData.pagination}
      />
    </DashboardLayout>
  );
}
