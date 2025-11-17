'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Badge, ListGroup } from 'react-bootstrap';
import { FaPlus, FaTrash, FaEdit, FaUser, FaEnvelope, FaBuilding, FaUserShield, FaLock, FaInfoCircle, FaGlobe } from 'react-icons/fa';

interface Company {
  id: string;
  name: string;
}

interface EditEmployeeModalProps {
  show: boolean;
  onHide: () => void;
  employee: {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId: string;
  };
  onSubmit: (data: {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId: string;
    password?: string;
  }) => Promise<void>;
}

export default function EditEmployeeModal({ show, onHide, employee, onSubmit }: EditEmployeeModalProps) {
  const [formData, setFormData] = useState({
    id: employee.id,
    name: employee.name,
    email: employee.email,
    role: employee.role,
    companyId: employee.companyId,
    password: '',
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cross-company access state
  const [crossCompanyAccess, setCrossCompanyAccess] = useState<Array<{id: string, companyId: string, company: {id: string, name: string}}>>([]);
  const [selectedCompanyForAccess, setSelectedCompanyForAccess] = useState<string>('');
  const [isManagingAccess, setIsManagingAccess] = useState(false);

  useEffect(() => {
    fetchCompanies();
    if (show && employee.id) {
      fetchCrossCompanyAccess();
    }
  }, [show, employee.id]);

  useEffect(() => {
    setFormData({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      companyId: employee.companyId,
      password: '',
    });
  }, [employee]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to fetch companies');
      }
      const result = await response.json();
      // Handle both old and new response formats
      let companiesList;
      if (result.success && result.data && result.data.companies) {
        companiesList = result.data.companies;
      } else if (result.companies) {
        companiesList = result.companies;
      } else if (Array.isArray(result)) {
        companiesList = result;
      } else {
        companiesList = [];
      }
      const data = Array.isArray(companiesList) ? companiesList : [];
      setCompanies(data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setCompanies([]);
    }
  };

  const fetchCrossCompanyAccess = async () => {
    try {
      const response = await fetch(`/api/employees/${employee.id}/cross-company-access`);
      if (!response.ok) {
        // If user doesn't have permission, just set empty array
        console.log('Cannot fetch cross-company access - may not have permission');
        setCrossCompanyAccess([]);
        return;
      }
      const data = await response.json();
      setCrossCompanyAccess(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch cross-company access:', error);
      setCrossCompanyAccess([]);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedCompanyForAccess) return;
    
    setIsManagingAccess(true);
    try {
      const response = await fetch(`/api/employees/${employee.id}/cross-company-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: selectedCompanyForAccess }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant access');
      }

      await fetchCrossCompanyAccess();
      setSelectedCompanyForAccess('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to grant access');
    } finally {
      setIsManagingAccess(false);
    }
  };

  const handleRevokeAccess = async (companyId: string) => {
    if (!confirm('Are you sure you want to revoke access to this company?')) return;
    
    setIsManagingAccess(true);
    try {
      const response = await fetch(`/api/employees/${employee.id}/cross-company-access?companyId=${companyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke access');
      }

      await fetchCrossCompanyAccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to revoke access');
    } finally {
      setIsManagingAccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const submitData: {
        id: string;
        name: string;
        email: string;
        role: string;
        companyId: string;
        password?: string;
      } = { ...formData };
      
      if (!submitData.password) {
        delete submitData.password;
      }
      await onSubmit(submitData);
      onHide();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update employee');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg" className="edit-employee-modal">
      <Modal.Header closeButton className="modal-header-custom">
        <Modal.Title className="d-flex align-items-center gap-2">
          <div className="modal-icon">
            <FaEdit />
          </div>
          <span>Edit Employee</span>
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body className="modal-body-custom">
          {error && (
            <Alert variant="danger" className="custom-alert">
              {error}
            </Alert>
          )}

          <div className="section">
            <h6 className="section-title">
              <FaUser className="me-2" />
              Basic Information
            </h6>

            <Form.Group className="mb-4">
              <Form.Label className="form-label-custom">
                <FaUser className="label-icon" />
                Full Name
              </Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter employee's full name"
                required
                className="form-control-custom"
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="form-label-custom">
                <FaEnvelope className="label-icon" />
                Email Address
              </Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="employee@example.com"
                required
                className="form-control-custom"
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="form-label-custom">
                <FaBuilding className="label-icon" />
                Primary Company
              </Form.Label>
              <Form.Select
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                required
                className="form-control-custom"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="form-label-custom">
                <FaUserShield className="label-icon" />
                Role
              </Form.Label>
              <Form.Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
                className="form-control-custom"
              >
                <option value="USER">User - Basic Access</option>
                <option value="MANAGER">Manager - Enhanced Permissions</option>
                <option value="IT">IT - Technical Support</option>
                <option value="ADMIN">Admin - Full Control</option>
                <option value="SUPER_ADMIN">Super Admin - System Administrator</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="form-label-custom">
                <FaLock className="label-icon" />
                New Password
              </Form.Label>
              <Form.Control
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank to keep current password"
                className="form-control-custom"
              />
              <div className="password-hint">
                <FaInfoCircle /> Only fill this if you want to change the employee's password
              </div>
            </Form.Group>
          </div>

          <div className="divider"></div>

          <div className="section">
            <h6 className="section-title">
              <FaGlobe className="me-2" />
              Cross-Company Access
            </h6>
            <p className="section-description">
              Grant this employee access to additional companies. They can view and manage documents in these companies.
            </p>

            {crossCompanyAccess.length > 0 && (
              <div className="access-list mb-3">
                {crossCompanyAccess.map((access) => (
                  <div key={access.id} className="access-item">
                    <div className="access-company">
                      <FaBuilding className="me-2" />
                      {access.company.name}
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleRevokeAccess(access.companyId)}
                      disabled={isManagingAccess}
                      className="revoke-btn"
                    >
                      <FaTrash />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="grant-access-section">
              <Form.Select
                value={selectedCompanyForAccess}
                onChange={(e) => setSelectedCompanyForAccess(e.target.value)}
                disabled={isManagingAccess}
                className="form-control-custom flex-grow-1"
              >
                <option value="">Select company to grant access...</option>
                {companies
                  .filter(c => 
                    c.id !== formData.companyId && 
                    !crossCompanyAccess.some(access => access.companyId === c.id)
                  )
                  .map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
              </Form.Select>
              <Button
                onClick={handleGrantAccess}
                disabled={!selectedCompanyForAccess || isManagingAccess}
                className="grant-btn"
              >
                <FaPlus className="me-2" />
                Grant Access
              </Button>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="modal-footer-custom">
          <Button variant="secondary" onClick={onHide} className="cancel-btn">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="submit-btn">
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Saving...
              </>
            ) : (
              <>
                <FaEdit className="me-2" />
                Save Changes
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>

      <style jsx global>{`
        .edit-employee-modal :global(.modal-content) {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
          border: 1px solid rgba(102, 126, 234, 0.3) !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
        }

        .edit-employee-modal :global(.modal-header-custom) {
          background: #667eea !important;
          border-bottom: none !important;
          padding: 1.5rem 2rem !important;
          color: white !important;
        }

        .edit-employee-modal :global(.modal-header-custom .btn-close) {
          filter: brightness(0) invert(1) !important;
          opacity: 0.8 !important;
        }

        .edit-employee-modal :global(.modal-header-custom .btn-close:hover) {
          opacity: 1 !important;
        }

        .edit-employee-modal :global(.modal-title) {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          color: white !important;
        }

        .edit-employee-modal :global(.modal-icon) {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          font-size: 1.2rem;
        }

        .edit-employee-modal :global(.modal-body-custom) {
          padding: 2rem !important;
          background: transparent !important;
          max-height: 70vh;
          overflow-y: auto;
        }

        .edit-employee-modal :global(.section) {
          margin-bottom: 1.5rem;
        }

        .edit-employee-modal :global(.section:last-child) {
          margin-bottom: 0;
        }

        .edit-employee-modal :global(.section-title) {
          display: flex;
          align-items: center;
          color: #ffffff;
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .edit-employee-modal :global(.section-description) {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        .edit-employee-modal :global(.divider) {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          margin: 2rem 0;
        }

        .edit-employee-modal :global(.custom-alert) {
          background: rgba(220, 53, 69, 0.1) !important;
          border: 1px solid rgba(220, 53, 69, 0.3) !important;
          color: #ff6b6b !important;
          border-radius: 10px !important;
          padding: 1rem !important;
        }

        .edit-employee-modal :global(.form-label-custom) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.9) !important;
          font-weight: 500 !important;
          font-size: 0.95rem !important;
          margin-bottom: 0.75rem !important;
        }

        .edit-employee-modal :global(.label-icon) {
          color: #667eea;
          font-size: 1rem;
        }

        .edit-employee-modal :global(.form-control-custom) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 10px !important;
          color: #ffffff !important;
          padding: 0.75rem 1rem !important;
          font-size: 0.95rem !important;
          transition: all 0.3s ease !important;
        }

        .edit-employee-modal :global(.form-control-custom:focus) {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: #667eea !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2) !important;
          color: #ffffff !important;
        }

        .edit-employee-modal :global(.form-control-custom::placeholder) {
          color: rgba(255, 255, 255, 0.4) !important;
        }

        .edit-employee-modal :global(.form-control-custom option) {
          background: #1a1a2e !important;
          color: #ffffff !important;
        }

        .edit-employee-modal :global(.password-hint) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(102, 126, 234, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
        }

        .edit-employee-modal :global(.password-hint svg) {
          color: #667eea;
          flex-shrink: 0;
        }

        .edit-employee-modal :global(.access-list) {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .edit-employee-modal :global(.access-item) {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .edit-employee-modal :global(.access-item:hover) {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .edit-employee-modal :global(.access-company) {
          display: flex;
          align-items: center;
          color: #ffffff;
          font-weight: 500;
        }

        .edit-employee-modal :global(.revoke-btn) {
          background: rgba(220, 53, 69, 0.1) !important;
          border: 1px solid rgba(220, 53, 69, 0.3) !important;
          color: #ff6b6b !important;
          padding: 0.4rem 0.75rem !important;
          border-radius: 6px !important;
          transition: all 0.2s ease !important;
        }

        .edit-employee-modal :global(.revoke-btn:hover:not(:disabled)) {
          background: rgba(220, 53, 69, 0.2) !important;
          border-color: #dc3545 !important;
          color: #ff4444 !important;
        }

        .edit-employee-modal :global(.revoke-btn:disabled) {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }

        .edit-employee-modal :global(.grant-access-section) {
          display: flex;
          gap: 0.75rem;
          align-items: stretch;
        }

        .edit-employee-modal :global(.grant-btn) {
          background: #667eea !important;
          border: none !important;
          color: white !important;
          padding: 0.75rem 1.5rem !important;
          border-radius: 10px !important;
          font-weight: 500 !important;
          transition: all 0.3s ease !important;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .edit-employee-modal :global(.grant-btn:hover:not(:disabled)) {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
        }

        .edit-employee-modal :global(.grant-btn:disabled) {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }

        .edit-employee-modal :global(.modal-footer-custom) {
          background: rgba(255, 255, 255, 0.03) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding: 1.5rem 2rem !important;
          gap: 1rem !important;
        }

        .edit-employee-modal :global(.cancel-btn) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #ffffff !important;
          padding: 0.65rem 1.5rem !important;
          border-radius: 10px !important;
          font-weight: 500 !important;
          transition: all 0.3s ease !important;
        }

        .edit-employee-modal :global(.cancel-btn:hover) {
          background: rgba(255, 255, 255, 0.1) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          transform: translateY(-1px) !important;
        }

        .edit-employee-modal :global(.submit-btn) {
          background: #667eea !important;
          border: none !important;
          color: white !important;
          padding: 0.65rem 1.75rem !important;
          border-radius: 10px !important;
          font-weight: 500 !important;
          transition: all 0.3s ease !important;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .edit-employee-modal :global(.submit-btn:hover:not(:disabled)) {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
        }

        .edit-employee-modal :global(.submit-btn:disabled) {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }

        .edit-employee-modal :global(.spinner-border-sm) {
          width: 1rem;
          height: 1rem;
          border-width: 2px;
        }

        /* Scrollbar Styling */
        .edit-employee-modal :global(.modal-body-custom::-webkit-scrollbar) {
          width: 8px;
        }

        .edit-employee-modal :global(.modal-body-custom::-webkit-scrollbar-track) {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        .edit-employee-modal :global(.modal-body-custom::-webkit-scrollbar-thumb) {
          background: rgba(102, 126, 234, 0.5);
          border-radius: 4px;
        }

        .edit-employee-modal :global(.modal-body-custom::-webkit-scrollbar-thumb:hover) {
          background: rgba(102, 126, 234, 0.7);
        }
      `}</style>
    </Modal>
  );
} 