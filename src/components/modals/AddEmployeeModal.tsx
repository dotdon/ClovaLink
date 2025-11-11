'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { FaUserPlus, FaUser, FaEnvelope, FaBuilding, FaUserShield, FaLock, FaInfoCircle } from 'react-icons/fa';

interface Company {
  id: string;
  name: string;
}

interface AddEmployeeModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: { 
    name: string; 
    email: string; 
    role: string; 
    password: string;
    companyId: string;
  }) => Promise<void>;
}

export default function AddEmployeeModal({ show, onHide, onSubmit }: AddEmployeeModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'USER',
    password: '',
    companyId: '',
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (!response.ok) throw new Error('Failed to fetch companies');
      const { companies: data } = await response.json();
      setCompanies(data);
      // Set the first company as default if available
      if (data.length > 0 && !formData.companyId) {
        setFormData(prev => ({ ...prev, companyId: data[0].id }));
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(formData);
      setFormData({ 
        name: '', 
        email: '', 
        role: 'USER', 
        password: '',
        companyId: companies[0]?.id || '' 
      });
      onHide();
    } catch (error) {
      console.error('Failed to create employee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered className="add-employee-modal">
      <Modal.Header closeButton className="modal-header-custom">
        <Modal.Title className="d-flex align-items-center gap-2">
          <div className="modal-icon">
            <FaUserPlus />
          </div>
          <span>Add New Employee</span>
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body className="modal-body-custom">
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
              Company
            </Form.Label>
            <Form.Select
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              required
              className="form-control-custom"
            >
              <option value="">Select a company</option>
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
              <option value="ADMIN">Admin - Full Control</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="form-label-custom">
              <FaLock className="label-icon" />
              Temporary Password
            </Form.Label>
            <Form.Control
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter a temporary password"
              required
              className="form-control-custom"
            />
            <div className="password-hint">
              <FaInfoCircle /> Employee will be prompted to change this on first login
            </div>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="modal-footer-custom">
          <Button variant="secondary" onClick={onHide} className="cancel-btn">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="submit-btn">
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Creating...
              </>
            ) : (
              <>
                <FaUserPlus className="me-2" />
                Create Employee
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>

      <style jsx global>{`
        .add-employee-modal :global(.modal-content) {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
          border: 1px solid rgba(102, 126, 234, 0.3) !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
        }

        .add-employee-modal :global(.modal-header-custom) {
          background: #667eea !important;
          border-bottom: none !important;
          padding: 1.5rem 2rem !important;
          color: white !important;
        }

        .add-employee-modal :global(.modal-header-custom .btn-close) {
          filter: brightness(0) invert(1) !important;
          opacity: 0.8 !important;
        }

        .add-employee-modal :global(.modal-header-custom .btn-close:hover) {
          opacity: 1 !important;
        }

        .add-employee-modal :global(.modal-title) {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          color: white !important;
        }

        .add-employee-modal :global(.modal-icon) {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          font-size: 1.2rem;
        }

        .add-employee-modal :global(.modal-body-custom) {
          padding: 2rem !important;
          background: transparent !important;
        }

        .add-employee-modal :global(.form-label-custom) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.9) !important;
          font-weight: 500 !important;
          font-size: 0.95rem !important;
          margin-bottom: 0.75rem !important;
        }

        .add-employee-modal :global(.label-icon) {
          color: #667eea;
          font-size: 1rem;
        }

        .add-employee-modal :global(.form-control-custom) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 10px !important;
          color: #ffffff !important;
          padding: 0.75rem 1rem !important;
          font-size: 0.95rem !important;
          transition: all 0.3s ease !important;
        }

        .add-employee-modal :global(.form-control-custom:focus) {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: #667eea !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2) !important;
          color: #ffffff !important;
        }

        .add-employee-modal :global(.form-control-custom::placeholder) {
          color: rgba(255, 255, 255, 0.4) !important;
        }

        .add-employee-modal :global(.form-control-custom option) {
          background: #1a1a2e !important;
          color: #ffffff !important;
        }

        .add-employee-modal :global(.password-hint) {
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

        .add-employee-modal :global(.password-hint svg) {
          color: #667eea;
          flex-shrink: 0;
        }

        .add-employee-modal :global(.modal-footer-custom) {
          background: rgba(255, 255, 255, 0.03) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding: 1.5rem 2rem !important;
          gap: 1rem !important;
        }

        .add-employee-modal :global(.cancel-btn) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #ffffff !important;
          padding: 0.65rem 1.5rem !important;
          border-radius: 10px !important;
          font-weight: 500 !important;
          transition: all 0.3s ease !important;
        }

        .add-employee-modal :global(.cancel-btn:hover) {
          background: rgba(255, 255, 255, 0.1) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          transform: translateY(-1px) !important;
        }

        .add-employee-modal :global(.submit-btn) {
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

        .add-employee-modal :global(.submit-btn:hover:not(:disabled)) {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
        }

        .add-employee-modal :global(.submit-btn:disabled) {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }

        .add-employee-modal :global(.spinner-border-sm) {
          width: 1rem;
          height: 1rem;
          border-width: 2px;
        }
      `}</style>
    </Modal>
  );
} 