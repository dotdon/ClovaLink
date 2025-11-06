'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Badge, ListGroup } from 'react-bootstrap';
import { FaPlus, FaTrash } from 'react-icons/fa';

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
      if (!response.ok) throw new Error('Failed to fetch companies');
      const { companies: data } = await response.json();
      setCompanies(data || []);
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
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Edit Employee</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Company</Form.Label>
            <Form.Select
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              required
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Role</Form.Label>
            <Form.Select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            >
              <option value="USER">User</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>New Password (leave blank to keep current)</Form.Label>
            <Form.Control
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter new password"
            />
          </Form.Group>

          <hr />

          <div className="mb-3">
            <h6>Cross-Company Access</h6>
            <p className="text-muted small">
              Grant this employee access to additional companies. They can view and manage documents in these companies.
            </p>

            {crossCompanyAccess.length > 0 && (
              <ListGroup className="mb-3">
                {crossCompanyAccess.map((access) => (
                  <ListGroup.Item key={access.id} className="d-flex justify-content-between align-items-center">
                    <span>{access.company.name}</span>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleRevokeAccess(access.companyId)}
                      disabled={isManagingAccess}
                    >
                      <FaTrash />
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}

            <div className="d-flex gap-2">
              <Form.Select
                value={selectedCompanyForAccess}
                onChange={(e) => setSelectedCompanyForAccess(e.target.value)}
                disabled={isManagingAccess}
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
                variant="primary"
                onClick={handleGrantAccess}
                disabled={!selectedCompanyForAccess || isManagingAccess}
              >
                <FaPlus /> Grant
              </Button>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
} 