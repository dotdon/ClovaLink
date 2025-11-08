'use client';

import React, { useState, useRef } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { FaEdit, FaBuilding, FaCamera, FaTrash, FaInfoCircle } from 'react-icons/fa';

interface EditCompanyModalProps {
  show: boolean;
  onHide: () => void;
  company: {
    id: string;
    name: string;
    logo?: string | null;
  };
  onSubmit: (data: { id: string; name: string }) => Promise<void>;
  onLogoUpload: (companyId: string, file: File) => Promise<void>;
  onLogoDelete: (companyId: string) => Promise<void>;
}

export default function EditCompanyModal({ 
  show, 
  onHide, 
  company, 
  onSubmit,
  onLogoUpload,
  onLogoDelete 
}: EditCompanyModalProps) {
  const [formData, setFormData] = useState({
    id: company.id,
    name: company.name,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [currentLogo, setCurrentLogo] = useState(company.logo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(formData);
      onHide();
    } catch (error) {
      console.error('Failed to update company:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      await onLogoUpload(company.id, file);
      setCurrentLogo(`${company.id}-${Date.now()}`); // Placeholder
    } catch (error) {
      console.error('Failed to upload logo:', error);
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogoDelete = async () => {
    if (!confirm('Remove company logo?')) return;
    
    try {
      await onLogoDelete(company.id);
      setCurrentLogo(null);
    } catch (error) {
      console.error('Failed to delete logo:', error);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered className="edit-company-modal">
      <Modal.Header closeButton className="modal-header-custom">
        <Modal.Title className="d-flex align-items-center gap-2">
          <div className="modal-icon">
            <FaEdit />
          </div>
          <span>Edit Company</span>
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body className="modal-body-custom">
          {/* Logo Section */}
          <div className="logo-section">
            <Form.Label className="form-label-custom">
              <FaBuilding className="label-icon" />
              Company Logo
            </Form.Label>
            <div className="logo-upload-area">
              <div className="logo-preview">
                {currentLogo ? (
                  <img 
                    src={`/api/companies/logo/${currentLogo}`} 
                    alt="Company logo"
                    className="logo-image"
                  />
                ) : (
                  <div className="logo-placeholder">
                    <FaBuilding />
                  </div>
                )}
              </div>
              <div className="logo-buttons">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="upload-logo-btn"
                >
                  <FaCamera className="me-2" />
                  {isUploadingLogo ? 'Uploading...' : currentLogo ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {currentLogo && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={handleLogoDelete}
                    className="delete-logo-btn"
                  >
                    <FaTrash />
                  </Button>
                )}
              </div>
            </div>
            <div className="logo-hint">
              <FaInfoCircle /> Recommended: Square image, max 5MB (JPG, PNG, GIF, WebP)
            </div>
          </div>

          {/* Company Name */}
          <Form.Group className="mb-3">
            <Form.Label className="form-label-custom">
              <FaBuilding className="label-icon" />
              Company Name
            </Form.Label>
            <Form.Control
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter company name"
              required
              className="form-control-custom"
            />
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
        .edit-company-modal :global(.modal-content) {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
          border: 1px solid rgba(102, 126, 234, 0.3) !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
        }

        .edit-company-modal :global(.modal-header-custom) {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          border-bottom: none !important;
          padding: 1.5rem 2rem !important;
          color: white !important;
        }

        .edit-company-modal :global(.modal-header-custom .btn-close) {
          filter: brightness(0) invert(1) !important;
          opacity: 0.8 !important;
        }

        .edit-company-modal :global(.modal-header-custom .btn-close:hover) {
          opacity: 1 !important;
        }

        .edit-company-modal :global(.modal-title) {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          color: white !important;
        }

        .edit-company-modal :global(.modal-icon) {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          font-size: 1.2rem;
        }

        .edit-company-modal :global(.modal-body-custom) {
          padding: 2rem !important;
          background: transparent !important;
        }

        .edit-company-modal :global(.logo-section) {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .edit-company-modal :global(.logo-upload-area) {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .edit-company-modal :global(.logo-preview) {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid #667eea;
          flex-shrink: 0;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .edit-company-modal :global(.logo-image) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .edit-company-modal :global(.logo-placeholder) {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 2rem;
        }

        .edit-company-modal :global(.logo-buttons) {
          display: flex;
          gap: 0.5rem;
          flex-direction: column;
        }

        .edit-company-modal :global(.upload-logo-btn) {
          background: rgba(102, 126, 234, 0.1) !important;
          border-color: #667eea !important;
          color: #667eea !important;
          padding: 0.5rem 1rem !important;
          border-radius: 8px !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
        }

        .edit-company-modal :global(.upload-logo-btn:hover:not(:disabled)) {
          background: rgba(102, 126, 234, 0.2) !important;
          border-color: #764ba2 !important;
        }

        .edit-company-modal :global(.delete-logo-btn) {
          background: rgba(220, 53, 69, 0.1) !important;
          border-color: #dc3545 !important;
          color: #dc3545 !important;
          padding: 0.5rem !important;
          border-radius: 8px !important;
          transition: all 0.2s ease !important;
        }

        .edit-company-modal :global(.delete-logo-btn:hover) {
          background: rgba(220, 53, 69, 0.2) !important;
        }

        .edit-company-modal :global(.logo-hint) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(102, 126, 234, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
        }

        .edit-company-modal :global(.logo-hint svg) {
          color: #667eea;
          flex-shrink: 0;
        }

        .edit-company-modal :global(.form-label-custom) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.9) !important;
          font-weight: 500 !important;
          font-size: 0.95rem !important;
          margin-bottom: 0.75rem !important;
        }

        .edit-company-modal :global(.label-icon) {
          color: #667eea;
          font-size: 1rem;
        }

        .edit-company-modal :global(.form-control-custom) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 10px !important;
          color: #ffffff !important;
          padding: 0.75rem 1rem !important;
          font-size: 0.95rem !important;
          transition: all 0.3s ease !important;
        }

        .edit-company-modal :global(.form-control-custom:focus) {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: #667eea !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2) !important;
          color: #ffffff !important;
        }

        .edit-company-modal :global(.form-control-custom::placeholder) {
          color: rgba(255, 255, 255, 0.4) !important;
        }

        .edit-company-modal :global(.modal-footer-custom) {
          background: rgba(255, 255, 255, 0.03) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding: 1.5rem 2rem !important;
          gap: 1rem !important;
        }

        .edit-company-modal :global(.cancel-btn) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #ffffff !important;
          padding: 0.65rem 1.5rem !important;
          border-radius: 10px !important;
          font-weight: 500 !important;
          transition: all 0.3s ease !important;
        }

        .edit-company-modal :global(.cancel-btn:hover) {
          background: rgba(255, 255, 255, 0.1) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          transform: translateY(-1px) !important;
        }

        .edit-company-modal :global(.submit-btn) {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
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

        .edit-company-modal :global(.submit-btn:hover:not(:disabled)) {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
        }

        .edit-company-modal :global(.submit-btn:disabled) {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }

        .edit-company-modal :global(.spinner-border-sm) {
          width: 1rem;
          height: 1rem;
          border-width: 2px;
        }
      `}</style>
    </Modal>
  );
}

