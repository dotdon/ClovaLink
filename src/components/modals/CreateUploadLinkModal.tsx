import React, { useState } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaLink, FaFont, FaHashtag, FaCalendarAlt, FaInfoCircle, FaPlus } from 'react-icons/fa';

interface CreateUploadLinkModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: { name: string; maxUses: number; expiresInDays: number }) => Promise<void>;
}

export default function CreateUploadLinkModal({ show, onHide, onSubmit }: CreateUploadLinkModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    maxUses: 1,
    expiresInDays: 7,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('Name is required');
      }
      if (formData.maxUses < 1) {
        throw new Error('Maximum uses must be at least 1');
      }
      if (formData.expiresInDays < 1 || formData.expiresInDays > 30) {
        throw new Error('Expiration days must be between 1 and 30');
      }

      await onSubmit(formData);
      setFormData({ name: '', maxUses: 1, expiresInDays: 7 }); // Reset form
      onHide();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create upload link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered className="create-upload-link-modal">
      <div className="modal-header-custom">
        <div className="d-flex align-items-center gap-3">
          <div className="modal-icon">
            <FaLink />
          </div>
          <Modal.Title>Create Upload Link</Modal.Title>
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
          {error && (
            <Alert variant="danger" className="custom-alert mb-3">
              {error}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label className="form-label-custom">
              <FaFont className="label-icon" />
              Link Name
            </Form.Label>
            <Form.Control
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter a name for this upload link"
              required
              className="form-control-custom"
              autoFocus
            />
            <div className="form-hint">
              <FaInfoCircle />
              <span>This name will be used to create a folder for uploaded files</span>
            </div>
          </Form.Group>

          <div className="row">
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">
                  <FaHashtag className="label-icon" />
                  Maximum Uses
                </Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 1 })}
                  required
                  className="form-control-custom"
                />
                <div className="form-hint">
                  <FaInfoCircle />
                  <span>Times this link can be used</span>
                </div>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">
                  <FaCalendarAlt className="label-icon" />
                  Expires In (Days)
                </Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max="30"
                  value={formData.expiresInDays}
                  onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) || 7 })}
                  required
                  className="form-control-custom"
                />
                <div className="form-hint">
                  <FaInfoCircle />
                  <span>Max 30 days</span>
                </div>
              </Form.Group>
            </div>
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
                Create Link
              </>
            )}
          </Button>
        </div>
      </Form>

      <style jsx global>{`
        .create-upload-link-modal :global(.modal-content) {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
          border: 1px solid rgba(102, 126, 234, 0.3) !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
        }

        .create-upload-link-modal :global(.modal-header-custom) {
          background: #667eea !important;
          border-bottom: none !important;
          padding: 1.5rem 2rem !important;
          color: white !important;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .create-upload-link-modal :global(.modal-header-custom .btn-close) {
          filter: brightness(0) invert(1) !important;
          opacity: 0.8 !important;
        }

        .create-upload-link-modal :global(.modal-header-custom .btn-close:hover) {
          opacity: 1 !important;
        }

        .create-upload-link-modal :global(.modal-title) {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          color: white !important;
        }

        .create-upload-link-modal :global(.modal-icon) {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          font-size: 1.2rem;
        }

        .create-upload-link-modal :global(.modal-body-custom) {
          padding: 2rem !important;
          background: transparent !important;
        }

        .create-upload-link-modal :global(.custom-alert) {
          background: rgba(220, 53, 69, 0.1) !important;
          border: 1px solid rgba(220, 53, 69, 0.3) !important;
          color: #ff6b6b !important;
          border-radius: 10px !important;
        }

        .create-upload-link-modal :global(.form-label-custom) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.9) !important;
          font-weight: 500 !important;
          font-size: 0.95rem !important;
          margin-bottom: 0.75rem !important;
        }

        .create-upload-link-modal :global(.label-icon) {
          color: #667eea;
          font-size: 1rem;
        }

        .create-upload-link-modal :global(.form-control-custom) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 10px !important;
          color: #ffffff !important;
          padding: 0.75rem 1rem !important;
          font-size: 0.95rem !important;
          transition: all 0.3s ease !important;
        }

        .create-upload-link-modal :global(.form-control-custom:focus) {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: #667eea !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2) !important;
          color: #ffffff !important;
        }

        .create-upload-link-modal :global(.form-control-custom::placeholder) {
          color: rgba(255, 255, 255, 0.4) !important;
        }

        .create-upload-link-modal :global(.form-hint) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(102, 126, 234, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.8rem;
        }

        .create-upload-link-modal :global(.form-hint svg) {
          color: #667eea;
          flex-shrink: 0;
          font-size: 0.75rem;
        }

        .create-upload-link-modal :global(.modal-footer-custom) {
          background: rgba(255, 255, 255, 0.03) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding: 1.5rem 2rem !important;
          gap: 1rem !important;
          display: flex;
          justify-content: flex-end;
        }

        .create-upload-link-modal :global(.cancel-btn) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #ffffff !important;
          padding: 0.65rem 1.5rem !important;
          border-radius: 10px !important;
          font-weight: 500 !important;
          transition: all 0.3s ease !important;
        }

        .create-upload-link-modal :global(.cancel-btn:hover:not(:disabled)) {
          background: rgba(255, 255, 255, 0.1) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          transform: translateY(-1px) !important;
        }

        .create-upload-link-modal :global(.submit-btn) {
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

        .create-upload-link-modal :global(.submit-btn:hover:not(:disabled)) {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
        }

        .create-upload-link-modal :global(.submit-btn:disabled) {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }

        .create-upload-link-modal :global(.spinner-border-sm) {
          width: 1rem;
          height: 1rem;
          border-width: 2px;
        }
      `}</style>
    </Modal>
  );
} 