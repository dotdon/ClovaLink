'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaPlus, FaBuilding, FaUsers, FaFileAlt, FaChevronRight, FaFileDownload, FaCalendar, FaEdit, FaHdd } from 'react-icons/fa';
import AddCompanyModal from '@/components/modals/AddCompanyModal';
import EditCompanyModal from '@/components/modals/EditCompanyModal';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission, Permission, canAccessCompany } from '@/lib/permissions';

interface Company {
  id: string;
  name: string;
  createdAt: string;
  logo?: string | null;
  storageUsed: number;
  _count: {
    employees: number;
    documents: number;
  };
}

export default function CompaniesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check permissions
  const canViewCompanies = hasPermission(session, Permission.VIEW_COMPANIES);
  const canCreateCompany = hasPermission(session, Permission.CREATE_COMPANIES);
  const canEditCompany = hasPermission(session, Permission.EDIT_COMPANIES);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (!response.ok) throw new Error('Failed to fetch companies');
      const { companies } = await response.json();
      setCompanies(companies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch companies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canViewCompanies) {
      fetchCompanies();
    } else {
      setIsLoading(false);
    }
  }, [canViewCompanies]);

  const handleAddCompany = async (data: { name: string }) => {
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create company');
      }

      const { company } = await response.json();
      
      // Refresh the companies list
      await fetchCompanies();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Failed to create company. Please try again.');
    }
  };

  const handleViewCompany = (companyId: string) => {
    router.push(`/dashboard/companies/${companyId}`);
  };

  const handleExportActivities = async (companyId: string) => {
    const downloadUrl = `/api/activities/export?companyId=${companyId}`;
    window.open(downloadUrl, '_blank');
  };

  const canExportCompanyActivities = (companyId: string) => {
    if (!session?.user) return false;
    
    // Only admins can export company-wide activities
    return session.user.role === 'ADMIN';
  };

  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleEditClick = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCompany(company);
    setShowEditModal(true);
  };

  const handleEditCompany = async (data: { id: string; name: string }) => {
    try {
      const response = await fetch(`/api/companies/${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: data.name }),
      });

      if (!response.ok) {
        throw new Error('Failed to update company');
      }

      // Update local state
      setCompanies(companies.map(c => 
        c.id === data.id ? { ...c, name: data.name } : c
      ));
      
      fetchCompanies(); // Refresh to get updated data
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  };

  const handleLogoUpload = async (companyId: string, file: File) => {
    const formData = new FormData();
    formData.append('logo', file);

    const response = await fetch(`/api/companies/${companyId}/logo`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload logo');
    }

    const data = await response.json();
    
    // Update local state
    setCompanies(companies.map(c => 
      c.id === companyId ? { ...c, logo: data.logo } : c
    ));
    
    if (selectedCompany && selectedCompany.id === companyId) {
      setSelectedCompany({ ...selectedCompany, logo: data.logo });
    }
  };

  const handleLogoDelete = async (companyId: string) => {
    const response = await fetch(`/api/companies/${companyId}/logo`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete logo');
    }

    // Update local state
    setCompanies(companies.map(c => 
      c.id === companyId ? { ...c, logo: null } : c
    ));
    
    if (selectedCompany && selectedCompany.id === companyId) {
      setSelectedCompany({ ...selectedCompany, logo: null });
    }
  };

  // Company card component
  const CompanyCard = ({ company }: { company: Company }) => (
    <Card 
      className="company-card-desktop"
      onClick={() => handleViewCompany(company.id)}
      style={{ cursor: 'pointer' }}
    >
      <Card.Body>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '1rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid #667eea',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
            }}>
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
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1.1rem'
                }}>
                  <FaBuilding />
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ffffff',
                marginBottom: '0.35rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>{company.name}</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.8rem'
              }}>
                <FaCalendar style={{ fontSize: '0.7rem', marginRight: '0.25rem' }} />
                Created {new Date(company.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
            {canEditCompany && (
              <Button
                variant="link"
                className="action-btn-desktop edit"
                onClick={(e) => handleEditClick(company, e)}
                title="Edit Company"
              >
                <FaEdit />
              </Button>
            )}
            {canExportCompanyActivities(company.id) && (
              <Button
                variant="link"
                className="action-btn-desktop export"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportActivities(company.id);
                }}
                title="Export Activities"
              >
                <FaFileDownload />
              </Button>
            )}
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.6rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.8rem',
                fontWeight: 500
              }}>
                <FaUsers style={{ fontSize: '0.85rem', color: '#667eea' }} />
                <span>Employees</span>
              </div>
              <div style={{
                color: '#ffffff',
                fontWeight: 500,
                fontSize: '0.85rem'
              }}>{company._count.employees}</div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.6rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.8rem',
                fontWeight: 500
              }}>
                <FaFileAlt style={{ fontSize: '0.85rem', color: '#667eea' }} />
                <span>Documents</span>
              </div>
              <div style={{
                color: '#ffffff',
                fontWeight: 500,
                fontSize: '0.85rem'
              }}>{company._count.documents}</div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.6rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.8rem',
                fontWeight: 500
              }}>
                <FaHdd style={{ fontSize: '0.85rem', color: '#52c41a' }} />
                <span>Storage</span>
              </div>
              <div style={{
                color: '#ffffff',
                fontWeight: 500,
                fontSize: '0.85rem'
              }}>{formatStorageSize(company.storageUsed)}</div>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="companies-container">
        <div className="page-header">
          <div className="header-content">
            <div className="header-icon">
              <FaBuilding />
            </div>
            <div>
              <h1 style={{ color: '#ffffff' }}>Companies</h1>
              <p className="header-subtitle" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Manage and view all companies</p>
            </div>
          </div>
          {canCreateCompany && (
            <Button className="add-btn" onClick={() => setShowAddModal(true)}>
              <FaPlus className="me-2" /> Add Company
            </Button>
          )}
        </div>

        {!canViewCompanies ? (
          <Alert variant="warning" className="permission-alert">
            You do not have permission to view companies. Please contact your administrator for access.
          </Alert>
        ) : error ? (
          <Alert variant="danger" className="error-alert">{error}</Alert>
        ) : (
          <>
            {isLoading ? (
              <div className="loading-state">
                <Spinner animation="border" variant="primary" />
                <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Loading companies...</p>
              </div>
            ) : companies.length === 0 ? (
              <div className="empty-state">
                <FaBuilding className="empty-icon" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                <h3 style={{ color: '#ffffff' }}>No Companies Found</h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Start by adding your first company</p>
                {canCreateCompany && (
                  <Button className="empty-action-btn" onClick={() => setShowAddModal(true)}>
                    <FaPlus className="me-2" /> Add Company
                  </Button>
                )}
              </div>
            ) : (
              <div className="companies-grid">
                {companies.map((company) => (
                  <CompanyCard key={company.id} company={company} />
                ))}
              </div>
            )}
          </>
        )}

        {canCreateCompany && (
          <AddCompanyModal
            show={showAddModal}
            onHide={() => setShowAddModal(false)}
            onSubmit={handleAddCompany}
          />
        )}

        {selectedCompany && canEditCompany && (
          <EditCompanyModal
            show={showEditModal}
            onHide={() => {
              setShowEditModal(false);
              setSelectedCompany(null);
            }}
            company={selectedCompany}
            onSubmit={handleEditCompany}
            onLogoUpload={handleLogoUpload}
            onLogoDelete={handleLogoDelete}
          />
        )}

        <style jsx>{`
          .companies-container {
            padding: 1.5rem;
            max-width: 100%;
          }

          /* Page Header */
          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.25rem 1.5rem;
          }

          .header-content {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .header-icon {
            width: 45px;
            height: 45px;
            border-radius: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            color: white;
            flex-shrink: 0;
          }

          .page-header h1 {
            margin: 0;
            font-size: 1.35rem;
            font-weight: 600;
            color: #ffffff !important;
          }

          .header-subtitle {
            margin: 0.15rem 0 0 0;
            color: rgba(255, 255, 255, 0.6) !important;
            font-size: 0.85rem;
          }

          :global(.add-btn) {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border: none !important;
            padding: 0.6rem 1.25rem !important;
            border-radius: 8px !important;
            font-weight: 500 !important;
            font-size: 0.9rem !important;
            transition: all 0.3s ease !important;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
            color: white !important;
          }

          :global(.add-btn:hover) {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
          }

          /* Loading and Empty States */
          .loading-state,
          .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
          }

          .loading-state p,
          .empty-state p {
            color: rgba(255, 255, 255, 0.6) !important;
            margin-top: 1rem;
          }

          .empty-icon {
            font-size: 4rem;
            color: rgba(255, 255, 255, 0.3) !important;
            margin-bottom: 1rem;
          }

          .empty-state h3 {
            color: #ffffff !important;
            margin-bottom: 0.5rem;
          }

          :global(.empty-action-btn) {
            margin-top: 1.5rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border: none !important;
            padding: 0.65rem 1.5rem !important;
            border-radius: 8px !important;
            font-weight: 500 !important;
            color: white !important;
          }

          /* Companies Grid */
          .companies-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1rem;
          }

          /* Company Cards */
          :global(.company-card-desktop) {
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 12px !important;
            transition: all 0.2s ease !important;
            overflow: hidden !important;
          }

          :global(.company-card-desktop:hover) {
            transform: translateY(-2px) !important;
            border-color: rgba(102, 126, 234, 0.4) !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
          }

          :global(.company-card-desktop .card-body) {
            padding: 1rem !important;
          }

          .company-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .company-avatar-section {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex: 1;
            min-width: 0;
          }

          .company-avatar-desktop {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid #667eea;
            flex-shrink: 0;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          }

          .avatar-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 700;
            font-size: 1.1rem;
          }

          .company-main-info {
            flex: 1;
            min-width: 0;
          }

          .company-name-desktop {
            font-size: 1rem;
            font-weight: 600;
            color: #ffffff !important;
            margin: 0 0 0.35rem 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .company-date {
            display: flex;
            align-items: center;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.8rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* Action Buttons */
          .company-actions-desktop {
            display: flex;
            gap: 0.35rem;
            flex-shrink: 0;
          }

          :global(.action-btn-desktop) {
            width: 32px !important;
            height: 32px !important;
            border-radius: 8px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            transition: all 0.2s ease !important;
            font-size: 0.85rem !important;
          }

          :global(.action-btn-desktop:hover) {
            transform: translateY(-1px) !important;
            border-color: currentColor !important;
            background: rgba(255, 255, 255, 0.1) !important;
          }

          :global(.action-btn-desktop.view) {
            color: #667eea !important;
          }

          :global(.action-btn-desktop.edit) {
            color: #667eea !important;
          }

          :global(.action-btn-desktop.export) {
            color: #51cf66 !important;
          }

          /* Info Grid */
          .company-card-body {
            margin-top: 1rem;
          }

          .info-grid {
            display: grid;
            gap: 0.65rem;
          }

          .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.6rem;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }

          .info-label {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.8rem;
            font-weight: 500;
          }

          .info-label svg {
            font-size: 0.85rem;
            color: #667eea;
          }

          .info-value {
            color: #ffffff !important;
            font-weight: 500;
            font-size: 0.85rem;
          }

          /* Alerts */
          :global(.permission-alert),
          :global(.error-alert) {
            border-radius: 12px !important;
            border: 1px solid !important;
          }

          :global(.permission-alert) {
            background: rgba(255, 193, 7, 0.1) !important;
            border-color: rgba(255, 193, 7, 0.3) !important;
            color: #ffc107 !important;
          }

          :global(.error-alert) {
            background: rgba(220, 53, 69, 0.1) !important;
            border-color: rgba(220, 53, 69, 0.3) !important;
            color: #ff6b6b !important;
          }

          /* Responsive */
          @media (max-width: 1023px) {
            .companies-container {
              padding: 1rem;
            }

            .page-header {
              flex-direction: column;
              align-items: stretch;
              padding: 1rem;
              gap: 1rem;
            }

            .header-content {
              flex-direction: row;
              gap: 0.75rem;
            }

            :global(.add-btn) {
              width: 100% !important;
            }

            .companies-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (min-width: 1600px) {
            .companies-grid {
              grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            }
          }

          @media (min-width: 2000px) {
            .companies-grid {
              grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
} 