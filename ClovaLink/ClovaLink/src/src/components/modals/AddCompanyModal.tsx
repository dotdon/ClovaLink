import React, { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

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
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Add New Company</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Company Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter company name"
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Company'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
} 