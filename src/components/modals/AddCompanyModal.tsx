import React, { useState } from 'react';
import { Modal, Form, Button, Spinner } from 'react-bootstrap';
import { FaBuilding, FaPlus, FaInfoCircle } from 'react-icons/fa';

interface AddCompanyModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: { name: string }) => Promise<void>;
}

export default function AddCompanyModal({ show, onHide, onSubmit }: AddCompanyModalProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit({ name });
      setName('');
      onHide();
    } catch (error) {
      console.error('Failed to create company:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered className="add-company-modal">
      <div className="modal-header-custom">
        <div className="d-flex align-items-center gap-3">
          <div className="modal-icon">
            <FaPlus />
          </div>
          <Modal.Title>Add New Company</Modal.Title>
        </div>
        <button
          type="button"
          className="btn-close"
          onClick={onHide}
          aria-label="Close"
        />
      </div>

      <Form onSubmit={handleSubmit}>
        <div className="modal-body-custom">
          <Form.Group className="mb-3">
            <Form.Label className="form-label-custom">
              <FaBuilding className="label-icon" />
              Company Name
            </Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter company name"
              required
              className="form-control-custom"
              autoFocus
            />
          </Form.Group>

          <div className="info-hint">
            <FaInfoCircle />
            <span>A company will be created to organize your employees and documents.</span>
          </div>
        </div>

        <div className="modal-footer-custom">
          <Button 
            variant="secondary" 
            onClick={onHide}
            className="cancel-btn"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="submit" 
            disabled={isLoading}
            className="submit-btn"
          >
            {isLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Creating...
              </>
            ) : (
              <>
                <FaPlus className="me-2" />
                Create Company
              </>
            )}
          </Button>
        </div>
      </Form>

      <style jsx global>{`
        .add-company-modal :global(.modal-content) {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
          border: 1px solid rgba(102, 126, 234, 0.3) !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
        }

        .add-company-modal :global(.modal-header-custom) {
          background: #667eea !important;
          border-bottom: none !important;
          padding: 1.5rem 2rem !important;
          color: white !important;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .add-company-modal :global(.modal-header-custom .btn-close) {
          filter: brightness(0) invert(1) !important;
          opacity: 0.8 !important;
        }

        .add-company-modal :global(.modal-header-custom .btn-close:hover) {
          opacity: 1 !important;
        }

        .add-company-modal :global(.modal-title) {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          color: white !important;
        }

        .add-company-modal :global(.modal-icon) {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          font-size: 1.2rem;
        }

        .add-company-modal :global(.modal-body-custom) {
          padding: 2rem !important;
          background: transparent !important;
        }

        .add-company-modal :global(.form-label-custom) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.9) !important;
          font-weight: 500 !important;
          font-size: 0.95rem !important;
          margin-bottom: 0.75rem !important;
        }

        .add-company-modal :global(.label-icon) {
          color: #667eea;
          font-size: 1rem;
        }

        .add-company-modal :global(.form-control-custom) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 10px !important;
          color: #ffffff !important;
          padding: 0.75rem 1rem !important;
          font-size: 0.95rem !important;
          transition: all 0.3s ease !important;
        }

        .add-company-modal :global(.form-control-custom:focus) {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: #667eea !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2) !important;
          color: #ffffff !important;
        }

        .add-company-modal :global(.form-control-custom::placeholder) {
          color: rgba(255, 255, 255, 0.4) !important;
        }

        .add-company-modal :global(.info-hint) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: rgba(102, 126, 234, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
        }

        .add-company-modal :global(.info-hint svg) {
          color: #667eea;
          flex-shrink: 0;
        }

        .add-company-modal :global(.modal-footer-custom) {
          background: rgba(255, 255, 255, 0.03) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding: 1.5rem 2rem !important;
          gap: 1rem !important;
          display: flex;
          justify-content: flex-end;
        }

        .add-company-modal :global(.cancel-btn) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #ffffff !important;
          padding: 0.65rem 1.5rem !important;
          border-radius: 10px !important;
          font-weight: 500 !important;
          transition: all 0.3s ease !important;
        }

        .add-company-modal :global(.cancel-btn:hover:not(:disabled)) {
          background: rgba(255, 255, 255, 0.1) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          transform: translateY(-1px) !important;
        }

        .add-company-modal :global(.submit-btn) {
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

        .add-company-modal :global(.submit-btn:hover:not(:disabled)) {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
        }

        .add-company-modal :global(.submit-btn:disabled) {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }

        .add-company-modal :global(.spinner-border-sm) {
          width: 1rem;
          height: 1rem;
          border-width: 2px;
        }
      `}</style>
    </Modal>
  );
} 