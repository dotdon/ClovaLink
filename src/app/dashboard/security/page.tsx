'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Button, Badge, Alert, Spinner, Tabs, Tab, Form } from 'react-bootstrap';
import { FaExclamationTriangle, FaShieldAlt, FaLock, FaUserLock, FaClock, FaBan, FaBell, FaCog } from 'react-icons/fa';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { useSession } from 'next-auth/react';

interface SuspiciousLogin {
  id: string;
  loginAt: string;
  ipAddress: string | null;
  location: string | null;
  userAgent: string | null;
  employee: {
    id: string;
    name: string;
    email: string;
    role: string;
    company: {
      name: string;
    } | null;
  };
}

interface LoginActivity {
  id: string;
  loginAt: string;
  ipAddress: string | null;
  location: string | null;
  userAgent: string | null;
  success: boolean;
  suspicious: boolean;
  employee: {
    id: string;
    name: string;
    email: string;
    role: string;
    company: {
      name: string;
    } | null;
  };
}

interface SecurityStats {
  suspiciousLogins: number;
  failedLogins: number;
  totalLogins: number;
  activeSessions: number;
  uniqueIPs: number;
}

export default function SecurityDashboard() {
  const { data: session } = useSession();
  const [suspiciousLogins, setSuspiciousLogins] = useState<SuspiciousLogin[]>([]);
  const [loginActivities, setLoginActivities] = useState<LoginActivity[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [cleanupPreview, setCleanupPreview] = useState<any>(null);
  const [cleaningUp, setCleaningUp] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchSecurityData();
      fetchCleanupPreview();
    }
  }, [session]);

  const fetchCleanupPreview = async () => {
    try {
      const response = await fetch('/api/admin/cleanup-login-activities');
      if (response.ok) {
        const data = await response.json();
        setCleanupPreview(data);
        if (data.retentionDays) {
          setRetentionDays(data.retentionDays);
        }
      }
    } catch (err) {
      console.error('Failed to fetch cleanup preview:', err);
    }
  };

  const handleCleanup = async () => {
    if (!confirm(`This will permanently delete ${cleanupPreview?.count || 0} old login activities. Continue?`)) {
      return;
    }

    try {
      setCleaningUp(true);
      const response = await fetch('/api/admin/cleanup-login-activities', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Success: ${data.message}\nDeleted ${data.deleted} records`);
        fetchCleanupPreview();
        fetchSecurityData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to cleanup'}`);
      }
    } catch (err) {
      console.error('Error during cleanup:', err);
      alert('Failed to cleanup login activities');
    } finally {
      setCleaningUp(false);
    }
  };

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const [suspiciousResponse, activitiesResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/suspicious-logins'),
        fetch('/api/admin/login-activities'),
        fetch('/api/admin/security-stats'),
      ]);

      if (suspiciousResponse.ok) {
        const suspiciousData = await suspiciousResponse.json();
        setSuspiciousLogins(suspiciousData.suspiciousLogins || []);
      }

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setLoginActivities(activitiesData.activities || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setSecurityStats(statsData);
      }
    } catch (err) {
      setError('Failed to load security data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Only IT and SUPER_ADMIN can access security dashboard
  const hasAccess = session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'IT';

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <Alert variant="danger">
          You do not have permission to access the security dashboard.
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="security-container">
        <div className="page-header">
          <div className="header-icon">
            <FaShieldAlt />
          </div>
          <div className="header-text">
            <h1>Security Dashboard</h1>
            <p className="header-subtitle">Monitor login activities and security events</p>
          </div>
          <Button variant="primary" onClick={fetchSecurityData} disabled={loading} className="refresh-btn">
            {loading ? <Spinner size="sm" className="me-2" /> : null}
            Refresh
          </Button>
        </div>

      {error && (
        <Alert variant="danger" className="mb-4" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card className="security-card">
        <Card.Body>
      <Tabs activeKey={activeTab} onSelect={(k) => k && setActiveTab(k)} className="mb-4">
        {/* Overview Tab */}
        <Tab eventKey="overview" title={<span><FaShieldAlt className="me-2" />Overview</span>}>
          <Row className="g-4 mb-4">
            <Col md={6} lg={3}>
              <Card className="h-100 border-warning">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="text-muted mb-2">Suspicious Logins</h6>
                      <h3 className="mb-0 text-warning">{securityStats?.suspiciousLogins || 0}</h3>
                      <small className="text-muted">Last 30 days</small>
                    </div>
                    <FaExclamationTriangle className="text-warning" size={32} />
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 border-danger">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="text-muted mb-2">Failed Logins</h6>
                      <h3 className="mb-0 text-danger">{securityStats?.failedLogins || 0}</h3>
                      <small className="text-muted">Last 30 days</small>
                    </div>
                    <FaBan className="text-danger" size={32} />
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 border-info">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="text-muted mb-2">Total Logins</h6>
                      <h3 className="mb-0 text-info">{securityStats?.totalLogins || 0}</h3>
                      <small className="text-muted">Last 30 days</small>
                    </div>
                    <FaUserLock className="text-info" size={32} />
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 border-success">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="text-muted mb-2">Unique IPs</h6>
                      <h3 className="mb-0 text-success">{securityStats?.uniqueIPs || 0}</h3>
                      <small className="text-muted">Last 30 days</small>
                    </div>
                    <FaClock className="text-success" size={32} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <FaExclamationTriangle className="me-2 text-danger" />
                    Recent Suspicious Login Attempts
                  </h5>
                  <Badge bg="danger">{suspiciousLogins.length}</Badge>
                </Card.Header>
                <Card.Body>
                  {loading ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" variant="primary" />
                    </div>
                  ) : suspiciousLogins.length === 0 ? (
                    <Alert variant="success" className="mb-0">
                      No suspicious login attempts detected. All clear! ✅
                    </Alert>
                  ) : (
                    <Table responsive hover>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Employee</th>
                          <th>Company</th>
                          <th>IP Address</th>
                          <th>Location</th>
                          <th>Device</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suspiciousLogins.slice(0, 10).map((login) => (
                          <tr key={login.id}>
                            <td>{new Date(login.loginAt).toLocaleString()}</td>
                            <td>
                              <div>
                                <strong>{login.employee.name}</strong>
                                <br />
                                <small className="text-muted">{login.employee.email}</small>
                              </div>
                            </td>
                            <td>{login.employee.company?.name || 'N/A'}</td>
                            <td>
                              <code>{login.ipAddress || 'Unknown'}</code>
                            </td>
                            <td>{login.location || 'Unknown'}</td>
                            <td>
                              <small className="text-muted" style={{ maxWidth: '200px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {login.userAgent || 'Unknown'}
                              </small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        {/* Login Activity Tab */}
        <Tab eventKey="activity" title={<span><FaClock className="me-2" />Login Activity</span>}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">All Login Activity</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Employee</th>
                      <th>Status</th>
                      <th>IP Address</th>
                      <th>Location</th>
                      <th>Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginActivities.slice(0, 50).map((activity) => (
                      <tr key={activity.id}>
                        <td>{new Date(activity.loginAt).toLocaleString()}</td>
                        <td>
                          <div>
                            <strong>{activity.employee.name}</strong>
                            <br />
                            <small className="text-muted">{activity.employee.email}</small>
                          </div>
                        </td>
                        <td>
                          {activity.success ? (
                            activity.suspicious ? (
                              <Badge bg="warning">Suspicious</Badge>
                            ) : (
                              <Badge bg="success">Success</Badge>
                            )
                          ) : (
                            <Badge bg="danger">Failed</Badge>
                          )}
                        </td>
                        <td>
                          <code>{activity.ipAddress || 'Unknown'}</code>
                        </td>
                        <td>{activity.location || 'Unknown'}</td>
                        <td>
                          <small className="text-muted" style={{ maxWidth: '200px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {activity.userAgent || 'Unknown'}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* Notification Settings Tab */}
        <Tab eventKey="notifications" title={<span><FaBell className="me-2" />Notifications</span>}>
          <Row className="mb-4">
            <Col md={12}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">
                    <FaCog className="me-2" />
                    Notification Preferences
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Alert variant="info">
                    Configure system-wide notification settings. These settings control when and how security alerts are sent.
                  </Alert>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="switch"
                        id="notify-suspicious-logins"
                        label="Send email alerts for suspicious login attempts"
                        defaultChecked
                      />
                      <Form.Text className="text-muted">
                        Admins and affected users will receive email notifications when suspicious logins are detected.
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Check
                        type="switch"
                        id="notify-all-logins"
                        label="Send email notifications for all logins"
                        defaultChecked={false}
                      />
                      <Form.Text className="text-muted">
                        Users will receive an email notification every time they log in.
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Check
                        type="switch"
                        id="notify-failed-logins"
                        label="Send email alerts for failed login attempts"
                        defaultChecked
                      />
                      <Form.Text className="text-muted">
                        Admins will be notified when multiple failed login attempts are detected for an account.
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Failed Login Threshold</Form.Label>
                      <Form.Control type="number" min="1" max="10" defaultValue="3" />
                      <Form.Text className="text-muted">
                        Number of failed login attempts before sending an alert.
                      </Form.Text>
                    </Form.Group>

                    <Button variant="primary">Save Notification Settings</Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <FaClock className="me-2" />
                    Auto-Delete Login Activities
                  </h5>
                  {session?.user?.role === 'SUPER_ADMIN' && (
                    <Badge bg={retentionDays === 0 ? 'secondary' : 'success'}>
                      {retentionDays === 0 ? 'Disabled' : `${retentionDays} days`}
                    </Badge>
                  )}
                </Card.Header>
                <Card.Body>
                  <Alert variant="warning">
                    <strong>Note:</strong> Suspicious logins are retained for a minimum of 180 days regardless of this setting.
                  </Alert>

                  {cleanupPreview && (
                    <div className="mb-3">
                      <p><strong>Current Status:</strong></p>
                      <ul>
                        <li>Retention Period: <Badge bg="info">{cleanupPreview.retentionDays === 0 ? 'Disabled' : `${cleanupPreview.retentionDays} days`}</Badge></li>
                        <li>Records eligible for deletion: <Badge bg="warning">{cleanupPreview.count || 0}</Badge></li>
                        {cleanupPreview.cutoffDate && (
                          <li>Delete activities before: <Badge bg="secondary">{new Date(cleanupPreview.cutoffDate).toLocaleDateString()}</Badge></li>
                        )}
                      </ul>
                    </div>
                  )}

                  <p className="text-muted">
                    Login activities older than the retention period will be automatically deleted to save storage space. 
                    Configure the retention period in the Settings page (Security section).
                  </p>

                  {session?.user?.role === 'SUPER_ADMIN' && (
                    <div className="d-flex gap-2">
                      <Button 
                        variant="danger" 
                        onClick={handleCleanup} 
                        disabled={cleaningUp || !cleanupPreview?.count || cleanupPreview.count === 0}
                      >
                        {cleaningUp ? <Spinner size="sm" className="me-2" /> : null}
                        {cleaningUp ? 'Cleaning...' : 'Delete Old Activities Now'}
                      </Button>
                      <Button variant="outline-secondary" onClick={fetchCleanupPreview}>
                        Refresh Preview
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
        </Card.Body>
      </Card>
      </div>

      <style jsx>{`
        .security-container {
          padding: 1rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, rgba(220, 53, 69, 0.15) 0%, rgba(255, 87, 34, 0.15) 100%);
          border: 1px solid rgba(220, 53, 69, 0.3);
          border-radius: 16px;
          padding: 1.75rem 2rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(220, 53, 69, 0.2);
        }

        .page-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #dc3545 0%, #ff5722 50%, #dc3545 100%);
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .header-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: #dc3545;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
        }

        .header-text {
          flex: 1;
          min-width: 0;
        }

        .page-header h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: #ffffff !important;
          letter-spacing: -0.5px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .header-subtitle {
          margin: 0.35rem 0 0 0;
          color: rgba(255, 255, 255, 0.75) !important;
          font-size: 0.95rem;
          font-weight: 400;
        }

        :global(.security-card) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          box-shadow: none !important;
        }

        :global(.security-card .card-body) {
          padding: 1.5rem !important;
        }

        :global(.security-card .nav-tabs) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          margin-bottom: 2rem;
        }

        :global(.security-card .nav-tabs .nav-link) {
          color: rgba(255, 255, 255, 0.6) !important;
          border: none !important;
          padding: 0.75rem 1.25rem !important;
          font-weight: 500 !important;
          transition: all 0.2s !important;
          border-bottom: 3px solid transparent !important;
          background: transparent !important;
        }

        :global(.security-card .nav-tabs .nav-link:hover) {
          color: #dc3545 !important;
          border-bottom-color: rgba(220, 53, 69, 0.3) !important;
          background: transparent !important;
        }

        :global(.security-card .nav-tabs .nav-link.active) {
          color: #dc3545 !important;
          border-bottom-color: #dc3545 !important;
          background: transparent !important;
          font-weight: 600 !important;
        }

        :global(.security-card .card) {
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
        }

        :global(.security-card .card-header) {
          background: rgba(255, 255, 255, 0.05) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #ffffff !important;
          font-weight: 600 !important;
        }

        :global(.security-card .table) {
          color: rgba(255, 255, 255, 0.9) !important;
        }

        :global(.security-card .table thead th) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.7) !important;
          font-weight: 600 !important;
          font-size: 0.85rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }

        :global(.security-card .table tbody td) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          color: rgba(255, 255, 255, 0.85) !important;
        }

        :global(.security-card .table tbody tr:hover) {
          background: rgba(255, 255, 255, 0.03) !important;
        }

        :global(.refresh-btn) {
          background: #dc3545 !important;
          border: none !important;
          color: white !important;
          box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3) !important;
          padding: 0.75rem 1.5rem !important;
          font-weight: 500 !important;
          border-radius: 8px !important;
        }

        :global(.refresh-btn:hover) {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4) !important;
        }

        :global(.form-control), :global(.form-select) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 8px !important;
          color: #ffffff !important;
          padding: 0.75rem 1rem !important;
          font-size: 0.95rem !important;
        }

        :global(.form-control:focus), :global(.form-select:focus) {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: #dc3545 !important;
          box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.2) !important;
          color: #ffffff !important;
        }

        :global(.form-check-input) {
          background-color: rgba(255, 255, 255, 0.1) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
        }

        :global(.form-check-input:checked) {
          background-color: #dc3545 !important;
          border-color: #dc3545 !important;
        }

        :global(.form-label) {
          color: rgba(255, 255, 255, 0.9) !important;
          font-weight: 600 !important;
        }

        :global(.form-text) {
          color: rgba(255, 255, 255, 0.5) !important;
        }

        @media (max-width: 767px) {
          .security-container {
            padding: 0.5rem !important;
          }

          .page-header {
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem !important;
          }

          .header-icon {
            width: 42px !important;
            height: 42px !important;
            font-size: 1.1rem !important;
          }

          .header-text {
            text-align: center;
            width: 100%;
          }

          .page-header h1 {
            font-size: 1.35rem !important;
          }

          .header-subtitle {
            font-size: 0.8rem !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}

