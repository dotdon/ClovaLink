'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Modal, Alert } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaPlus, FaBuilding, FaEnvelope, FaUserTag, FaChevronRight, FaEdit, FaFileDownload, FaTrash, FaShieldAlt, FaKey, FaUser, FaUserShield, FaExclamationTriangle, FaUserSlash, FaHistory, FaFileAlt, FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';
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
          <div className="header-icon">
            <FaUserShield />
          </div>
          <div className="header-text">
            <h1>Employee Management</h1>
            <p className="header-subtitle">Manage your team members and their access</p>
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

        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered className="delete-employee-modal">
          <Modal.Header closeButton className="delete-modal-header">
            <Modal.Title className="d-flex align-items-center gap-2">
              <div className="delete-modal-icon">
                <FaTrash />
              </div>
              <span>Confirm Delete</span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="delete-modal-body">
            <div className="warning-box">
              <FaExclamationTriangle className="warning-icon" />
              <div>
                <strong>Warning: This action cannot be undone!</strong>
                <p className="mb-0 mt-1">All employee data will be permanently deleted.</p>
              </div>
            </div>
            
            <p className="delete-question">
              Are you sure you want to delete <strong>{selectedEmployee?.name}</strong>?
            </p>
            
            <div className="impact-section">
              <h6 className="impact-title">This will permanently remove:</h6>
              <ul className="impact-list">
                <li><FaUserSlash className="me-2" />Employee account and credentials</li>
                <li><FaKey className="me-2" />All associated passkeys and 2FA settings</li>
                <li><FaHistory className="me-2" />Activity logs will be preserved</li>
                <li><FaFileAlt className="me-2" />Documents uploaded by this user will remain</li>
              </ul>
            </div>
          </Modal.Body>
          <Modal.Footer className="delete-modal-footer">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)} className="delete-cancel-btn">
              Cancel
            </Button>
            <Button onClick={handleDeleteEmployee} className="delete-confirm-btn">
              <FaTrash className="me-2" />
              Delete Employee
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={show2FAModal} onHide={() => setShow2FAModal(false)} size="lg" centered className="twofa-modal">
          <Modal.Header closeButton className="twofa-modal-header">
            <Modal.Title className="d-flex align-items-center gap-2">
              <div className="twofa-modal-icon">
                <FaShieldAlt />
              </div>
              <div>
                <div>2FA Management</div>
                <div className="employee-name-subtitle">{selectedEmployee?.name}</div>
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="twofa-modal-body">
            <h6 className="status-section-title">
              <FaShieldAlt className="me-2" />
              Current 2FA Status
            </h6>
            
            <div className="status-cards">
              {selectedEmployee?.totpEnabled ? (
                <div className="status-card status-enabled">
                  <div className="status-icon">
                    <FaCheckCircle />
                  </div>
                  <div className="status-content">
                    <strong>TOTP Enabled</strong>
                    <p>This employee has authenticator app 2FA enabled</p>
                  </div>
                </div>
              ) : (
                <div className="status-card status-disabled">
                  <div className="status-icon">
                    <FaTimesCircle />
                  </div>
                  <div className="status-content">
                    <strong>TOTP Not Enabled</strong>
                    <p>This employee has not set up authenticator app 2FA</p>
                  </div>
                </div>
              )}

              {selectedEmployee?.passkeys && selectedEmployee.passkeys.length > 0 ? (
                <div className="status-card status-enabled">
                  <div className="status-icon">
                    <FaCheckCircle />
                  </div>
                  <div className="status-content">
                    <strong>Passkeys Enabled</strong>
                    <p>
                      This employee has {selectedEmployee.passkeys.length} passkey(s) registered
                    </p>
                  </div>
                </div>
              ) : (
                <div className="status-card status-disabled">
                  <div className="status-icon">
                    <FaTimesCircle />
                  </div>
                  <div className="status-content">
                    <strong>No Passkeys</strong>
                    <p>This employee has not registered any passkeys</p>
                  </div>
                </div>
              )}

              {!selectedEmployee?.totpEnabled && (!selectedEmployee?.passkeys || selectedEmployee.passkeys.length === 0) && (
                <div className="status-card status-warning">
                  <div className="status-icon">
                    <FaExclamationTriangle />
                  </div>
                  <div className="status-content">
                    <strong>No 2FA Configured</strong>
                    <p>This employee does not have any form of 2FA enabled. They will be prompted to set it up if required by organization policy.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="info-box">
              <FaInfoCircle className="info-icon" />
              <div>
                <strong>Note:</strong> Employees must enable 2FA themselves through their Account page. Admins cannot force-enable 2FA but can view status and ensure compliance with organization policies.
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="twofa-modal-footer">
            <Button variant="secondary" onClick={() => setShow2FAModal(false)} className="twofa-close-btn">
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        <style jsx>{`
          .employees-container {
            padding: 1rem;
            max-width: 100%;
          }

          /* Page Header */
          .page-header {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            margin-bottom: 2rem;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 16px;
            padding: 1.75rem 2rem;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(102, 126, 234, 0.2);
          }

          .page-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: white;
            flex-shrink: 0;
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
            position: relative;
          }

          .header-icon::after {
            content: '';
            position: absolute;
            inset: -2px;
            border-radius: 16px;
            padding: 2px;
            background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1));
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
          }

          .header-text {
            flex: 1;
            min-width: 0;
          }

          .page-header h1 {
            margin: 0;
            font-size: 1.75rem;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          }

          .header-subtitle {
            margin: 0.35rem 0 0 0;
            color: rgba(255, 255, 255, 0.75);
            font-size: 0.95rem;
            font-weight: 400;
          }

          :global(.add-btn) {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border: none !important;
            padding: 0.75rem 1.75rem !important;
            border-radius: 12px !important;
            font-weight: 600 !important;
            font-size: 0.95rem !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.5) !important;
            color: white !important;
            margin-left: auto !important;
            position: relative;
            overflow: hidden;
          }

          :global(.add-btn::before) {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
          }

          :global(.add-btn:hover::before) {
            width: 300px;
            height: 300px;
          }

          :global(.add-btn:hover) {
            transform: translateY(-3px) scale(1.02) !important;
            box-shadow: 0 8px 30px rgba(102, 126, 234, 0.7) !important;
          }

          :global(.add-btn:active) {
            transform: translateY(-1px) scale(0.98) !important;
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
              padding: 0.75rem;
            }

            .page-header {
              flex-direction: column;
              align-items: center;
              padding: 1rem;
              gap: 0.75rem;
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

            :global(.add-btn) {
              width: 100% !important;
              padding: 0.7rem 1rem !important;
              font-size: 0.9rem !important;
            }

            .mobile-view {
              display: block;
            }

            .desktop-view {
              display: none;
            }

            .employees-grid {
              grid-template-columns: 1fr;
              gap: 0.75rem;
            }

            /* Mobile employee card optimizations */
            .employee-card-desktop {
              padding: 1rem !important;
            }

            .employee-avatar {
              width: 55px !important;
              height: 55px !important;
            }

            .employee-info h5 {
              font-size: 1rem !important;
            }

            .employee-info p {
              font-size: 0.85rem !important;
            }

            .info-grid {
              grid-template-columns: 1fr !important;
              gap: 0.5rem !important;
            }

            .stat-item {
              padding: 0.5rem !important;
            }

            .stat-label {
              font-size: 0.75rem !important;
            }

            .stat-value {
              font-size: 0.85rem !important;
            }

            /* Mobile-friendly action buttons */
            .employee-actions {
              flex-wrap: wrap;
              gap: 0.5rem !important;
            }

            .employee-actions :global(.btn) {
              padding: 0.5rem 0.75rem !important;
              font-size: 0.85rem !important;
            }

            /* Pagination for mobile */
            .pagination-container {
              flex-direction: column;
              gap: 0.75rem;
              padding: 1rem 0.75rem;
            }

            .pagination-controls {
              width: 100%;
            }

            .pagination-controls :global(.btn) {
              flex: 1;
              padding: 0.6rem !important;
              font-size: 0.9rem !important;
            }

            .pagination-info {
              text-align: center;
              font-size: 0.9rem;
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

          /* Delete Employee Modal Styles */
          :global(.delete-employee-modal .modal-content) {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
            border: 1px solid rgba(220, 53, 69, 0.3) !important;
            border-radius: 16px !important;
            overflow: hidden !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
          }

          :global(.delete-modal-header) {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important;
            border-bottom: none !important;
            padding: 1.5rem 2rem !important;
            color: white !important;
          }

          :global(.delete-modal-header .btn-close) {
            filter: brightness(0) invert(1) !important;
            opacity: 0.8 !important;
          }

          :global(.delete-modal-header .btn-close:hover) {
            opacity: 1 !important;
          }

          :global(.delete-modal-header .modal-title) {
            font-size: 1.5rem !important;
            font-weight: 600 !important;
            color: white !important;
          }

          :global(.delete-modal-icon) {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            font-size: 1.2rem;
          }

          :global(.delete-modal-body) {
            padding: 2rem !important;
            background: transparent !important;
          }

          :global(.warning-box) {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1rem 1.25rem;
            background: rgba(220, 53, 69, 0.1);
            border: 1px solid rgba(220, 53, 69, 0.3);
            border-radius: 12px;
            margin-bottom: 1.5rem;
            color: #ff6b6b;
          }

          :global(.warning-icon) {
            font-size: 1.5rem;
            flex-shrink: 0;
            margin-top: 0.2rem;
          }

          :global(.warning-box strong) {
            display: block;
            font-size: 1rem;
            color: #ff6b6b;
          }

          :global(.warning-box p) {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
          }

          :global(.delete-question) {
            color: rgba(255, 255, 255, 0.9);
            font-size: 1.05rem;
            margin-bottom: 1.5rem;
          }

          :global(.delete-question strong) {
            color: #ffffff;
          }

          :global(.impact-section) {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.25rem;
          }

          :global(.impact-title) {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.95rem;
            font-weight: 600;
            margin-bottom: 1rem;
          }

          :global(.impact-list) {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          :global(.impact-list li) {
            display: flex;
            align-items: center;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
            padding: 0.5rem 0;
          }

          :global(.impact-list li svg) {
            color: #667eea;
            flex-shrink: 0;
          }

          :global(.delete-modal-footer) {
            background: rgba(255, 255, 255, 0.03) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
            padding: 1.5rem 2rem !important;
            gap: 1rem !important;
          }

          :global(.delete-cancel-btn) {
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: #ffffff !important;
            padding: 0.65rem 1.5rem !important;
            border-radius: 10px !important;
            font-weight: 500 !important;
            transition: all 0.3s ease !important;
          }

          :global(.delete-cancel-btn:hover) {
            background: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            transform: translateY(-1px) !important;
          }

          :global(.delete-confirm-btn) {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important;
            border: none !important;
            color: white !important;
            padding: 0.65rem 1.75rem !important;
            border-radius: 10px !important;
            font-weight: 500 !important;
            transition: all 0.3s ease !important;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          :global(.delete-confirm-btn:hover) {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 20px rgba(220, 53, 69, 0.6) !important;
          }

          /* 2FA Modal Styles */
          :global(.twofa-modal .modal-content) {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
            border: 1px solid rgba(102, 126, 234, 0.3) !important;
            border-radius: 16px !important;
            overflow: hidden !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
          }

          :global(.twofa-modal-header) {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border-bottom: none !important;
            padding: 1.5rem 2rem !important;
            color: white !important;
          }

          :global(.twofa-modal-header .btn-close) {
            filter: brightness(0) invert(1) !important;
            opacity: 0.8 !important;
          }

          :global(.twofa-modal-header .btn-close:hover) {
            opacity: 1 !important;
          }

          :global(.twofa-modal-header .modal-title) {
            font-size: 1.5rem !important;
            font-weight: 600 !important;
            color: white !important;
          }

          :global(.twofa-modal-icon) {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            font-size: 1.2rem;
            flex-shrink: 0;
          }

          :global(.employee-name-subtitle) {
            font-size: 0.9rem;
            font-weight: 400;
            opacity: 0.9;
            margin-top: 0.25rem;
          }

          :global(.twofa-modal-body) {
            padding: 2rem !important;
            background: transparent !important;
          }

          :global(.status-section-title) {
            display: flex;
            align-items: center;
            color: #ffffff;
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          :global(.status-cards) {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          :global(.status-card) {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.25rem;
            border-radius: 12px;
            border: 1px solid;
            transition: all 0.2s ease;
          }

          :global(.status-card.status-enabled) {
            background: rgba(82, 196, 26, 0.1);
            border-color: rgba(82, 196, 26, 0.3);
          }

          :global(.status-card.status-disabled) {
            background: rgba(255, 255, 255, 0.03);
            border-color: rgba(255, 255, 255, 0.1);
          }

          :global(.status-card.status-warning) {
            background: rgba(255, 193, 7, 0.1);
            border-color: rgba(255, 193, 7, 0.3);
          }

          :global(.status-card:hover) {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          }

          :global(.status-icon) {
            font-size: 1.5rem;
            flex-shrink: 0;
            margin-top: 0.15rem;
          }

          :global(.status-enabled .status-icon) {
            color: #52c41a;
          }

          :global(.status-disabled .status-icon) {
            color: rgba(255, 255, 255, 0.3);
          }

          :global(.status-warning .status-icon) {
            color: #ffc107;
          }

          :global(.status-content strong) {
            display: block;
            font-size: 1rem;
            margin-bottom: 0.5rem;
          }

          :global(.status-enabled .status-content strong) {
            color: #52c41a;
          }

          :global(.status-disabled .status-content strong) {
            color: rgba(255, 255, 255, 0.6);
          }

          :global(.status-warning .status-content strong) {
            color: #ffc107;
          }

          :global(.status-content p) {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
            margin: 0;
          }

          :global(.info-box) {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 1rem 1.25rem;
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 12px;
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
          }

          :global(.info-icon) {
            color: #667eea;
            font-size: 1.2rem;
            flex-shrink: 0;
            margin-top: 0.15rem;
          }

          :global(.info-box strong) {
            color: #ffffff;
          }

          :global(.twofa-modal-footer) {
            background: rgba(255, 255, 255, 0.03) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
            padding: 1.5rem 2rem !important;
            gap: 1rem !important;
            justify-content: center !important;
          }

          :global(.twofa-close-btn) {
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: #ffffff !important;
            padding: 0.65rem 2rem !important;
            border-radius: 10px !important;
            font-weight: 500 !important;
            transition: all 0.3s ease !important;
          }

          :global(.twofa-close-btn:hover) {
            background: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            transform: translateY(-1px) !important;
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
} 