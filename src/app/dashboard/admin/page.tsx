'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Button, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import { FaUserPlus, FaBuilding, FaFileAlt, FaChartBar, FaExclamationTriangle } from 'react-icons/fa';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { useSession } from 'next-auth/react';

interface Stats {
  totalCompanies: number;
  totalEmployees: number;
  totalDocuments: number;
  activeUploadLinks: number;
  storageUsed: number;
  documentsThisMonth: number;
}

interface ActivitySummary {
  date: string;
  uploads: number;
  downloads: number;
  shares: number;
}

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

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [suspiciousLogins, setSuspiciousLogins] = useState<SuspiciousLogin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, activitiesResponse, suspiciousLoginsResponse] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/activities/summary'),
        fetch('/api/admin/suspicious-logins'),
      ]);

      if (!statsResponse.ok || !activitiesResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const statsData = await statsResponse.json();
      const activitiesData = await activitiesResponse.json();
      const suspiciousLoginsData = suspiciousLoginsResponse.ok 
        ? await suspiciousLoginsResponse.json() 
        : { suspiciousLogins: [] };

      setStats(statsData);
      setActivities(activitiesData);
      setSuspiciousLogins(suspiciousLoginsData.suspiciousLogins || []);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Check if user is admin, super admin, or IT
  const hasAccess = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'IT';
  
  if (!hasAccess) {
    return (
      <DashboardLayout>
        <Alert variant="danger">
          You do not have permission to access this page.
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <h1 className="h3">Admin Dashboard</h1>
        <div>
          <Button variant="primary" className="me-2">
            <FaUserPlus className="me-2" /> Add Employee
          </Button>
          <Button variant="success">
            <FaBuilding className="me-2" /> Add Company
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Row className="g-4 mb-4">
        <Col md={6} lg={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">Total Companies</h6>
                  <h3 className="mb-0">{stats?.totalCompanies || 0}</h3>
                </div>
                <FaBuilding className="text-primary" size={24} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">Total Employees</h6>
                  <h3 className="mb-0">{stats?.totalEmployees || 0}</h3>
                </div>
                <FaUserPlus className="text-success" size={24} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">Total Documents</h6>
                  <h3 className="mb-0">{stats?.totalDocuments || 0}</h3>
                </div>
                <FaFileAlt className="text-info" size={24} />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-2">Storage Used</h6>
                  <h3 className="mb-0">
                    {stats ? `${(stats.storageUsed / 1024 / 1024 / 1024).toFixed(2)} GB` : '0 GB'}
                  </h3>
                </div>
                <FaChartBar className="text-warning" size={24} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaExclamationTriangle className="me-2 text-danger" />
                Suspicious Login Attempts
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
                    {suspiciousLogins.map((login) => (
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

      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Recent Activity</h5>
            </Card.Header>
            <Card.Body>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Uploads</th>
                    <th>Downloads</th>
                    <th>Shares</th>
                    <th>Total Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <tr key={activity.date}>
                      <td>{new Date(activity.date).toLocaleDateString()}</td>
                      <td>
                        <Badge bg="success">{activity.uploads}</Badge>
                      </td>
                      <td>
                        <Badge bg="primary">{activity.downloads}</Badge>
                      </td>
                      <td>
                        <Badge bg="info">{activity.shares}</Badge>
                      </td>
                      <td>
                        <Badge bg="secondary">
                          {activity.uploads + activity.downloads + activity.shares}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">System Settings</h5>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Maximum Upload Size (MB)</Form.Label>
                  <Form.Control type="number" defaultValue="10" />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Document Expiry (Days)</Form.Label>
                  <Form.Control type="number" defaultValue="30" />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Allowed File Types</Form.Label>
                  <Form.Control as="textarea" rows={3} defaultValue=".pdf,.doc,.docx,.xls,.xlsx,.txt" />
                </Form.Group>

                <Button variant="primary">Save Settings</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Security Settings</h5>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    label="Enable Two-Factor Authentication"
                    defaultChecked
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    label="Require Strong Passwords"
                    defaultChecked
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="switch"
                    label="Auto-lock Inactive Sessions"
                    defaultChecked
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Session Timeout (minutes)</Form.Label>
                  <Form.Control type="number" defaultValue="30" />
                </Form.Group>

                <Button variant="primary">Update Security Settings</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </DashboardLayout>
  );
} 