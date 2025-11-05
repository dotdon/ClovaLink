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
        <div className="stat-content">
          <p className="stat-title">{title}</p>
          <h3 className="stat-value">{value}</h3>
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
          <div className="header-badge">Welcome Back</div>
          <h1>Document Management Dashboard</h1>
          <p className="subtitle">Manage your files, track activity, and collaborate securely</p>
        </div>

        {!showStats && !showActivities && (
          <Alert variant="info" className="custom-alert">
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
          <Card className="activity-card">
            <Card.Header>
              <div className="card-header-content">
                <h2>Recent Activity</h2>
                <small>Last 10 activities (30-day retention)</small>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {isLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : error ? (
                <p className="text-danger text-center py-5">{error}</p>
              ) : activities.length === 0 ? (
                <p className="text-muted text-center py-5">No recent activity to display</p>
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
          <Alert variant="warning" className="custom-alert">
            You do not have permission to view activity logs.
          </Alert>
        )}
      </div>

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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          gap: 2rem;
          margin-bottom: 3rem;
        }

        :global(.stat-card) {
          border: none;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          margin: 0;
          background: white;
          transition: all 0.3s ease;
        }
        
        :global(.stat-card:hover) {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.12);
        }

        :global(.stat-card .card-body) {
          padding: 2.25rem;
          text-align: center;
        }
        
        :global(.stat-content) {
          width: 100%;
        }

        :global(.stat-value) {
          font-size: 3rem;
          font-weight: 800;
          margin: 0.5rem 0 0;
          line-height: 1;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        :global(.stat-title) {
          color: #666;
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
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
          transition: background 0.2s ease;
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

        /* Mobile styles */
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

          :global(.stat-card .card-body) {
            padding: 1.5rem 1.25rem;
          }

          :global(.stat-value) {
            font-size: 2rem;
          }

          :global(.stat-title) {
            font-size: 0.75rem;
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

        /* Tablet styles */
        @media (min-width: 768px) and (max-width: 1023px) {
          .dashboard-container {
            padding: 2rem 1.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }
        }

        /* Desktop styles */
        @media (min-width: 1024px) {
          .dashboard-container {
            padding: 3rem 2.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 2.5rem;
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

          :global(.stat-card .card-body) {
            padding: 2.5rem;
          }

          :global(.stat-value) {
            font-size: 3.5rem;
          }
          
          :global(.stat-title) {
            font-size: 0.875rem;
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
    </DashboardLayout>
  );
} 