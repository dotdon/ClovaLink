'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Modal, Alert, Dropdown } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaPlus, FaBuilding, FaEnvelope, FaUserTag, FaChevronRight, FaEdit, FaFileDownload, FaTrash, FaShieldAlt, FaKey, FaUser, FaUserShield, FaExclamationTriangle, FaUserSlash, FaHistory, FaFileAlt, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaTh, FaThList, FaFilter, FaSearch, FaComments, FaFile as FaFileIcon, FaEllipsisV } from 'react-icons/fa';
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
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  lastLoginLocation?: string | null;
  isActive?: boolean;
  lastActivityAt?: string | null;
}

interface Company {
  id: string;
  name: string;
}

export default function EmployeesPage() {
  const { data: session } = useSession();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [messagesEmployee, setMessagesEmployee] = useState<Employee | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (!response.ok) throw new Error('Failed to fetch companies');
      const data = await response.json();
      // API returns { companies: [...] }
      const companiesList = data.companies || data;
      setCompanies(Array.isArray(companiesList) ? companiesList : []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]); // Ensure it's always an array
    }
  };

  const fetchConversations = async (employeeId: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/admin/messages?employeeId=${employeeId}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchConversationMessages = async (employeeId: string, conversationWith: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/admin/messages?employeeId=${employeeId}&conversationWith=${conversationWith}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setConversationMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setConversationMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleViewMessages = async (employee: Employee) => {
    setMessagesEmployee(employee);
    setSelectedConversation(null);
    setConversationMessages([]);
    setShowMessagesModal(true);
    await fetchConversations(employee.id);
  };

  useEffect(() => {
    fetchEmployees();
    fetchCompanies();
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
            <Dropdown align="end">
              <Dropdown.Toggle variant="link" className="action-menu-btn" id={`dropdown-${employee.id}`}>
                <FaEllipsisV />
              </Dropdown.Toggle>

              <Dropdown.Menu className="action-dropdown-menu">
                {canEditEmployee(employee.companyId, employee.role) && (
                  <>
                    <Dropdown.Item
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowEditModal(true);
                      }}
                    >
                      <FaEdit className="me-2" /> Edit Employee
                    </Dropdown.Item>
                    {canDeleteEmployee(employee.role) && (
                      <>
                        <Dropdown.Item
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShow2FAModal(true);
                          }}
                        >
                          <FaKey className="me-2" /> Manage 2FA
                        </Dropdown.Item>
                        <Dropdown.Divider />
                        <Dropdown.Item
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowDeleteModal(true);
                          }}
                          className="text-danger"
                        >
                          <FaTrash className="me-2" /> Delete Employee
                        </Dropdown.Item>
                      </>
                    )}
                  </>
                )}
                {session?.user?.role === 'ADMIN' && (
                  <>
                    <Dropdown.Divider />
                    <Dropdown.Item
                      onClick={() => handleViewMessages(employee)}
                    >
                      <FaComments className="me-2" /> View Messages
                    </Dropdown.Item>
                  </>
                )}
                {canExportActivities(employee.id, employee.companyId, employee.role) && (
                  <>
                    <Dropdown.Divider />
                    <Dropdown.Item
                      onClick={() => handleExportActivities(employee.id)}
                    >
                      <FaFileDownload className="me-2" /> Export Activities
                    </Dropdown.Item>
                  </>
                )}
              </Dropdown.Menu>
            </Dropdown>
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

  // Filter employees by company and search query
  const filteredEmployees = employees.filter(emp => {
    // Company filter
    const matchesCompany = selectedCompany === 'all' || emp.companyId === selectedCompany;
    
    // Search filter
    const matchesSearch = searchQuery === '' || 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCompany && matchesSearch;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

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
            {/* Filters and View Toggle */}
            <div className="controls-bar">
              <div className="left-controls">
                <div className="search-bar">
                  <FaSearch className="search-icon" style={{ color: '#ffffff' }} />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1); // Reset to first page when searching
                    }}
                    className="search-input"
                  />
                </div>
                <div className="company-filter">
                  <FaFilter className="filter-icon" style={{ color: '#ffffff' }} />
                  <select
                    value={selectedCompany}
                    onChange={(e) => {
                      setSelectedCompany(e.target.value);
                      setCurrentPage(1); // Reset to first page when filtering
                    }}
                    className="company-select"
                  >
                    <option value="all">All Companies</option>
                    {Array.isArray(companies) && companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="results-count">
                  {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                  onClick={() => setViewMode('cards')}
                  title="Card View"
                >
                  <FaTh />
                </button>
                <button
                  className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  <FaThList />
                </button>
              </div>
            </div>

            {/* Desktop View */}
            <div className="desktop-view">
              {viewMode === 'cards' ? (
                <div className="employees-grid">
                  {isLoading ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <p>Loading employees...</p>
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="empty-state">
                      <FaUserShield className="empty-icon" />
                      <h3>No Employees Found</h3>
                      <p>{selectedCompany === 'all' ? 'Start by adding your first team member' : 'No employees in this company'}</p>
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
                            <Dropdown align="end">
                              <Dropdown.Toggle variant="link" className="action-menu-btn-desktop" id={`dropdown-desktop-${employee.id}`}>
                                <FaEllipsisV />
                              </Dropdown.Toggle>

                              <Dropdown.Menu className="action-dropdown-menu">
                                {canEditEmployee(employee.companyId, employee.role) && (
                                  <>
                                    <Dropdown.Item
                                      onClick={() => {
                                        setSelectedEmployee(employee);
                                        setShowEditModal(true);
                                      }}
                                    >
                                      <FaEdit className="me-2" /> Edit Employee
                                    </Dropdown.Item>
                                    {canDeleteEmployee(employee.role) && (
                                      <>
                                        <Dropdown.Item
                                          onClick={() => {
                                            setSelectedEmployee(employee);
                                            setShow2FAModal(true);
                                          }}
                                        >
                                          <FaKey className="me-2" /> Manage 2FA
                                        </Dropdown.Item>
                                        <Dropdown.Divider />
                                        <Dropdown.Item
                                          onClick={() => {
                                            setSelectedEmployee(employee);
                                            setShowDeleteModal(true);
                                          }}
                                          className="text-danger"
                                        >
                                          <FaTrash className="me-2" /> Delete Employee
                                        </Dropdown.Item>
                                      </>
                                    )}
                                  </>
                                )}
                                {session?.user?.role === 'ADMIN' && (
                                  <>
                                    <Dropdown.Divider />
                                    <Dropdown.Item
                                      onClick={() => handleViewMessages(employee)}
                                    >
                                      <FaComments className="me-2" /> View Messages
                                    </Dropdown.Item>
                                  </>
                                )}
                                {canExportActivities(employee.id, employee.companyId, employee.role) && (
                                  <>
                                    <Dropdown.Divider />
                                    <Dropdown.Item
                                      onClick={() => handleExportActivities(employee.id)}
                                    >
                                      <FaFileDownload className="me-2" /> Export Activities
                                    </Dropdown.Item>
                                  </>
                                )}
                              </Dropdown.Menu>
                            </Dropdown>
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
              ) : (
                /* Table View */
                <div className="employees-table-container">
                  {isLoading ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <p>Loading employees...</p>
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="empty-state">
                      <FaUserShield className="empty-icon" />
                      <h3>No Employees Found</h3>
                      <p>{selectedCompany === 'all' ? 'Start by adding your first team member' : 'No employees in this company'}</p>
                    </div>
                  ) : (
                    <table className="employees-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Email</th>
                          <th>Company</th>
                          <th>Role</th>
                          <th>Last Login</th>
                          <th>2FA Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentEmployees.map((employee) => (
                          <tr key={employee.id}>
                            <td className="employee-cell">
                              <div className="employee-info-row">
                                <div className="employee-avatar-small">
                                  {employee.profilePicture ? (
                                    <img 
                                      src={`/api/employees/profile-picture/${employee.profilePicture}`}
                                      alt={employee.name}
                                    />
                                  ) : (
                                    <div className="avatar-placeholder-small">
                                      {employee.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <span className="employee-name-table">{employee.name}</span>
                              </div>
                            </td>
                            <td>
                              {shouldHideEmail(employee.role) ? (
                                <span className="text-muted">••••••••</span>
                              ) : (
                                <span className="employee-email-table">{employee.email}</span>
                              )}
                            </td>
                            <td>
                              <div className="company-badge">
                                <FaBuilding className="company-icon-small" />
                                {employee.company.name}
                              </div>
                            </td>
                            <td>
                              <Badge bg={employee.role === 'ADMIN' ? 'primary' : employee.role === 'MANAGER' ? 'info' : 'secondary'}>
                                {employee.role}
                              </Badge>
                            </td>
                            <td>
                              {employee.lastLoginAt ? (
                                <div className="last-login-cell">
                                  <div className="login-time">
                                    {new Date(employee.lastLoginAt).toLocaleDateString()} at{' '}
                                    {new Date(employee.lastLoginAt).toLocaleTimeString()}
                                  </div>
                                  {employee.isActive && (
                                    <span className="active-indicator">
                                      <span className="pulse-dot"></span> Online
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted">Never</span>
                              )}
                            </td>
                            <td>
                              {employee.totpEnabled || (employee.passkeys && employee.passkeys.length > 0) ? (
                                <span className="status-badge enabled">
                                  <FaCheckCircle /> Enabled
                                </span>
                              ) : (
                                <span className="status-badge disabled">
                                  <FaTimesCircle /> Disabled
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="table-actions">
                                <Dropdown align="end">
                                  <Dropdown.Toggle variant="link" className="action-menu-btn-table" id={`dropdown-table-${employee.id}`}>
                                    <FaEllipsisV />
                                  </Dropdown.Toggle>

                                  <Dropdown.Menu className="action-dropdown-menu">
                                    {canEditEmployee(employee.companyId, employee.role) && (
                                      <>
                                        <Dropdown.Item
                                          onClick={() => {
                                            setSelectedEmployee(employee);
                                            setShowEditModal(true);
                                          }}
                                        >
                                          <FaEdit className="me-2" /> Edit Employee
                                        </Dropdown.Item>
                                        {canDeleteEmployee(employee.role) && (
                                          <>
                                            <Dropdown.Item
                                              onClick={() => {
                                                setSelectedEmployee(employee);
                                                setShow2FAModal(true);
                                              }}
                                            >
                                              <FaKey className="me-2" /> Manage 2FA
                                            </Dropdown.Item>
                                            <Dropdown.Divider />
                                            <Dropdown.Item
                                              onClick={() => {
                                                setSelectedEmployee(employee);
                                                setShowDeleteModal(true);
                                              }}
                                              className="text-danger"
                                            >
                                              <FaTrash className="me-2" /> Delete Employee
                                            </Dropdown.Item>
                                          </>
                                        )}
                                      </>
                                    )}
                                    {session?.user?.role === 'ADMIN' && (
                                      <>
                                        <Dropdown.Divider />
                                        <Dropdown.Item
                                          onClick={() => handleViewMessages(employee)}
                                        >
                                          <FaComments className="me-2" /> View Messages
                                        </Dropdown.Item>
                                      </>
                                    )}
                                    {canExportActivities(employee.id, employee.companyId, employee.role) && (
                                      <>
                                        <Dropdown.Divider />
                                        <Dropdown.Item
                                          onClick={() => handleExportActivities(employee.id)}
                                        >
                                          <FaFileDownload className="me-2" /> Export Activities
                                        </Dropdown.Item>
                                      </>
                                    )}
                                  </Dropdown.Menu>
                                </Dropdown>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Pagination */}
              {!isLoading && filteredEmployees.length > itemsPerPage && (
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
                    <span className="text-muted ms-2">({filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''})</span>
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
                          <Dropdown align="end">
                            <Dropdown.Toggle variant="link" className="action-menu-btn" id={`dropdown-mobile-${employee.id}`}>
                              <FaEllipsisV />
                            </Dropdown.Toggle>

                            <Dropdown.Menu className="action-dropdown-menu">
                              {canEditEmployee(employee.companyId, employee.role) && (
                                <>
                                  <Dropdown.Item
                                    onClick={() => {
                                      setSelectedEmployee(employee);
                                      setShowEditModal(true);
                                    }}
                                  >
                                    <FaEdit className="me-2" /> Edit Employee
                                  </Dropdown.Item>
                                  {canDeleteEmployee(employee.role) && (
                                    <>
                                      <Dropdown.Item
                                        onClick={() => {
                                          setSelectedEmployee(employee);
                                          setShow2FAModal(true);
                                        }}
                                      >
                                        <FaKey className="me-2" /> Manage 2FA
                                      </Dropdown.Item>
                                      <Dropdown.Divider />
                                      <Dropdown.Item
                                        onClick={() => {
                                          setSelectedEmployee(employee);
                                          setShowDeleteModal(true);
                                        }}
                                        className="text-danger"
                                      >
                                        <FaTrash className="me-2" /> Delete Employee
                                      </Dropdown.Item>
                                    </>
                                  )}
                                </>
                              )}
                              {session?.user?.role === 'ADMIN' && (
                                <>
                                  <Dropdown.Divider />
                                  <Dropdown.Item
                                    onClick={() => handleViewMessages(employee)}
                                  >
                                    <FaComments className="me-2" /> View Messages
                                  </Dropdown.Item>
                                </>
                              )}
                              {canExportActivities(employee.id, employee.companyId, employee.role) && (
                                <>
                                  <Dropdown.Divider />
                                  <Dropdown.Item
                                    onClick={() => handleExportActivities(employee.id)}
                                  >
                                    <FaFileDownload className="me-2" /> Export Activities
                                  </Dropdown.Item>
                                </>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
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

        {/* Messages Modal */}
        <Modal show={showMessagesModal} onHide={() => setShowMessagesModal(false)} size="xl" centered className="messages-audit-modal">
          <Modal.Header closeButton className="messages-modal-header">
            <Modal.Title className="d-flex align-items-center gap-3">
              <div className="messages-modal-icon">
                <FaComments />
              </div>
              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>Message Audit</span>
                  <Badge bg="danger" style={{ fontSize: '0.7rem' }}>ADMIN</Badge>
                </div>
                <div className="employee-name-subtitle" style={{ fontSize: '0.95rem', marginTop: '4px', opacity: '0.9' }}>
                  Viewing messages for: <strong>{messagesEmployee?.name}</strong> ({messagesEmployee?.email})
                </div>
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="messages-modal-body">
            {loadingMessages ? (
              <div className="loading-messages">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p>Loading messages...</p>
              </div>
            ) : (
              <div className="messages-viewer">
                <div className="conversations-list">
                  <h6 className="conversations-title">
                    <FaUser className="me-2" />
                    Conversations ({conversations.length})
                  </h6>
                  {conversations.length === 0 ? (
                    <div className="no-conversations">
                      <FaComments className="empty-icon" />
                      <p>No conversations found</p>
                    </div>
                  ) : (
                    <div className="conversation-items">
                      {conversations.map((conv) => (
                        <div
                          key={conv.participant.id}
                          className={`conversation-item ${selectedConversation?.id === conv.participant.id ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedConversation(conv.participant);
                            fetchConversationMessages(messagesEmployee!.id, conv.participant.id);
                          }}
                        >
                          <div className="conversation-avatar">
                            {conv.participant.profilePicture ? (
                              <img
                                src={`/api/employees/profile-picture/${conv.participant.profilePicture}`}
                                alt={conv.participant.name}
                              />
                            ) : (
                              <div className="avatar-placeholder">
                                {conv.participant.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="conversation-details">
                            <div className="conversation-name">{conv.participant.name}</div>
                            <div className="conversation-email">{conv.participant.email}</div>
                            <Badge bg={conv.participant.role === 'ADMIN' ? 'primary' : 'secondary'} className="mt-1">
                              {conv.participant.role}
                            </Badge>
                          </div>
                          <div className="conversation-stats">
                            <div className="message-count">{conv.messageCount} msgs</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="messages-content">
                  {selectedConversation ? (
                    <>
                      <div className="messages-content-header">
                        <div className="d-flex align-items-center gap-2">
                          <div className="conversation-avatar-small">
                            {selectedConversation.profilePicture ? (
                              <img
                                src={`/api/employees/profile-picture/${selectedConversation.profilePicture}`}
                                alt={selectedConversation.name}
                              />
                            ) : (
                              <div className="avatar-placeholder">
                                {selectedConversation.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="conversation-name-header">{selectedConversation.name}</div>
                            <div className="conversation-email-header">{selectedConversation.email}</div>
                          </div>
                        </div>
                      </div>
                      <div className="messages-list-audit">
                        {conversationMessages.length === 0 ? (
                          <div className="no-messages">
                            <FaComments className="empty-icon" />
                            <p>No messages in this conversation</p>
                          </div>
                        ) : (
                          conversationMessages.map((message) => {
                            const isSentByEmployee = message.senderId === messagesEmployee?.id;
                            const isEncrypted = message.isEncrypted;
                            
                            return (
                              <div
                                key={message.id}
                                className={`message-item-audit ${isSentByEmployee ? 'sent' : 'received'}`}
                              >
                                <div className="message-header-audit">
                                  <div className="message-sender">
                                    <strong>{isSentByEmployee ? messagesEmployee?.name : selectedConversation.name}</strong>
                                    <span className="message-direction">
                                      {isSentByEmployee ? '→' : '←'}
                                    </span>
                                  </div>
                                  <div className="message-time-audit">
                                    {new Date(message.createdAt).toLocaleString()}
                                  </div>
                                </div>
                                <div className="message-content-audit">
                                  <div className="encrypted-message">
                                    <FaShieldAlt className="encrypted-icon" />
                                    <span>{message.content}</span>
                                  </div>
                                  {message.attachments && message.attachments.length > 0 && (
                                    <div className="message-attachments-audit">
                                      {message.attachments.map((att: any) => (
                                        <div key={att.id} className="attachment-badge">
                                          <FaFileIcon /> {att.document.name}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {message.isRead && (
                                  <div className="message-status-audit">
                                    <FaCheckCircle className="read-icon" /> Read
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="no-conversation-selected">
                      <FaComments className="empty-icon-large" />
                      <h5>Select a conversation</h5>
                      <p>Choose a conversation from the list to view message history</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="messages-modal-footer">
            <Button variant="secondary" onClick={() => setShowMessagesModal(false)} className="messages-close-btn">
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        <style jsx>{`
          .employees-container {
            padding: 1rem;
            max-width: 100%;
          }

          /* Controls Bar */
          .controls-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 12px;
            flex-wrap: wrap;
            gap: 1rem;
          }

          .left-controls {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            flex-wrap: wrap;
            flex: 1;
          }

          .search-bar {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 0.5rem 1rem;
            flex: 1;
            min-width: 200px;
            max-width: 400px;
            transition: all 0.3s ease;
          }

          .search-bar:focus-within {
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
          }

          .search-icon {
            color: #ffffff !important;
            font-size: 0.95rem;
            flex-shrink: 0;
          }

          :global(.search-icon) {
            color: #ffffff !important;
          }

          .search-input {
            background: transparent;
            border: none;
            color: white;
            font-size: 0.9rem;
            outline: none;
            width: 100%;
          }

          .search-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }

          .search-input::-webkit-search-cancel-button {
            display: none;
          }

          .search-input::-webkit-search-decoration {
            display: none;
          }

          .company-filter {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .filter-icon {
            color: #ffffff !important;
            font-size: 1rem;
            flex-shrink: 0;
          }

          :global(.filter-icon) {
            color: #ffffff !important;
          }

          .company-select {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: white;
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .company-select:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: #667eea;
          }

          .company-select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
          }

          .company-select option {
            background: #1a0033;
            color: white;
          }

          .results-count {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
            font-weight: 500;
          }

          .view-toggle {
            display: flex;
            gap: 0.5rem;
            background: rgba(255, 255, 255, 0.05);
            padding: 0.25rem;
            border-radius: 8px;
          }

          .view-btn {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            padding: 0.5rem 0.75rem;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.1rem;
          }

          .view-btn:hover {
            color: white;
            background: rgba(255, 255, 255, 0.1);
          }

          .view-btn.active {
            color: white;
            background: #667eea;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
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
            background: #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: white;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            position: relative;
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
            background: #667eea !important;
            border: none !important;
            padding: 0.75rem 1.75rem !important;
            border-radius: 12px !important;
            font-weight: 600 !important;
            font-size: 0.95rem !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3) !important;
            color: white !important;
            margin-left: auto !important;
            position: relative;
            overflow: hidden;
          }

          

          

          :global(.add-btn:hover) {
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
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

          /* Table View */
          .employees-table-container {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 16px;
            padding: 1.5rem;
            overflow-x: auto;
            overflow-y: visible;
            min-height: 600px;
          }

          .employees-table {
            width: 100%;
            border-collapse: collapse;
            color: white;
          }

          .employees-table thead {
            background: rgba(102, 126, 234, 0.15);
          }

          .employees-table th {
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            font-size: 0.9rem;
            color: #ffffff;
            border-bottom: 2px solid rgba(102, 126, 234, 0.3);
            white-space: nowrap;
          }

          .employees-table tbody tr {
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
          }

          .employees-table tbody tr:hover {
            background: rgba(102, 126, 234, 0.1);
          }

          .employees-table td {
            padding: 1rem;
            vertical-align: middle;
          }

          .employee-cell {
            min-width: 200px;
          }

          .employee-info-row {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .employee-avatar-small {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            overflow: hidden;
            flex-shrink: 0;
            border: 2px solid #667eea;
          }

          .employee-avatar-small img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .avatar-placeholder-small {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #667eea;
            color: white;
            font-weight: 600;
            font-size: 1rem;
          }

          .employee-name-table {
            font-weight: 600;
            color: #ffffff;
            font-size: 0.95rem;
          }

          .employee-email-table {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
          }

          .company-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.35rem 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.85rem;
            white-space: nowrap;
          }

          .company-icon-small {
            font-size: 0.85rem;
            color: #667eea;
          }

          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.35rem 0.75rem;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 500;
            white-space: nowrap;
          }

          .status-badge.enabled {
            background: rgba(40, 167, 69, 0.15);
            color: #28a745;
            border: 1px solid rgba(40, 167, 69, 0.3);
          }

          .status-badge.disabled {
            background: rgba(220, 53, 69, 0.15);
            color: #dc3545;
            border: 1px solid rgba(220, 53, 69, 0.3);
          }

          .table-actions {
            display: flex;
            gap: 0.25rem;
            align-items: center;
            justify-content: center;
          }

          /* Last Login Column */
          .last-login-cell {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
          }

          .login-time {
            color: rgba(255, 255, 255, 0.85);
            font-size: 0.85rem;
          }

          .active-indicator {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            color: #28a745;
            font-size: 0.8rem;
            font-weight: 500;
          }

          .pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #28a745;
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.5;
              transform: scale(1.2);
            }
          }

          /* Employee Cards */
          :global(.employee-card-desktop) {
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 12px !important;
            transition: all 0.2s ease !important;
            overflow: visible !important;
          }

          :global(.employee-card-desktop:hover) {
            transform: translateY(-1px) !important;
            border-color: rgba(102, 126, 234, 0.4) !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
          }

          :global(.employee-card-desktop .card-body) {
            padding: 1rem !important;
          }

          :global(.employee-card) {
            overflow: visible !important;
          }

          :global(.employee-card .card-body) {
            overflow: visible !important;
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
            background: #667eea;
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
          .employee-actions,
          .employee-actions-desktop {
            display: flex;
            gap: 0.35rem;
            flex-shrink: 0;
          }

          /* 3-Dot Menu Button */
          :global(.action-menu-btn),
          :global(.action-menu-btn-desktop),
          :global(.action-menu-btn-table) {
            width: 36px !important;
            height: 36px !important;
            border-radius: 8px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            transition: all 0.2s ease !important;
            font-size: 1rem !important;
            color: rgba(255, 255, 255, 0.9) !important;
          }

          :global(.action-menu-btn:hover),
          :global(.action-menu-btn-desktop:hover),
          :global(.action-menu-btn-table:hover),
          :global(.action-menu-btn:focus),
          :global(.action-menu-btn-desktop:focus),
          :global(.action-menu-btn-table:focus) {
            transform: translateY(-1px) !important;
            border-color: rgba(102, 126, 234, 0.6) !important;
            background: rgba(102, 126, 234, 0.15) !important;
            color: #667eea !important;
            box-shadow: none !important;
          }

          :global(.action-menu-btn::after),
          :global(.action-menu-btn-desktop::after),
          :global(.action-menu-btn-table::after) {
            display: none !important;
          }

          /* Dropdown Menu */
          :global(.action-dropdown-menu) {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
            border: 1px solid rgba(102, 126, 234, 0.3) !important;
            border-radius: 10px !important;
            padding: 0.5rem !important;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
            min-width: 220px !important;
          }

          :global(.action-dropdown-menu .dropdown-item) {
            color: rgba(255, 255, 255, 0.9) !important;
            padding: 0.65rem 1rem !important;
            border-radius: 6px !important;
            font-size: 0.95rem !important;
            transition: all 0.2s ease !important;
            display: flex !important;
            align-items: center !important;
          }

          :global(.action-dropdown-menu .dropdown-item:hover) {
            background: rgba(102, 126, 234, 0.2) !important;
            color: #ffffff !important;
            transform: translateX(3px) !important;
          }

          :global(.action-dropdown-menu .dropdown-item.text-danger) {
            color: #ff6b6b !important;
          }

          :global(.action-dropdown-menu .dropdown-item.text-danger:hover) {
            background: rgba(255, 107, 107, 0.15) !important;
            color: #ff6b6b !important;
          }

          :global(.action-dropdown-menu .dropdown-divider) {
            border-color: rgba(255, 255, 255, 0.1) !important;
            margin: 0.5rem 0 !important;
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
            background: #667eea;
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

            .controls-bar {
              flex-direction: column;
              align-items: stretch;
              gap: 1rem;
              padding: 0.75rem;
            }

            .left-controls {
              flex-direction: column;
              align-items: stretch;
              gap: 0.75rem;
            }

            .search-bar {
              max-width: 100%;
              width: 100%;
            }

            .company-filter {
              width: 100%;
            }

            .company-select {
              width: 100%;
            }

            .results-count {
              text-align: center;
            }

            .view-toggle {
              width: 100%;
              justify-content: center;
            }

            .employees-table-container {
              padding: 0.75rem;
              overflow-x: scroll;
              overflow-y: visible;
              min-height: 400px;
            }

            .employees-table {
              font-size: 0.85rem;
            }

            .employees-table th,
            .employees-table td {
              padding: 0.75rem 0.5rem;
            }

            .employee-avatar-small {
              width: 32px;
              height: 32px;
            }

            .avatar-placeholder-small {
              font-size: 0.85rem;
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
            transform: translateY(-1px) !important;
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
            background: #667eea !important;
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

          /* Messages Audit Modal Styles */
          :global(.messages-audit-modal .modal-content) {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
            border: 1px solid rgba(102, 126, 234, 0.3) !important;
            border-radius: 16px !important;
            overflow: hidden !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
          }

          :global(.messages-modal-header) {
            background: #667eea !important;
            border-bottom: none !important;
            padding: 1.5rem 2rem !important;
            color: white !important;
          }

          :global(.messages-modal-icon) {
            width: 50px;
            height: 50px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
          }

          :global(.messages-modal-body) {
            padding: 0 !important;
            background: #16213e !important;
            max-height: 70vh !important;
          }

          .loading-messages {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem;
            gap: 1rem;
          }

          .messages-viewer {
            display: flex;
            height: 70vh;
          }

          .conversations-list {
            width: 350px;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.2);
            overflow-y: auto;
          }

          .conversations-title {
            padding: 1rem 1.5rem;
            margin: 0;
            font-size: 0.95rem;
            color: rgba(255, 255, 255, 0.8);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.2);
          }

          .no-conversations,
          .no-messages {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem 1rem;
            color: rgba(255, 255, 255, 0.5);
          }

          .empty-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.5;
          }

          .conversation-items {
            padding: 0.5rem;
          }

          .conversation-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 0.5rem;
          }

          .conversation-item:hover {
            background: rgba(102, 126, 234, 0.15);
          }

          .conversation-item.active {
            background: #667eea;
          }

          .conversation-avatar {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            overflow: hidden;
            flex-shrink: 0;
            background: rgba(102, 126, 234, 0.2);
            position: relative;
          }

          .conversation-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            position: relative;
            z-index: 1;
          }

          .conversation-avatar .avatar-placeholder {
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #667eea !important;
            color: #ffffff !important;
            font-weight: 600 !important;
            font-size: 1.2rem !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
          }

          .conversation-details {
            flex: 1;
            min-width: 0;
          }

          .conversation-name {
            font-weight: 600;
            color: #ffffff;
            font-size: 0.95rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .conversation-email {
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.6);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .conversation-stats {
            flex-shrink: 0;
          }

          .message-count {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.7);
            background: rgba(0, 0, 0, 0.3);
            padding: 0.25rem 0.5rem;
            border-radius: 6px;
          }

          .messages-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .messages-content-header {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.2);
          }

          .conversation-avatar-small {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            overflow: hidden;
            flex-shrink: 0;
            background: rgba(102, 126, 234, 0.2);
            position: relative;
          }

          .conversation-avatar-small img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            position: relative;
            z-index: 1;
          }

          .conversation-avatar-small .avatar-placeholder {
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #667eea !important;
            color: #ffffff !important;
            font-weight: 600 !important;
            font-size: 1rem !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
          }

          .conversation-name-header {
            font-weight: 600;
            color: #ffffff;
            font-size: 1rem;
          }

          .conversation-email-header {
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.6);
          }

          .messages-list-audit {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
          }

          .message-item-audit {
            margin-bottom: 1.5rem;
            padding: 1rem;
            border-radius: 12px;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .message-item-audit.sent {
            border-left: 3px solid #667eea;
          }

          .message-item-audit.received {
            border-left: 3px solid #28a745;
          }

          .message-header-audit {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
          }

          .message-sender {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #ffffff;
            font-size: 0.95rem;
          }

          .message-direction {
            font-size: 1.2rem;
            color: rgba(255, 255, 255, 0.5);
          }

          .message-time-audit {
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.5);
          }

          .message-content-audit {
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.6;
          }

          .encrypted-message {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 8px;
            color: #ffc107;
            font-style: italic;
          }

          .encrypted-icon {
            font-size: 1.2rem;
          }

          .message-text-audit {
            padding: 0.5rem 0;
          }

          .message-attachments-audit {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.75rem;
          }

          .attachment-badge {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 0.75rem;
            background: rgba(102, 126, 234, 0.2);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 8px;
            font-size: 0.85rem;
            color: #667eea;
          }

          .message-status-audit {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.5rem;
            font-size: 0.8rem;
            color: #28a745;
          }

          .read-icon {
            font-size: 1rem;
          }

          .no-conversation-selected {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem;
            color: rgba(255, 255, 255, 0.5);
          }

          .empty-icon-large {
            font-size: 4rem;
            margin-bottom: 1.5rem;
            opacity: 0.3;
          }

          .no-conversation-selected h5 {
            color: #ffffff;
            margin-bottom: 0.5rem;
          }

          :global(.messages-modal-footer) {
            background: rgba(255, 255, 255, 0.03) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
            padding: 1.5rem 2rem !important;
          }

          :global(.messages-close-btn) {
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: #ffffff !important;
            padding: 0.65rem 2rem !important;
            border-radius: 10px !important;
            font-weight: 500 !important;
            transition: all 0.3s ease !important;
          }

          :global(.messages-close-btn:hover) {
            background: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            transform: translateY(-1px) !important;
          }

        `}</style>
      </div>
    </DashboardLayout>
  );
} 