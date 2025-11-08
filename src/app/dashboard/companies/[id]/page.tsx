'use client';

import React, { useState, useEffect } from 'react';
import { Card, Badge, Spinner, Button } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { useParams, useRouter } from 'next/navigation';
import { FaUsers, FaFileAlt, FaCalendar, FaBuilding, FaArrowLeft, FaEnvelope, FaShieldAlt } from 'react-icons/fa';

interface Company {
  id: string;
  name: string;
  createdAt: string;
  _count: {
    employees: number;
    documents: number;
  };
  employees: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
  documents: {
    id: string;
    name: string;
    uploadedBy: {
      name: string;
    };
    createdAt: string;
  }[];
}

export default function CompanyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const response = await fetch(`/api/companies/${params.id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch company details');
        }

        const companyData = await response.json();
        setCompany(companyData);
      } catch (error) {
        console.error('Error fetching company data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load company data');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchCompanyData();
    }
  }, [params.id]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'admin-badge';
      case 'MANAGER':
        return 'manager-badge';
      default:
        return 'user-badge';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="loading-container">
          <Spinner animation="border" variant="primary" />
          <p>Loading company details...</p>
        </div>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 5rem 2rem;
            text-align: center;
          }

          .loading-container p {
            color: rgba(255, 255, 255, 0.7);
            margin-top: 1rem;
            font-size: 1rem;
          }
        `}</style>
      </DashboardLayout>
    );
  }

  if (error || !company) {
    return (
      <DashboardLayout>
        <div className="error-container">
          <FaBuilding className="error-icon" />
          <h3>Error Loading Company</h3>
          <p>{error || 'Company not found'}</p>
          <Button className="back-btn" onClick={() => router.back()}>
            <FaArrowLeft className="me-2" /> Go Back
          </Button>
        </div>
        <style jsx>{`
          .error-container {
            text-align: center;
            padding: 5rem 2rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(220, 53, 69, 0.3);
            border-radius: 12px;
            max-width: 600px;
            margin: 2rem auto;
          }

          .error-icon {
            font-size: 4rem;
            color: #ff6b6b;
            margin-bottom: 1rem;
          }

          .error-container h3 {
            color: #ff6b6b;
            margin-bottom: 0.75rem;
          }

          .error-container p {
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 1.5rem;
          }

          :global(.back-btn) {
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: #ffffff !important;
            padding: 0.65rem 1.5rem !important;
            border-radius: 8px !important;
            font-weight: 500 !important;
            transition: all 0.3s ease !important;
          }

          :global(.back-btn:hover) {
            background: rgba(255, 255, 255, 0.1) !important;
            transform: translateY(-1px) !important;
          }
        `}</style>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="company-details-container">
        {/* Header */}
        <div className="page-header">
          <Button variant="link" className="back-button" onClick={() => router.back()}>
            <FaArrowLeft />
          </Button>
          <div className="header-content">
            <div className="header-icon">
              <FaBuilding />
            </div>
            <div>
              <h1 style={{ color: '#ffffff' }}>{company.name}</h1>
              <p className="header-subtitle" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Company Overview</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-card-content">
                <div className="stat-icon-box employees-icon">
                  <FaUsers />
                </div>
                <div className="stat-info">
                  <div className="stat-label" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Total Employees</div>
                  <div className="stat-value" style={{ color: '#ffffff' }}>{company._count.employees}</div>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card className="stat-card">
            <Card.Body>
              <div className="stat-card-content">
                <div className="stat-icon-box documents-icon">
                  <FaFileAlt />
                </div>
                <div className="stat-info">
                  <div className="stat-label" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Total Documents</div>
                  <div className="stat-value" style={{ color: '#ffffff' }}>{company._count.documents}</div>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card className="stat-card">
            <Card.Body>
              <div className="stat-card-content">
                <div className="stat-icon-box calendar-icon">
                  <FaCalendar />
                </div>
                <div className="stat-info">
                  <div className="stat-label" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Created Date</div>
                  <div className="stat-value-date" style={{ color: '#ffffff' }}>{new Date(company.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Employees Section */}
        <Card className="section-card">
          <Card.Header className="section-header">
            <h5 style={{ color: '#ffffff !important', margin: 0 }}>
              <FaUsers className="me-2" style={{ color: '#ffffff' }} />
              <span style={{ color: '#ffffff' }}>Employees ({company.employees.length})</span>
            </h5>
          </Card.Header>
          <Card.Body className="section-body">
            {company.employees.length === 0 ? (
              <div className="empty-section">
                <FaUsers className="empty-icon" style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
                <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No employees found</p>
              </div>
            ) : (
              <div className="employees-grid">
                {company.employees.map(employee => (
                  <div key={employee.id} className="employee-item">
                    <div className="employee-info">
                      <div className="employee-avatar">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="employee-details">
                        <div className="employee-name" style={{ color: '#ffffff' }}>{employee.name}</div>
                        <div className="employee-email" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          <FaEnvelope className="me-1" />
                          {employee.email}
                        </div>
                      </div>
                    </div>
                    <div className="employee-meta">
                      <Badge className={getRoleBadgeColor(employee.role)}>
                        {employee.role}
                      </Badge>
                      <div className="joined-date" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Joined {new Date(employee.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Documents Section */}
        <Card className="section-card">
          <Card.Header className="section-header">
            <h5 style={{ color: '#ffffff !important', margin: 0 }}>
              <FaFileAlt className="me-2" style={{ color: '#ffffff' }} />
              <span style={{ color: '#ffffff' }}>Recent Documents ({company.documents.length})</span>
            </h5>
          </Card.Header>
          <Card.Body className="section-body">
            {company.documents.length === 0 ? (
              <div className="empty-section">
                <FaFileAlt className="empty-icon" style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
                <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No documents found</p>
              </div>
            ) : (
              <div className="documents-list">
                {company.documents.map(document => (
                  <div key={document.id} className="document-item">
                    <div className="document-icon">
                      <FaFileAlt />
                    </div>
                    <div className="document-info">
                      <div className="document-name" style={{ color: '#ffffff' }}>{document.name}</div>
                      <div className="document-meta" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Uploaded by {document.uploadedBy.name} • {new Date(document.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>

      <style jsx>{`
        .company-details-container {
          padding: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Page Header */
        .page-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
        }

        :global(.back-button) {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 8px !important;
          color: #ffffff !important;
          padding: 0 !important;
          transition: all 0.2s ease !important;
        }

        :global(.back-button:hover) {
          background: rgba(255, 255, 255, 0.1) !important;
          border-color: #667eea !important;
          color: #667eea !important;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .header-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: white;
          flex-shrink: 0;
        }

        .page-header h1 {
          margin: 0 !important;
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          color: #ffffff !important;
        }

        .header-subtitle {
          margin: 0.15rem 0 0 0;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.85rem;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        :global(.stat-card) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          transition: all 0.2s ease !important;
        }

        :global(.stat-card:hover) {
          transform: translateY(-2px);
          border-color: rgba(102, 126, 234, 0.3);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        :global(.stat-card .card-body) {
          padding: 1.25rem !important;
        }

        .stat-card-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-icon-box {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          flex-shrink: 0;
        }

        .stat-icon-box.employees-icon {
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
        }

        .stat-icon-box.documents-icon {
          background: rgba(82, 196, 26, 0.1);
          color: #52c41a;
        }

        .stat-icon-box.calendar-icon {
          background: rgba(255, 193, 7, 0.1);
          color: #ffc107;
        }

        .stat-info {
          flex: 1;
        }

        .stat-label {
          font-size: 0.85rem !important;
          color: rgba(255, 255, 255, 0.6) !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          margin-bottom: 0.35rem !important;
        }

        .stat-value {
          font-size: 2rem !important;
          font-weight: 700 !important;
          color: #ffffff !important;
          line-height: 1 !important;
        }

        .stat-value-date {
          font-size: 1.1rem !important;
          font-weight: 600 !important;
          color: #ffffff !important;
        }

        /* Section Cards */
        :global(.section-card) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          margin-bottom: 1.5rem !important;
          overflow: hidden !important;
        }

        :global(.section-header) {
          background: rgba(255, 255, 255, 0.03) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding: 1rem 1.5rem !important;
        }

        .section-header h5 {
          margin: 0 !important;
          font-size: 1.1rem !important;
          font-weight: 600 !important;
          color: #ffffff !important;
          display: flex !important;
          align-items: center !important;
        }

        .section-header h5 span {
          color: #ffffff !important;
        }

        .section-header h5 svg {
          color: #ffffff !important;
        }

        :global(.section-body) {
          padding: 1.5rem !important;
        }

        /* Empty State */
        .empty-section {
          text-align: center;
          padding: 3rem 2rem;
        }

        .empty-icon {
          font-size: 3rem;
          color: rgba(255, 255, 255, 0.2);
          margin-bottom: 0.75rem;
        }

        .empty-section p {
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }

        /* Employees Grid */
        .employees-grid {
          display: grid;
          gap: 1rem;
        }

        .employee-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .employee-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(102, 126, 234, 0.2);
        }

        .employee-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
          min-width: 0;
        }

        .employee-avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .employee-details {
          flex: 1;
          min-width: 0;
        }

        .employee-name {
          font-weight: 600 !important;
          color: #ffffff !important;
          margin-bottom: 0.25rem !important;
        }

        .employee-email {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
        }

        .employee-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }

        :global(.admin-badge) {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          border: none !important;
          padding: 0.35rem 0.75rem !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
        }

        :global(.manager-badge) {
          background: rgba(82, 196, 26, 0.15) !important;
          color: #52c41a !important;
          border: 1px solid rgba(82, 196, 26, 0.3) !important;
          padding: 0.35rem 0.75rem !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
        }

        :global(.user-badge) {
          background: rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.7) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          padding: 0.35rem 0.75rem !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
        }

        .joined-date {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        /* Documents List */
        .documents-list {
          display: grid;
          gap: 0.75rem;
        }

        .document-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .document-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(102, 126, 234, 0.2);
        }

        .document-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: rgba(82, 196, 26, 0.1);
          color: #52c41a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .document-info {
          flex: 1;
          min-width: 0;
        }

        .document-name {
          font-weight: 600 !important;
          color: #ffffff !important;
          margin-bottom: 0.25rem !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        .document-meta {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .company-details-container {
            padding: 1rem;
          }

          .page-header {
            padding: 1rem;
          }

          .header-icon {
            width: 40px;
            height: 40px;
            font-size: 1.2rem;
          }

          .page-header h1 {
            font-size: 1.25rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .employee-item {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .employee-meta {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
