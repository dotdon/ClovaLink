'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, Spinner, Button } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission, Permission } from '@/lib/permissions';
import { FaUsers, FaFileAlt, FaCalendar, FaBuilding, FaArrowLeft, FaEnvelope, FaShieldAlt, FaCamera, FaTrash } from 'react-icons/fa';

interface Company {
  id: string;
  name: string;
  logo?: string | null;
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
  const { data: session } = useSession();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const employeesPerPage = 10;

  const canEditCompany = hasPermission(session, Permission.EDIT_COMPANIES);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const response = await fetch(`/api/companies/${params.id}?employeePage=${currentPage}&employeesPerPage=${employeesPerPage}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch company details');
        }

        const companyData = await response.json();
        setCompany(companyData);
        if (companyData.pagination) {
          setTotalPages(companyData.pagination.totalPages);
          setTotalEmployees(companyData.pagination.totalEmployees);
        }
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
  }, [params.id, currentPage]);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(`/api/companies/${params.id}/logo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload logo');
      }

      const data = await response.json();
      
      // Update company state with new logo
      if (company) {
        setCompany({ ...company, logo: data.logo });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async () => {
    if (!company || !confirm('Are you sure you want to remove the company logo?')) return;

    try {
      const response = await fetch(`/api/companies/${params.id}/logo`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete logo');
      }

      // Update company state
      setCompany({ ...company, logo: null });
    } catch (error) {
      console.error('Error deleting logo:', error);
      alert('Failed to delete logo. Please try again.');
    }
  };

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
            <div className="header-icon-wrapper">
              <div className="header-icon">
                {company.logo ? (
                  <img 
                    src={`/api/companies/logo/${company.logo}`} 
                    alt={company.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <FaBuilding />
                )}
              </div>
              {canEditCompany && (
                <div className="logo-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleLogoUpload}
                  />
                  <Button
                    variant="link"
                    className="logo-btn upload"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    title={company.logo ? 'Change Logo' : 'Upload Logo'}
                  >
                    <FaCamera />
                  </Button>
                  {company.logo && (
                    <Button
                      variant="link"
                      className="logo-btn delete"
                      onClick={handleDeleteLogo}
                      title="Remove Logo"
                    >
                      <FaTrash />
                    </Button>
                  )}
                </div>
              )}
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

            {/* Pagination */}
            {!isLoading && company.employees.length > 0 && totalPages > 1 && (
              <div className="pagination-container" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1.5rem',
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <Button
                  variant="outline-light"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </Button>
                <div style={{
                  color: '#ffffff',
                  fontWeight: 500,
                  fontSize: '0.95rem'
                }}>
                  Page {currentPage} of {totalPages}
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)', marginLeft: '0.5rem' }}>
                    ({totalEmployees} total employees)
                  </span>
                </div>
                <Button
                  variant="outline-light"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                </Button>
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

        .header-icon-wrapper {
          position: relative;
          display: inline-block;
        }

        .header-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background: #667eea;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: white;
          flex-shrink: 0;
          overflow: hidden;
        }

        .logo-actions {
          position: absolute;
          bottom: -8px;
          right: -8px;
          display: flex;
          gap: 0.25rem;
        }

        :global(.logo-btn) {
          width: 28px !important;
          height: 28px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          background: rgba(255, 255, 255, 0.95) !important;
          border: 2px solid #667eea !important;
          transition: all 0.2s ease !important;
          font-size: 0.75rem !important;
        }

        :global(.logo-btn.upload) {
          color: #667eea !important;
        }

        :global(.logo-btn.delete) {
          color: #dc3545 !important;
          border-color: #dc3545 !important;
        }

        :global(.logo-btn:hover:not(:disabled)) {
          transform: scale(1.1) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
        }

        :global(.logo-btn:disabled) {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
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
          background: #667eea;
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
          background: #667eea !important;
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

        /* Pagination */
        :global(.pagination-btn) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #ffffff !important;
          padding: 0.6rem 1.25rem !important;
          border-radius: 8px !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
        }

        :global(.pagination-btn:hover:not(:disabled)) {
          background: rgba(102, 126, 234, 0.2) !important;
          border-color: #667eea !important;
          transform: translateY(-1px) !important;
        }

        :global(.pagination-btn:disabled) {
          opacity: 0.4 !important;
          cursor: not-allowed !important;
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
