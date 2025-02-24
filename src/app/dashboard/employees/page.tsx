'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Modal, Alert } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaPlus, FaBuilding, FaEnvelope, FaUserTag, FaChevronRight, FaEdit, FaFileDownload } from 'react-icons/fa';
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
}

export default function EmployeesPage() {
  const { data: session } = useSession();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    if (!canEditEmployee(selectedEmployee.companyId, selectedEmployee.role)) {
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
          <div className="employee-info">
            <h3 className="employee-name">{employee.name}</h3>
            <div className="employee-details">
              <div className="detail">
                <FaEnvelope className="detail-icon" />
                <span>{employee.email}</span>
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

  return (
    <DashboardLayout>
      <div className="employees-container">
        <div className="page-header">
          <h1 className="h3">Employees</h1>
          {canCreateEmployee && (
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
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
              <Card>
                <Card.Body>
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Company</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="text-center">Loading...</td>
                        </tr>
                      ) : employees.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center">No employees found</td>
                        </tr>
                      ) : (
                        employees.map((employee) => (
                          <tr key={employee.id}>
                            <td>{employee.name}</td>
                            <td>{employee.email}</td>
                            <td>
                              <Badge bg={employee.role === 'ADMIN' ? 'primary' : 'secondary'}>
                                {employee.role}
                              </Badge>
                            </td>
                            <td>{employee.company.name}</td>
                            <td>
                              {canEditEmployee(employee.companyId, employee.role) && (
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="me-2"
                                  onClick={() => {
                                    setSelectedEmployee(employee);
                                    setShowEditModal(true);
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                              {canExportActivities(employee.id, employee.companyId, employee.role) && (
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => handleExportActivities(employee.id)}
                                >
                                  Export Activity
                                </Button>
                              )}
                              {session?.user?.role === 'MANAGER' && employee.role === 'ADMIN' && (
                                <span className="text-muted ms-2 small">
                                  (Admin user - restricted access)
                                </span>
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
                              <span>{employee.email}</span>
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
            Are you sure you want to delete {selectedEmployee?.name}? This action cannot be undone.
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteEmployee}>
              Delete Employee
            </Button>
          </Modal.Footer>
        </Modal>

        <style jsx>{`
          .employees-container {
            padding: 1rem;
          }

          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }

          .page-header h1 {
            margin: 0;
          }

          /* Mobile Styles */
          @media (max-width: 1023px) {
            .employees-container {
              padding: 0.5rem;
            }

            .page-header {
              padding: 0.5rem;
              margin-bottom: 1rem;
              flex-wrap: wrap;
              gap: 1rem;
            }

            .page-header h1 {
              font-size: 1.5rem;
              width: 100%;
            }

            .page-header button {
              width: 100%;
            }

            .employee-card {
              margin: 0.5rem 0;
            }

            .mobile-view {
              display: block;
              padding: 0.5rem;
            }

            .desktop-view {
              display: none;
            }

            .employee-content {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 1rem;
            }

            .employee-info {
              flex: 1;
              min-width: 0;
            }

            :global(.employee-actions) {
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
              color: #6c757d;
              transition: all 0.2s ease;
            }

            :global(.action-btn:hover) {
              background-color: rgba(108, 117, 125, 0.1);
            }

            :global(.edit-btn) {
              color: #0d6efd;
            }

            :global(.export-btn) {
              color: #198754;
            }

            :global(.action-btn svg) {
              width: 18px;
              height: 18px;
            }
          }

          /* Desktop Styles */
          @media (min-width: 1024px) {
            .employees-container {
              padding: 2rem;
            }

            .mobile-view {
              display: none;
            }

            .desktop-view {
              display: block;
            }
          }

          /* Global styles for employee actions */
          :global(.employee-actions) {
            display: flex;
            flex-direction: row;
            gap: 0.5rem;
            margin-left: auto;
            align-items: center;
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
} 