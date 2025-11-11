'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaStickyNote, FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaUser } from 'react-icons/fa';
import { useSession } from 'next-auth/react';

interface Memo {
  id: string;
  content: string;
  employeeId: string;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
}

interface MemoModalProps {
  show: boolean;
  onHide: () => void;
  documentId?: string;
  folderId?: string;
  itemName: string;
  itemType: 'document' | 'folder';
}

export default function MemoModal({ show, onHide, documentId, folderId, itemName, itemType }: MemoModalProps) {
  const { data: session } = useSession();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemoContent, setNewMemoContent] = useState('');
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      fetchMemos();
    }
  }, [show, documentId, folderId]);

  const fetchMemos = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (documentId) params.append('documentId', documentId);
      if (folderId) params.append('folderId', folderId);

      const response = await fetch(`/api/memos?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch memos');
      }

      setMemos(data.memos || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemo = async () => {
    if (!newMemoContent.trim()) {
      setError('Memo content cannot be empty');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/memos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMemoContent,
          documentId: documentId || null,
          folderId: folderId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create memo');
      }

      setMemos([data.memo, ...memos]);
      setNewMemoContent('');
      setShowAddForm(false);
      setSuccess('Memo added successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMemo = async (memoId: string) => {
    if (!editContent.trim()) {
      setError('Memo content cannot be empty');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/memos/${memoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update memo');
      }

      setMemos(memos.map(m => m.id === memoId ? data.memo : m));
      setEditingMemoId(null);
      setEditContent('');
      setSuccess('Memo updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMemo = async (memoId: string) => {
    if (!confirm('Are you sure you want to delete this memo?')) {
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/memos/${memoId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete memo');
      }

      setMemos(memos.filter(m => m.id !== memoId));
      setSuccess('Memo deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (memo: Memo) => {
    setEditingMemoId(memo.id);
    setEditContent(memo.content);
    setShowAddForm(false);
  };

  const cancelEditing = () => {
    setEditingMemoId(null);
    setEditContent('');
  };

  const canEditMemo = (memo: Memo) => {
    if (!session?.user) return false;
    const isOwner = memo.employeeId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    const isManager = session.user.role === 'MANAGER';
    return isOwner || isAdmin || isManager;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg" centered className="memo-modal">
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center">
            <FaStickyNote className="me-2" style={{ color: '#ffc107' }} />
            Memos for {itemName}
            <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.7rem' }}>
              {itemType}
            </Badge>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading memos...</p>
          </div>
        ) : (
          <>
            {/* Add Memo Button */}
            {!showAddForm && !editingMemoId && (
              <Button
                variant="primary"
                className="w-100 mb-3"
                onClick={() => setShowAddForm(true)}
              >
                <FaPlus className="me-2" />
                Add New Memo
              </Button>
            )}

            {/* Add Memo Form */}
            {showAddForm && (
              <div className="mb-3 p-3 add-memo-form">
                <Form.Group>
                  <Form.Label>New Memo</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={newMemoContent}
                    onChange={(e) => setNewMemoContent(e.target.value)}
                    placeholder="Write your memo here..."
                    disabled={submitting}
                    style={{ resize: 'vertical' }}
                  />
                </Form.Group>
                <div className="d-flex gap-2 mt-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleAddMemo}
                    disabled={submitting || !newMemoContent.trim()}
                  >
                    <FaSave className="me-1" />
                    {submitting ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewMemoContent('');
                    }}
                    disabled={submitting}
                  >
                    <FaTimes className="me-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Memos List */}
            {memos.length === 0 ? (
              <div className="text-center py-5 empty-state">
                <FaStickyNote size={48} className="mb-3" style={{ opacity: 0.5 }} />
                <p>No memos yet. Add your first memo!</p>
              </div>
            ) : (
              <ListGroup>
                {memos.map((memo) => (
                  <ListGroup.Item key={memo.id}>
                    {editingMemoId === memo.id ? (
                      // Edit Mode
                      <div>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          disabled={submitting}
                          style={{ resize: 'vertical' }}
                        />
                        <div className="d-flex gap-2 mt-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleEditMemo(memo.id)}
                            disabled={submitting || !editContent.trim()}
                          >
                            <FaSave className="me-1" />
                            {submitting ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={cancelEditing}
                            disabled={submitting}
                          >
                            <FaTimes className="me-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="d-flex align-items-center">
                            <FaUser className="me-2" style={{ color: '#667eea' }} />
                            <small>
                              <strong>{memo.employee.name}</strong>
                              {memo.employeeId === session?.user?.id && (
                                <Badge bg="info" className="ms-2" style={{ fontSize: '0.65rem' }}>You</Badge>
                              )}
                            </small>
                          </div>
                          {canEditMemo(memo) && (
                            <div className="d-flex gap-2">
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => startEditing(memo)}
                                disabled={submitting}
                                className="edit-memo-btn"
                                style={{ padding: '0 5px' }}
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => handleDeleteMemo(memo.id)}
                                disabled={submitting}
                                className="delete-memo-btn"
                                style={{ padding: '0 5px' }}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="mb-2 memo-content">{memo.content}</p>
                        <small className="memo-timestamp">
                          {memo.updatedAt !== memo.createdAt ? 'Updated: ' : 'Created: '}
                          {formatDate(memo.updatedAt || memo.createdAt)}
                        </small>
                      </>
                    )}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </>
        )}
      </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx global>{`
        .memo-modal .modal-content {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
          border: 2px solid rgba(102, 126, 234, 0.3) !important;
          border-radius: 20px !important;
          color: #ffffff !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
        }

        .memo-modal .modal-header {
          background: #667eea !important;
          border: none !important;
          border-radius: 20px 20px 0 0 !important;
          padding: 1.5rem !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .memo-modal .modal-header .btn-close {
          filter: brightness(0) invert(1) !important;
          opacity: 0.8 !important;
        }

        .memo-modal .modal-header .btn-close:hover {
          opacity: 1 !important;
        }

        .memo-modal .modal-title {
          color: #ffffff !important;
          font-weight: 600 !important;
          font-size: 1.25rem !important;
        }

        .memo-modal .modal-body {
          background: transparent !important;
          padding: 2rem !important;
          max-height: 500px !important;
          overflow-y: auto !important;
          color: #ffffff !important;
        }

        .memo-modal .modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .memo-modal .modal-body::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }

        .memo-modal .modal-body::-webkit-scrollbar-thumb {
          background: rgba(102, 126, 234, 0.5);
          border-radius: 10px;
        }

        .memo-modal .modal-body::-webkit-scrollbar-thumb:hover {
          background: rgba(102, 126, 234, 0.7);
        }

        .memo-modal .modal-footer {
          background: transparent !important;
          border: none !important;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding: 1.5rem !important;
        }

        .memo-modal .btn-primary {
          background: #667eea !important;
          border: none !important;
          transition: all 0.3s ease !important;
          color: #fff !important;
        }

        .memo-modal .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
        }

        .memo-modal .btn-secondary {
          background: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #fff !important;
          transition: all 0.3s ease !important;
        }

        .memo-modal .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
        }

        .memo-modal .btn-success {
          background: #10b981 !important;
          border: none !important;
        }

        .memo-modal .btn-success:hover:not(:disabled) {
          background: #059669 !important;
          transform: translateY(-1px) !important;
        }

        .memo-modal .form-control,
        .memo-modal .form-control:focus {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(102, 126, 234, 0.3) !important;
          color: #fff !important;
          border-radius: 10px !important;
        }

        .memo-modal .form-control:focus {
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25) !important;
          border-color: #667eea !important;
        }

        .memo-modal .form-control::placeholder {
          color: rgba(255, 255, 255, 0.4) !important;
        }

        .memo-modal .form-label {
          color: rgba(255, 255, 255, 0.9) !important;
          font-weight: 500 !important;
          margin-bottom: 0.5rem !important;
        }

        .memo-modal .list-group-item {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(102, 126, 234, 0.2) !important;
          color: #fff !important;
          margin-bottom: 10px !important;
          border-radius: 12px !important;
          transition: all 0.3s ease !important;
        }

        .memo-modal .list-group-item:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(102, 126, 234, 0.4) !important;
        }

        .memo-modal .btn-link {
          text-decoration: none !important;
          transition: all 0.2s ease !important;
        }

        .memo-modal .btn-link:hover {
          transform: scale(1.1) !important;
        }

        .memo-modal .alert {
          border-radius: 10px !important;
          border: 1px solid !important;
        }

        .memo-modal .alert-danger {
          background: rgba(220, 53, 69, 0.1) !important;
          border-color: rgba(220, 53, 69, 0.3) !important;
          color: #ff6b6b !important;
        }

        .memo-modal .alert-success {
          background: rgba(16, 185, 129, 0.1) !important;
          border-color: rgba(16, 185, 129, 0.3) !important;
          color: #10b981 !important;
        }

        .memo-modal .badge {
          padding: 0.35em 0.65em !important;
          border-radius: 6px !important;
        }

        .memo-modal .spinner-border {
          color: #667eea !important;
        }

        .memo-modal .btn:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }

        .memo-modal .add-memo-form {
          background: rgba(102, 126, 234, 0.1) !important;
          border-radius: 10px !important;
          border: 1px solid rgba(102, 126, 234, 0.3) !important;
        }

        .memo-modal .empty-state {
          color: rgba(255, 255, 255, 0.6) !important;
        }

        .memo-modal .memo-content {
          white-space: pre-wrap !important;
        }

        .memo-modal .memo-timestamp {
          color: rgba(255, 255, 255, 0.5) !important;
        }

        .memo-modal .edit-memo-btn {
          color: #667eea !important;
        }

        .memo-modal .edit-memo-btn:hover {
          color: #5568d3 !important;
        }

        .memo-modal .delete-memo-btn {
          color: #dc3545 !important;
        }

        .memo-modal .delete-memo-btn:hover {
          color: #c82333 !important;
        }
      `}</style>
    </>
  );
}

