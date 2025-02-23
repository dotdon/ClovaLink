'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Alert } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaBuilding, FaUsers, FaFileAlt, FaLink, FaClock } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { hasPermission, Permission } from '@/lib/permissions';

interface DashboardStats {
  totalCompanies: number;
  totalEmployees: number;
  totalDocuments: number;
  activeDownloadLinks: number;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  employee: {
    name: string;
  };
  document?: {
    name: string;
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    totalEmployees: 0,
    totalDocuments: 0,
    activeDownloadLinks: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsResponse, activitiesResponse] = await Promise.all([
        // Only fetch stats if user is admin
        session?.user?.role === 'ADMIN' ? fetch('/api/admin/stats') : null,
        // Only fetch activities if user has permission
        hasPermission(session, Permission.VIEW_ACTIVITIES) ? fetch('/api/activities') : null
      ]);

      if (statsResponse && !statsResponse.ok) {
        throw new Error('Failed to fetch stats');
      }

      if (activitiesResponse && !activitiesResponse.ok) {
        throw new Error('Failed to fetch activities');
      }

      const [statsData, activitiesData] = await Promise.all([
        statsResponse ? statsResponse.json() : null,
        activitiesResponse ? activitiesResponse.json() : null
      ]);

      if (statsData?.stats) {
        setStats(statsData.stats);
      }

      if (activitiesData?.activities) {
        setActivities(activitiesData.activities);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData();
      // Refresh data every 30 seconds
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  // Only show stats for admin users
  const showStats = session?.user?.role === 'ADMIN';
  // Only show activities for users with permission
  const showActivities = hasPermission(session, Permission.VIEW_ACTIVITIES);

  const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) => (
    <Card className="stat-card">
      <Card.Body>
        <div className="d-flex align-items-center">
          <div className={`icon-wrapper bg-${color}`}>
            <Icon size={20} />
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{value}</h3>
            <p className="stat-title">{title}</p>
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  const ActivityItem = ({ activity }: { activity: Activity }) => (
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
          {new Date(activity.timestamp).toLocaleString()}
        </small>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p className="text-muted">Welcome to your secure document management portal</p>
        </div>

        {!showStats && !showActivities && (
          <Alert variant="info">
            Your role has limited access to the dashboard. Please contact your administrator for more information.
          </Alert>
        )}

        {showStats && (
          <div className="stats-grid">
            <StatCard
              title="Companies"
              value={stats.totalCompanies}
              icon={FaBuilding}
              color="primary"
            />
            <StatCard
              title="Employees"
              value={stats.totalEmployees}
              icon={FaUsers}
              color="success"
            />
            <StatCard
              title="Documents"
              value={stats.totalDocuments}
              icon={FaFileAlt}
              color="info"
            />
            <StatCard
              title="Upload Links"
              value={stats.activeDownloadLinks}
              icon={FaLink}
              color="warning"
            />
          </div>
        )}

        {showActivities ? (
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h2>Recent Activity</h2>
              <small className="text-muted">Last 10 activities (30-day retention)</small>
            </Card.Header>
            <Card.Body className="p-0">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : error ? (
                <p className="text-danger text-center py-4">{error}</p>
              ) : activities.length === 0 ? (
                <p className="text-muted text-center py-4">No recent activity to display</p>
              ) : (
                <div className="activity-list">
                  {activities.slice(0, 10).map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        ) : (
          <Alert variant="warning">
            You do not have permission to view activity logs.
          </Alert>
        )}
      </div>

      <style jsx>{`
        .dashboard-container {
          max-width: 100%;
          margin: 0 auto;
          padding: 1rem;
          overflow-x: hidden;
        }

        .dashboard-header {
          margin-bottom: 1.5rem;
          padding: 0;
        }

        .dashboard-header h1 {
          margin-bottom: 0.25rem;
          font-size: 1.75rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        :global(.stat-card) {
          border: none;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          margin: 0;
        }

        :global(.stat-card .card-body) {
          padding: 1rem;
        }

        :global(.icon-wrapper) {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 0.75rem;
          flex-shrink: 0;
        }

        :global(.stat-value) {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        :global(.stat-title) {
          color: #6c757d;
          margin: 0.25rem 0 0;
          font-size: 0.75rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        :global(.activity-card) {
          border: none;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          margin: 0;
        }

        :global(.activity-card .card-header) {
          background: transparent;
          border-bottom: 1px solid #e9ecef;
          padding: 1rem;
        }

        :global(.activity-card .card-header h2) {
          font-size: 1rem;
          margin: 0;
          font-weight: 600;
        }

        :global(.activity-list) {
          display: flex;
          flex-direction: column;
        }

        :global(.activity-item) {
          display: flex;
          padding: 1rem;
          border-bottom: 1px solid #e9ecef;
          align-items: flex-start;
        }

        :global(.activity-item:last-child) {
          border-bottom: none;
        }

        :global(.activity-icon) {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(13, 110, 253, 0.1);
          color: #0d6efd;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 0.75rem;
          flex-shrink: 0;
          font-size: 0.875rem;
        }

        :global(.activity-content) {
          flex: 1;
          min-width: 0;
          font-size: 0.875rem;
        }

        :global(.activity-text) {
          margin: 0;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        :global(.activity-doc) {
          color: #6c757d;
          display: inline-block;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          vertical-align: bottom;
        }

        :global(.activity-time) {
          display: block;
          color: #6c757d;
          margin-top: 0.25rem;
          font-size: 0.75rem;
        }

        /* Mobile styles */
        @media (max-width: 767px) {
          .dashboard-container {
            padding: 1rem;
          }

          .dashboard-header h1 {
            font-size: 1.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }

          :global(.stat-card .card-body) {
            padding: 0.75rem;
          }

          :global(.icon-wrapper) {
            width: 32px;
            height: 32px;
            margin-right: 0.5rem;
          }

          :global(.stat-value) {
            font-size: 1rem;
          }

          :global(.stat-title) {
            font-size: 0.75rem;
          }

          :global(.activity-card .card-header) {
            padding: 0.75rem;
          }

          :global(.activity-item) {
            padding: 0.75rem;
          }

          :global(.activity-icon) {
            width: 24px;
            height: 24px;
            margin-right: 0.5rem;
          }

          :global(.activity-text) {
            font-size: 0.813rem;
          }

          :global(.activity-time) {
            font-size: 0.688rem;
          }
        }

        /* Tablet styles */
        @media (min-width: 768px) and (max-width: 1023px) {
          .dashboard-container {
            padding: 1.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Desktop styles */
        @media (min-width: 1024px) {
          .dashboard-container {
            padding: 2rem;
          }

          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .dashboard-header h1 {
            font-size: 2rem;
          }

          :global(.stat-value) {
            font-size: 1.5rem;
          }

          :global(.activity-card .card-header h2) {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </DashboardLayout>
  );
} 