import React, { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';

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
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Create Upload Link</Modal.Title>
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
              placeholder="Enter a name for this upload link"
              required
            />
            <Form.Text className="text-muted">
              This name will be used to create a folder for uploaded files
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Maximum Uses</Form.Label>
            <Form.Control
              type="number"
              min="1"
              value={formData.maxUses}
              onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 1 })}
              required
            />
            <Form.Text className="text-muted">
              How many times this link can be used before it expires
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Expires In (Days)</Form.Label>
            <Form.Control
              type="number"
              min="1"
              max="30"
              value={formData.expiresInDays}
              onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) || 7 })}
              required
            />
            <Form.Text className="text-muted">
              Number of days before the link expires (maximum 30 days)
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Link'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
} 