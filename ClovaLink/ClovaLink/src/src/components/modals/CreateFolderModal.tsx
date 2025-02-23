import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { FaFolder } from 'react-icons/fa';

interface CreateFolderModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (folderName: string) => Promise<void>;
}

export default function CreateFolderModal({ show, onHide, onSubmit }: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(folderName.trim());
      setFolderName('');
      onHide();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFolderName('');
    setError('');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered className="folder-modal">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="d-flex align-items-center">
          <FaFolder className="me-2 text-primary" size={24} />
          Create New Folder
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-3">
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Control
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              isInvalid={!!error}
              disabled={isSubmitting}
              autoFocus
              className="form-control-lg"
              style={{
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '1rem'
              }}
            />
            <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer className="border-0">
        <Button
          variant="light"
          onClick={handleClose}
          disabled={isSubmitting}
          className="me-2"
          style={{
            borderRadius: '8px',
            padding: '8px 16px'
          }}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            borderRadius: '8px',
            padding: '8px 16px'
          }}
        >
          {isSubmitting ? 'Creating...' : 'Create Folder'}
        </Button>
      </Modal.Footer>
      <style jsx global>{`
        .folder-modal .modal-content {
          border-radius: 12px;
          border: none;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }
        
        .folder-modal .modal-header {
          padding: 1.5rem 1.5rem 0.5rem;
        }
        
        .folder-modal .modal-body {
          padding: 1rem 1.5rem;
        }
        
        .folder-modal .modal-footer {
          padding: 1rem 1.5rem 1.5rem;
        }
        
        .folder-modal .form-control:focus {
          border-color: #1a73e8;
          box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
        }
      `}</style>
    </Modal>
  );
} 