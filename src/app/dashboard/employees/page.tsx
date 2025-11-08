'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Modal, Alert } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaPlus, FaBuilding, FaEnvelope, FaUserTag, FaChevronRight, FaEdit, FaFileDownload, FaTrash, FaShieldAlt, FaKey, FaUser, FaUserShield } from 'react-icons/fa';
import AddEmployeeModal from '@/components/modals/AddEmployeeModal';
import EditEmployeeModal from '@/components/modals/EditEmployeeModal';
import { useSession } from 'next-auth/react';
import { hasPermission, Permission, canAccessCompany } from '@/lib/permissions';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  company: {
    name: string;
  };
  createdAt: string;
  totpEnabled?: boolean;
  passkeys?: Array<{ id: string }>;
  profilePicture?: string | null;
}

export default function EmployeesPage() {
  const { data: session } = useSession();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  // Permission checks
  const canViewEmployees = hasPermission(session, Permission.VIEW_EMPLOYEES);
  const canCreateEmployee = hasPermission(session, Permission.CREATE_EMPLOYEES);
  const canEditEmployee = (employeeCompanyId: string, employeeRole: string) => {
    if (!session?.user) return false;
    
    // Admins can edit any employee
    if (session.user.role === 'ADMIN') return true;
    
    // Managers can only edit non-admin employees in their company
    if (session.user.role === 'MANAGER' && session.user.companyId === employeeCompanyId) {
      return employeeRole !== 'ADMIN';
    }
    
    return false;
  };

  // Check if user can delete/manage this employee
  // Only admins can delete/manage managers
  const canDeleteEmployee = (employeeRole: string) => {
    if (!session?.user) return false;
    
    // Only admins can delete/manage managers
    if (employeeRole === 'MANAGER' || employeeRole === 'ADMIN') {
      return session.user.role === 'ADMIN';
    }
    
    // For regular users, use canEditEmployee logic
    return true;
  };

  // Check if email should be hidden (hide admin emails from non-admins)
  const shouldHideEmail = (employeeRole: string) => {
    if (!session?.user) return false;
    return employeeRole === 'ADMIN' && session.user.role !== 'ADMIN';
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (data: { name: string; email: string; role: string; password: string; companyId: string }) => {
    if (!canCreateEmployee) {
      throw new Error('You do not have permission to create employees');
    }

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create employee');
      }

      await fetchEmployees();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  };

  const handleEditEmployee = async (data: {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId: string;
    password?: string;
  }) => {
    if (!canEditEmployee(data.companyId, data.role)) {
      throw new Error('You do not have permission to edit this employee');
    }

    try {
      const response = await fetch(`/api/employees/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update employee');
      }

      await fetchEmployees();
      setShowEditModal(false);
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    if (!canDeleteEmployee(selectedEmployee.role)) {
      throw new Error('You do not have permission to delete this employee');
    }

    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete employee');
      }

      await fetchEmployees();
      setShowDeleteModal(false);
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete employee');
    }
  };

  const handleExportActivities = async (employeeId: string) => {
    const downloadUrl = `/api/activities/export?employeeId=${employeeId}`;
    window.open(downloadUrl, '_blank');
  };

  const canExportActivities = (employeeId: string, employeeCompanyId: string, employeeRole: string) => {
    if (!session?.user) return false;
    
    // Admins can export activities for any employee
    if (session.user.role === 'ADMIN') return true;
    
    // Managers can only export activities for non-admin employees in their company
    if (session.user.role === 'MANAGER' && session.user.companyId === employeeCompanyId) {
      return employeeRole !== 'ADMIN';
    }
    
    return false;
  };

  // Mobile employee card component
  const EmployeeCard = ({ employee }: { employee: Employee }) => (
    <Card className="employee-card mb-3">
      <Card.Body>
        <div className="employee-content">
          <div className="employee-avatar">
            {employee.profilePicture ? (
              <img 
                src={`/api/employees/profile-picture/${employee.profilePicture}`}
                alt={employee.name}
              />
            ) : (
              <div className="avatar-placeholder">{employee.name.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="employee-info">
            <h3 className="employee-name">{employee.name}</h3>
            <div className="employee-details">
              <div className="detail">
                <FaEnvelope className="detail-icon" />
                <span>
                  {shouldHideEmail(employee.role) ? (
                    <span className="text-muted">••••••••</span>
                  ) : (
                    employee.email
                  )}
                </span>
              </div>
              <div className="detail">
                <FaBuilding className="detail-icon" />
                <span>{employee.company.name}</span>
              </div>
              <div className="detail">
                <FaUserTag className="detail-icon" />
                <Badge bg={employee.role === 'ADMIN' ? 'primary' : 'secondary'}>
                  {employee.role}
                </Badge>
                {session?.user?.role === 'MANAGER' && employee.role === 'ADMIN' && (
                  <span className="text-muted ms-2 small">
                    (restricted access)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="employee-actions">
            {canEditEmployee(employee.companyId, employee.role) && (
              <>
                <Button
                  variant="link"
                  className="action-btn edit-btn"
                  onClick={() => {
                    setSelectedEmployee(employee);
                    setShowEditModal(true);
                  }}
                >
                  <FaEdit />
                </Button>
                {canDeleteEmployee(employee.role) && (
                  <>
                    <Button
                      variant="link"
                      className="action-btn"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShow2FAModal(true);
                      }}
                      title="Manage 2FA"
                    >
                      <FaKey />
                    </Button>
                    <Button
                      variant="link"
                      className="action-btn"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowDeleteModal(true);
                      }}
                      title="Delete Employee"
                    >
                      <FaTrash />
                    </Button>
                  </>
                )}
              </>
            )}
            {canExportActivities(employee.id, employee.companyId, employee.role) && (
              <Button
                variant="link"
                className="action-btn export-btn"
                onClick={() => handleExportActivities(employee.id)}
              >
                <FaFileDownload />
              </Button>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );

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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <FaUserShield />;
      case 'MANAGER':
        return <FaUserTag />;
      default:
        return <FaUser />;
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = employees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(employees.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <DashboardLayout>
      <div className="employees-container">
        {/* Page Header */}
        <div className="page-header">
          <div className="header-content">
            <div className="header-icon">
              <FaUserShield />
            </div>
            <div>
              <h1>Employee Management</h1>
              <p className="header-subtitle">Manage your team members and their access</p>
            </div>
          </div>
          {canCreateEmployee && (
            <Button variant="primary" className="add-btn" onClick={() => setShowAddModal(true)}>
              <FaPlus className="me-2" /> Add Employee
            </Button>
          )}
        </div>

        {!canViewEmployees ? (
          <Alert variant="info" className="mb-4">
            <Alert.Heading>Limited Access</Alert.Heading>
            <p>
              You have limited access to view employee information. This is normal for your user role.
              If you need to view or manage employees, please contact your administrator.
            </p>
          </Alert>
        ) : (
          <>
            {/* Desktop View */}
            <div className="desktop-view">
              <div className="employees-grid">
                {isLoading ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading employees...</p>
                  </div>
                ) : employees.length === 0 ? (
                  <div className="empty-state">
                    <FaUserShield className="empty-icon" />
                    <h3>No Employees Found</h3>
                    <p>Start by adding your first team member</p>
                  </div>
                ) : (
                  currentEmployees.map((employee) => (
                    <Card key={employee.id} className="employee-card-desktop">
                      <Card.Body>
                        <div className="employee-card-header">
                          <div className="employee-avatar-section">
                            <div className="employee-avatar-desktop">
                              {employee.profilePicture ? (
                                <img 
                                  src={`/api/employees/profile-picture/${employee.profilePicture}`}
                                  alt={employee.name}
                                />
                              ) : (
                                <div className="avatar-placeholder">
                                  {employee.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="employee-main-info">
                              <h3 className="employee-name-desktop">{employee.name}</h3>
                              <div className="employee-email">
                                <FaEnvelope className="info-icon" />
                                {shouldHideEmail(employee.role) ? (
                                  <span className="text-muted">••••••••</span>
                                ) : (
                                  employee.email
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="employee-actions-desktop">
                            {canEditEmployee(employee.companyId, employee.role) && (
                              <>
                                <Button
                                  variant="link"
                                  className="action-btn-desktop edit"
                                  onClick={() => {
                                    setSelectedEmployee(employee);
                                    setShowEditModal(true);
                                  }}
                                  title="Edit Employee"
                                >
                                  <FaEdit />
                                </Button>
                                {canDeleteEmployee(employee.role) && (
                                  <>
                                    <Button
                                      variant="link"
                                      className="action-btn-desktop security"
                                      onClick={() => {
                                        setSelectedEmployee(employee);
                                        setShow2FAModal(true);
                                      }}
                                      title="Manage 2FA"
                                    >
                                      <FaKey />
                                    </Button>
                                    <Button
                                      variant="link"
                                      className="action-btn-desktop delete"
                                      onClick={() => {
                                        setSelectedEmployee(employee);
                                        setShowDeleteModal(true);
                                      }}
                                      title="Delete Employee"
                                    >
                                      <FaTrash />
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                            {canExportActivities(employee.id, employee.companyId, employee.role) && (
                              <Button
                                variant="link"
                                className="action-btn-desktop export"
                                onClick={() => handleExportActivities(employee.id)}
                                title="Export Activity"
                              >
                                <FaFileDownload />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="employee-card-body">
                          <div className="info-grid">
                            <div className="info-item">
                              <div className="info-label">
                                {getRoleIcon(employee.role)}
                                <span>Role</span>
                              </div>
                              <div className={`role-badge ${getRoleBadgeColor(employee.role)}`}>
                                {employee.role}
                              </div>
                            </div>
                            
                            <div className="info-item">
                              <div className="info-label">
                                <FaBuilding />
                                <span>Company</span>
                              </div>
                              <div className="info-value">{employee.company.name}</div>
                            </div>
                            
                            <div className="info-item">
                              <div className="info-label">
                                <FaShieldAlt />
                                <span>2FA Status</span>
                              </div>
                              <div className="security-status">
                                {employee.totpEnabled || (employee.passkeys && employee.passkeys.length > 0) ? (
                                  <div className="security-badge enabled">
                                    <FaShieldAlt />
                                    <span>
                                      {employee.totpEnabled && employee.passkeys && employee.passkeys.length > 0 
                                        ? 'TOTP + Passkey'
                                        : employee.totpEnabled 
                                        ? 'TOTP Enabled'
                                        : 'Passkey Enabled'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="security-badge disabled">
                                    <span>Not Enabled</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {session?.user?.role === 'MANAGER' && employee.role === 'ADMIN' && (
                          <div className="restricted-banner">
                            <FaShieldAlt />
                            <span>Restricted Access</span>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination */}
              {!isLoading && employees.length > itemsPerPage && (
                <div className="pagination-container">
                  <Button
                    variant="outline-light"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    Previous
                  </Button>
                  <div className="pagination-info">
                    Page {currentPage} of {totalPages}
                    <span className="text-muted ms-2">({employees.length} total employees)</span>
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
            </div>

            {/* Mobile View */}
            <div className="mobile-view">
              {isLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : employees.length === 0 ? (
                <div className="text-center py-4">No employees found</div>
              ) : (
                employees.map((employee) => (
                  <Card key={employee.id} className="employee-card mb-3">
                    <Card.Body>
                      <div className="employee-content">
                        <div className="employee-info">
                          <h3 className="employee-name">{employee.name}</h3>
                          <div className="employee-details">
                            <div className="detail">
                              <FaEnvelope className="detail-icon" />
                              <span>
                                {shouldHideEmail(employee.role) ? (
                                  <span className="text-muted">••••••••</span>
                                ) : (
                                  employee.email
                                )}
                              </span>
                            </div>
                            <div className="detail">
                              <FaBuilding className="detail-icon" />
                              <span>{employee.company.name}</span>
                            </div>
                            <div className="detail">
                              <FaUserTag className="detail-icon" />
                              <Badge bg={employee.role === 'ADMIN' ? 'primary' : 'secondary'}>
                                {employee.role}
                              </Badge>
                              {session?.user?.role === 'MANAGER' && employee.role === 'ADMIN' && (
                                <span className="text-muted ms-2 small">
                                  (restricted access)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="employee-actions">
                          {canEditEmployee(employee.companyId, employee.role) && (
                            <>
                              <Button
                                variant="link"
                                className="action-btn edit-btn"
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setShowEditModal(true);
                                }}
                              >
                                <FaEdit />
                              </Button>
                              {canDeleteEmployee(employee.role) && (
                                <>
                                  <Button
                                    variant="link"
                                    className="action-btn"
                                    onClick={() => {
                                      setSelectedEmployee(employee);
                                      setShow2FAModal(true);
                                    }}
                                    title="Manage 2FA"
                                  >
                                    <FaKey />
                                  </Button>
                                  <Button
                                    variant="link"
                                    className="action-btn"
                                    onClick={() => {
                                      setSelectedEmployee(employee);
                                      setShowDeleteModal(true);
                                    }}
                                    title="Delete Employee"
                                  >
                                    <FaTrash />
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                          {canExportActivities(employee.id, employee.companyId, employee.role) && (
                            <Button
                              variant="link"
                              className="action-btn export-btn"
                              onClick={() => handleExportActivities(employee.id)}
                            >
                              <FaFileDownload />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {canCreateEmployee && (
          <AddEmployeeModal
            show={showAddModal}
            onHide={() => setShowAddModal(false)}
            onSubmit={handleAddEmployee}
          />
        )}

        {selectedEmployee && canEditEmployee(selectedEmployee.companyId, selectedEmployee.role) && (
          <EditEmployeeModal
            show={showEditModal}
            onHide={() => {
              setShowEditModal(false);
              setSelectedEmployee(null);
            }}
            employee={selectedEmployee}
            onSubmit={handleEditEmployee}
          />
        )}

        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="danger">
              <strong>Warning:</strong> This action cannot be undone!
            </Alert>
            <p>Are you sure you want to delete <strong>{selectedEmployee?.name}</strong>?</p>
            <p className="text-muted">This will permanently remove:</p>
            <ul className="text-muted">
              <li>Employee account and credentials</li>
              <li>All associated passkeys and 2FA settings</li>
              <li>Activity logs will be preserved</li>
              <li>Documents uploaded by this user will remain</li>
            </ul>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteEmployee}>
              <FaTrash className="me-2" />
              Delete Employee
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={show2FAModal} onHide={() => setShow2FAModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <FaShieldAlt className="me-2" />
              2FA Management - {selectedEmployee?.name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <h6 className="mb-3">Current 2FA Status</h6>
            <div className="mb-4">
              {selectedEmployee?.totpEnabled ? (
                <Alert variant="success">
                  <strong>✓ TOTP Enabled</strong>
                  <p className="mb-0 mt-2">This employee has authenticator app 2FA enabled</p>
                </Alert>
              ) : (
                <Alert variant="secondary">
                  <strong>○ TOTP Not Enabled</strong>
                  <p className="mb-0 mt-2">This employee has not set up authenticator app 2FA</p>
                </Alert>
              )}

              {selectedEmployee?.passkeys && selectedEmployee.passkeys.length > 0 ? (
                <Alert variant="success">
                  <strong>✓ Passkeys Enabled</strong>
                  <p className="mb-0 mt-2">
                    This employee has {selectedEmployee.passkeys.length} passkey(s) registered
                  </p>
                </Alert>
              ) : (
                <Alert variant="secondary">
                  <strong>○ No Passkeys</strong>
                  <p className="mb-0 mt-2">This employee has not registered any passkeys</p>
                </Alert>
              )}

              {!selectedEmployee?.totpEnabled && (!selectedEmployee?.passkeys || selectedEmployee.passkeys.length === 0) && (
                <Alert variant="warning">
                  <strong>⚠️ No 2FA Configured</strong>
                  <p className="mb-0 mt-2">This employee does not have any form of 2FA enabled. They will be prompted to set it up if required by organization policy.</p>
                </Alert>
              )}
            </div>

            <Alert variant="info">
              <strong>Note:</strong> Employees must enable 2FA themselves through their Account page. Admins cannot force-enable 2FA but can view status and ensure compliance with organization policies.
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShow2FAModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        <style jsx>{`
          .employees-container {
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
            color: #ffffff;
          }

          .header-subtitle {
            margin: 0.15rem 0 0 0;
            color: rgba(255, 255, 255, 0.6);
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
          }

          :global(.add-btn:hover) {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
          }

          /* Loading and Empty States */
          .loading-state, .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            color: rgba(255, 255, 255, 0.7);
          }

          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .empty-icon {
            font-size: 4rem;
            color: rgba(255, 255, 255, 0.3);
            margin-bottom: 1rem;
          }

          .empty-state h3 {
            color: #ffffff;
            margin-bottom: 0.5rem;
          }

          /* Desktop Grid Layout */
          .employees-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1rem;
          }

          /* Employee Cards */
          :global(.employee-card-desktop) {
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 12px !important;
            transition: all 0.2s ease !important;
            overflow: hidden !important;
          }

          :global(.employee-card-desktop:hover) {
            transform: translateY(-2px) !important;
            border-color: rgba(102, 126, 234, 0.4) !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
          }

          :global(.employee-card-desktop .card-body) {
            padding: 1rem !important;
          }

          .employee-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .employee-avatar-section {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex: 1;
            min-width: 0;
          }

          .employee-avatar-desktop {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid #667eea;
            flex-shrink: 0;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          }

          .employee-avatar-desktop img {
            width: 100%;
            height: 100%;
            object-fit: cover;
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

          .employee-main-info {
            flex: 1;
            min-width: 0;
          }

          .employee-name-desktop {
            font-size: 1rem;
            font-weight: 600;
            color: #ffffff !important;
            margin: 0 0 0.35rem 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .employee-email {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.8rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .info-icon {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.85rem;
          }

          /* Action Buttons */
          .employee-actions-desktop {
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

          :global(.action-btn-desktop.edit) {
            color: #667eea !important;
          }

          :global(.action-btn-desktop.security) {
            color: #17a2b8 !important;
          }

          :global(.action-btn-desktop.delete) {
            color: #ff6b6b !important;
          }

          :global(.action-btn-desktop.export) {
            color: #51cf66 !important;
          }

          /* Info Grid */
          .employee-card-body {
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
          }

          .info-value {
            color: #ffffff !important;
            font-weight: 500;
            font-size: 0.85rem;
          }

          /* Role Badges */
          .role-badge {
            padding: 0.35rem 0.75rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }

          .admin-badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
          }

          .manager-badge {
            background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
            color: white;
            box-shadow: 0 2px 10px rgba(23, 162, 184, 0.3);
          }

          .user-badge {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          /* Security Status */
          .security-status {
            display: flex;
            align-items: center;
          }

          .security-badge {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.35rem 0.7rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 500;
          }

          .security-badge.enabled {
            background: rgba(82, 196, 26, 0.15);
            color: #52c41a;
            border: 1px solid rgba(82, 196, 26, 0.3);
          }

          .security-badge.enabled svg {
            font-size: 0.75rem;
          }

          .security-badge.disabled {
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          /* Restricted Banner */
          .restricted-banner {
            margin-top: 0.75rem;
            padding: 0.5rem 0.75rem;
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            color: #ffc107;
            font-size: 0.75rem;
            font-weight: 500;
          }

          /* Pagination */
          .pagination-container {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1.5rem;
            margin-top: 2rem;
            padding: 1.5rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
          }

          .pagination-info {
            color: #ffffff;
            font-weight: 500;
            font-size: 0.95rem;
          }

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

          /* Mobile Styles */
          @media (max-width: 1023px) {
            .employees-container {
              padding: 1rem;
            }

            .page-header {
              flex-direction: column;
              align-items: stretch;
              padding: 1.5rem;
              gap: 1rem;
            }

            .header-content {
              flex-direction: row;
              gap: 1rem;
            }

            .header-icon {
              width: 50px;
              height: 50px;
              font-size: 1.5rem;
            }

            .page-header h1 {
              font-size: 1.5rem;
            }

            :global(.add-btn) {
              width: 100% !important;
            }

            .mobile-view {
              display: block;
            }

            .desktop-view {
              display: none;
            }

            .employees-grid {
              grid-template-columns: 1fr;
              gap: 1rem;
            }
          }

          /* Desktop Styles */
          @media (min-width: 1024px) {
            .mobile-view {
              display: none;
            }

            .desktop-view {
              display: block;
            }
          }

          /* Large Screens */
          @media (min-width: 1600px) {
            .employees-grid {
              grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            }
          }

          @media (min-width: 2000px) {
            .employees-grid {
              grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
} 