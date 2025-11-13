'use client';

import { useState, useEffect } from 'react';
import { Card, Alert, Button } from 'react-bootstrap';
import { FaClock, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { hasPermission, Permission } from '@/lib/permissions';
import dynamic from 'next/dynamic';

// Dynamically import charts to avoid SSR issues
const StatCard = dynamic(() => import('./StatCard'), { ssr: false });

interface ChartDataPoint {
  date: string;
  count: number;
}

interface DashboardStats {
  totalCompanies: number;
  totalEmployees: number;
  totalDocuments: number;
  activeDownloadLinks: number;
  totalFolders: number;
  recentDocuments: number;
  documentsLast30Days: number;
  activeUsers: number;
  chartData?: {
    documents: ChartDataPoint[];
    employees: ChartDataPoint[];
  };
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp?: string;
  createdAt?: string;
  employee: {
    name: string;
  };
  document?: {
    name: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface DashboardContentProps {
  initialStats: DashboardStats | null;
  initialActivities: Activity[];
  initialPagination: Pagination;
}

export default function DashboardContent({
  initialStats,
  initialActivities,
  initialPagination,
}: DashboardContentProps) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(initialStats);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPagination.page);
  const [pagination, setPagination] = useState(initialPagination);

  const fetchDashboardData = async (page = 1, isBackgroundRefresh = false) => {
    try {
      if (!isBackgroundRefresh) {
        setIsRefreshing(true);
      }

      const [statsResponse, activitiesResponse] = await Promise.all([
        session?.user?.role === 'ADMIN' ? fetch('/api/admin/stats') : null,
        fetch(`/api/activities?page=${page}&limit=10`),
      ]);

      if (statsResponse && !statsResponse.ok) {
        throw new Error('Failed to fetch stats');
      }

      if (activitiesResponse && !activitiesResponse.ok) {
        throw new Error('Failed to fetch activities');
      }

      const [statsData, activitiesData] = await Promise.all([
        statsResponse ? statsResponse.json() : null,
        activitiesResponse ? activitiesResponse.json() : null,
      ]);

      if (statsData?.stats) {
        setStats(statsData.stats);
      }

      if (activitiesData) {
        setActivities(activitiesData.activities || []);
        if (activitiesData.pagination) {
          setPagination(activitiesData.pagination);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchDashboardData(newPage);
  };

  useEffect(() => {
    if (session?.user) {
      // Refresh data every 30 seconds (background refresh)
      const interval = setInterval(() => fetchDashboardData(currentPage, true), 30000);
      return () => clearInterval(interval);
    }
  }, [session, currentPage]);

  const showStats = session?.user?.role === 'ADMIN';
  const showActivities = hasPermission(session, Permission.VIEW_ACTIVITIES);

  // Format date on client-side only to avoid hydration mismatch
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const ActivityItem = ({ activity }: { activity: Activity }) => {
    const [formattedDate, setFormattedDate] = useState('');

    useEffect(() => {
      // Format date only on client side
      setFormattedDate(formatDate(activity.timestamp || activity.createdAt));
    }, [activity.timestamp, activity.createdAt]);

    return (
      <div className="activity-item">
        <div className="activity-icon">
          <FaClock />
        </div>
        <div className="activity-content">
          <p className="activity-text">
            <strong>{activity.employee.name}</strong> {activity.description}
            {activity.document && <span className="activity-doc"> - {activity.document.name}</span>}
          </p>
          <small className="activity-time">
            {formattedDate || 'Loading...'}
          </small>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-badge">Welcome Back</div>
        <h1>Document Management Dashboard</h1>
        <p className="subtitle">Manage your files, track activity, and collaborate securely</p>
      </div>

      {!showStats && !showActivities && (
        <Alert variant="info" className="custom-alert">
          Your role has limited access to the dashboard. Please contact your administrator for more information.
        </Alert>
      )}

      {showStats && stats && (
        <div className="stats-grid">
          <StatCard
            title="Total Companies"
            value={stats.totalCompanies}
            color="#667eea"
            subtitle="Organizations"
            chartData={stats.chartData?.documents || []}
            chartType="area"
          />
          <StatCard
            title="Total Employees"
            value={stats.totalEmployees}
            color="#f5576c"
            subtitle={`${stats.activeUsers} active`}
            chartData={stats.chartData?.employees || []}
            chartType="line"
          />
          <StatCard
            title="Total Documents"
            value={stats.totalDocuments}
            color="#4facfe"
            subtitle={`${stats.recentDocuments} this week`}
            chartData={stats.chartData?.documents || []}
            chartType="area"
          />
          <StatCard
            title="Total Folders"
            value={stats.totalFolders}
            color="#43e97b"
            subtitle="Organized"
            chartData={[]}
            chartType="bar"
          />
          <StatCard
            title="Active Upload Links"
            value={stats.activeDownloadLinks}
            color="#fa709a"
            subtitle="Currently active"
            chartData={[]}
            chartType="bar"
          />
          <StatCard
            title="Active Users"
            value={stats.activeUsers}
            color="#30cfd0"
            subtitle="Online now"
            chartData={stats.chartData?.employees || []}
            chartType="line"
          />
        </div>
      )}

      {showActivities ? (
        <Card className="activity-card">
          <Card.Header>
            <div className="card-header-content">
              <h2>Recent Activity</h2>
              <div className="d-flex align-items-center gap-2">
                {isRefreshing && (
                  <div className="refresh-indicator" title="Updating...">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Refreshing...</span>
                    </div>
                  </div>
                )}
                <small>
                  {pagination.total > 0
                    ? `Showing ${((pagination.page - 1) * pagination.limit) + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} activities`
                    : '30-day retention'
                  }
                </small>
              </div>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            {error ? (
              <p className="text-danger text-center py-5">{error}</p>
            ) : activities.length === 0 ? (
              <p className="text-muted text-center py-5">No recent activity to display</p>
            ) : (
              <>
                <div className="activity-list">
                  {activities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
                {pagination.totalPages > 1 && (
                  <div className="d-flex justify-content-center align-items-center gap-3 py-3 border-top">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isRefreshing}
                    >
                      <FaChevronLeft /> Previous
                    </Button>
                    <span className="text-muted">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === pagination.totalPages || isRefreshing}
                    >
                      Next <FaChevronRight />
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card.Body>
        </Card>
      ) : (
        <Alert variant="warning" className="custom-alert">
          You do not have permission to view activity logs.
        </Alert>
      )}

      <style jsx>{`
        .dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2.5rem 2rem;
          overflow-x: hidden;
          background: transparent;
        }

        .dashboard-header {
          margin-bottom: 3rem;
          padding: 0;
          text-align: center;
        }
        
        .header-badge {
          display: inline-block;
          background: #667eea;
          color: #ffffff;
          padding: 0.5rem 1.5rem;
          border-radius: 50px;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 1.25rem;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .dashboard-header h1 {
          margin-bottom: 0.75rem;
          font-size: 2.75rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.2;
          letter-spacing: -0.5px;
        }
        
        .subtitle {
          color: rgba(255, 255, 255, 0.85);
          font-size: 1.125rem;
          font-weight: 400;
          margin: 0;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        :global(.activity-card) {
          border: none;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          margin: 0;
          background: white;
        }

        :global(.activity-card .card-header) {
          background: white;
          border-bottom: 1px solid #ecf0f1;
          padding: 2rem;
          border-radius: 20px 20px 0 0;
        }
        
        :global(.card-header-content) {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        :global(.card-header-content h2) {
          font-size: 1.5rem;
          margin: 0;
          font-weight: 700;
          color: #1a1a2e;
        }
        
        :global(.card-header-content small) {
          color: #666;
          font-size: 0.875rem;
        }
        
        :global(.custom-alert) {
          border-radius: 12px;
          border: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        :global(.activity-list) {
          display: flex;
          flex-direction: column;
        }

        :global(.activity-item) {
          display: flex;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #ecf0f1;
          align-items: flex-start;
          transition: all 0.3s ease;
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        :global(.refresh-indicator) {
          display: flex;
          align-items: center;
          opacity: 0.7;
        }
        
        :global(.activity-item:hover) {
          background: #f8f9fa;
        }

        :global(.activity-item:last-child) {
          border-bottom: none;
        }

        :global(.activity-icon) {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #667eea;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
          flex-shrink: 0;
          font-size: 1rem;
          box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
        }

        :global(.activity-content) {
          flex: 1;
          min-width: 0;
          font-size: 0.9375rem;
        }

        :global(.activity-text) {
          margin: 0;
          line-height: 1.6;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          color: #333;
        }
        
        :global(.activity-text strong) {
          font-weight: 600;
          color: #1a1a2e;
        }

        :global(.activity-doc) {
          color: #666;
          display: inline-block;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          vertical-align: bottom;
        }

        :global(.activity-time) {
          display: block;
          color: #999;
          margin-top: 0.375rem;
          font-size: 0.8125rem;
        }

        @media (max-width: 767px) {
          .dashboard-container {
            padding: 2rem 1.5rem;
          }
          
          .header-badge {
            font-size: 0.75rem;
            padding: 0.375rem 1rem;
            margin-bottom: 1rem;
          }

          .dashboard-header h1 {
            font-size: 1.875rem;
            color: #ffffff !important;
          }
          
          .subtitle {
            font-size: 0.9375rem;
            color: rgba(255, 255, 255, 0.85) !important;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            margin-bottom: 2rem;
          }

          :global(.activity-card .card-header) {
            padding: 1.25rem;
          }
          
          :global(.card-header-content) {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          
          :global(.card-header-content h2) {
            font-size: 1.25rem;
          }

          :global(.activity-item) {
            padding: 1rem 1.25rem;
          }

          :global(.activity-icon) {
            width: 36px;
            height: 36px;
            margin-right: 0.875rem;
          }

          :global(.activity-text) {
            font-size: 0.875rem;
          }

          :global(.activity-time) {
            font-size: 0.75rem;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .dashboard-container {
            padding: 2rem 1.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }
        }
        
        @media (min-width: 1400px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 2.5rem;
          }
        }

        @media (min-width: 1024px) {
          .dashboard-container {
            padding: 3rem 2.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 2rem;
          }

          .dashboard-header {
            margin-bottom: 4rem;
          }
          
          .header-badge {
            font-size: 0.875rem;
            padding: 0.625rem 1.75rem;
          }

          .dashboard-header h1 {
            font-size: 3rem;
            color: #ffffff !important;
          }
          
          .subtitle {
            font-size: 1.25rem;
            color: rgba(255, 255, 255, 0.85) !important;
          }
          
          :global(.activity-card .card-header) {
            padding: 2rem;
          }
          
          :global(.card-header-content h2) {
            font-size: 1.75rem;
          }
          
          :global(.activity-item) {
            padding: 1.5rem 2rem;
          }
        }
      `}</style>
    </div>
  );
}

