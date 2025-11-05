'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Alert } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaPlus, FaBuilding, FaUsers, FaFileAlt, FaChevronRight, FaFileDownload } from 'react-icons/fa';
import AddCompanyModal from '@/components/modals/AddCompanyModal';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission, Permission, canAccessCompany } from '@/lib/permissions';

interface Company {
  id: string;
  name: string;
  createdAt: string;
  _count: {
    employees: number;
    documents: number;
  };
}

export default function CompaniesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check permissions
  const canViewCompanies = hasPermission(session, Permission.VIEW_COMPANIES);
  const canCreateCompany = hasPermission(session, Permission.CREATE_COMPANIES);

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

  // Mobile company card component
  const CompanyCard = ({ company }: { company: Company }) => (
    <Card className="company-card mb-3">
      <Card.Body>
        <div className="company-content">
          <div className="company-info">
            <h3 className="company-name">{company.name}</h3>
            <div className="company-stats">
              <div className="stat">
                <FaUsers className="stat-icon" />
                <span>{company._count.employees} Employees</span>
              </div>
              <div className="stat">
                <FaFileAlt className="stat-icon" />
                <span>{company._count.documents} Documents</span>
              </div>
            </div>
            <div className="company-date">
              Created: {new Date(company.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className="company-actions">
            <Button
              variant="link"
              className="action-btn view-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleViewCompany(company.id);
              }}
            >
              <FaChevronRight />
            </Button>
            {canExportCompanyActivities(company.id) && (
              <Button
                variant="link"
                className="action-btn export-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportActivities(company.id);
                }}
              >
                <FaFileDownload />
              </Button>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="companies-container">
        <div className="page-header">
          <h1 className="h3">Companies</h1>
          {canCreateCompany && (
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              <FaPlus className="me-2" /> Add Company
            </Button>
          )}
        </div>

        {!canViewCompanies ? (
          <Alert variant="warning">
            You do not have permission to view companies. Please contact your administrator for access.
          </Alert>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : (
          <>
            {/* Desktop View */}
            <div className="desktop-view">
              <Card>
                <Card.Body>
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Employees</th>
                        <th>Documents</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="text-center">Loading...</td>
                        </tr>
                      ) : companies.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center">No companies found</td>
                        </tr>
                      ) : (
                        companies.map((company) => (
                          <tr key={company.id}>
                            <td>{company.name}</td>
                            <td>{company._count.employees}</td>
                            <td>{company._count.documents}</td>
                            <td>{new Date(company.createdAt).toLocaleDateString()}</td>
                            <td>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                className="me-2"
                                onClick={() => handleViewCompany(company.id)}
                              >
                                View
                              </Button>
                              {canExportCompanyActivities(company.id) && (
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => handleExportActivities(company.id)}
                                >
                                  Export Activity
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </div>

            {/* Mobile View */}
            <div className="mobile-view">
              {isLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : companies.length === 0 ? (
                <div className="text-center py-4">No companies found</div>
              ) : (
                companies.map((company) => (
                  <CompanyCard key={company.id} company={company} />
                ))
              )}
            </div>
          </>
        )}

        {canCreateCompany && (
          <AddCompanyModal
            show={showAddModal}
            onHide={() => setShowAddModal(false)}
            onSubmit={handleAddCompany}
          />
        )}

        <style jsx>{`
          .companies-container {
            padding: 2.5rem 2rem;
            max-width: 1400px;
            margin: 0 auto;
          }

          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2.5rem;
          }

          .page-header h1 {
            margin: 0;
            font-size: 2rem;
            font-weight: 700;
            color: #ffffff;
          }
          
          :global(.btn-primary) {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            transition: all 0.3s ease;
          }
          
          :global(.btn-primary:hover) {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }

          /* Mobile Styles */
          @media (max-width: 1023px) {
            .companies-container {
              padding: 1.5rem 1rem;
            }

            .page-header {
              padding: 0;
              margin-bottom: 1.5rem;
              flex-wrap: wrap;
              gap: 1rem;
            }

            .page-header h1 {
              font-size: 1.5rem;
              width: 100%;
              color: #ffffff !important;
            }

            .page-header button {
              width: 100%;
            }

            .company-card {
              margin: 0.5rem 0;
            }

            .mobile-view {
              display: block;
              padding: 0.5rem;
            }

            .desktop-view {
              display: none;
            }

            .company-content {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 1rem;
            }

            .company-info {
              flex: 1;
              min-width: 0;
            }

            :global(.company-actions) {
              display: flex;
              flex-direction: row;
              gap: 0.5rem;
              margin-left: auto;
              align-items: center;
            }

            :global(.action-btn) {
              width: 40px;
              height: 40px;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              color: #666;
              transition: all 0.3s ease;
              border: 2px solid #ecf0f1;
              background: #fff;
            }

            :global(.action-btn:hover) {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #fff;
              border-color: #667eea;
              transform: scale(1.1);
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            :global(.view-btn) {
              color: #667eea;
            }

            :global(.export-btn) {
              color: #667eea;
            }

            :global(.action-btn svg) {
              width: 18px;
              height: 18px;
            }
          }

          /* Desktop Styles */
          @media (min-width: 1024px) {
            .companies-container {
              padding: 3rem 2.5rem;
            }
            
            .page-header {
              margin-bottom: 3rem;
            }

            .mobile-view {
              display: none;
            }

            .desktop-view {
              display: block;
            }
          }
          
          @media (min-width: 1440px) {
            .companies-container {
              padding: 3.5rem 3rem;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
} 