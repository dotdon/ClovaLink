'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Alert, Form } from 'react-bootstrap';
import { FaTrash, FaUndo, FaFolder, FaFile, FaTrashAlt, FaCheckSquare, FaSquare, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { hasPermission, Permission } from '@/lib/permissions';

interface TrashItem {
  id: string;
  name: string;
  type: 'document' | 'folder';
  deletedAt: string;
  deletedBy?: {
    firstName: string;
    lastName: string;
  };
}

interface TrashModalProps {
  show: boolean;
  onHide: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

const TRASH_RETENTION_DAYS = 30; // Items are permanently deleted after 30 days

export default function TrashModal({ show, onHide, onRestore, onDelete }: TrashModalProps) {
  const { data: session } = useSession();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (show) {
      fetchTrashItems();
      setSelectedItems(new Set());
      setSelectAll(false);
      setSearchQuery('');
    }
  }, [show]);

  useEffect(() => {
    if (selectAll) {
      const allItemIds = filteredItems.map(item => `${item.type}-${item.id}`);
      setSelectedItems(new Set(allItemIds));
    } else {
      setSelectedItems(new Set());
    }
  }, [selectAll]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchTrashItems = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/trash');
      if (!response.ok) throw new Error('Failed to fetch trash items');
      const data = await response.json();
      
      // Convert the API response to a flat array of trash items
      const items: TrashItem[] = [
        ...(data.documents || []).map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          type: 'document' as const,
          deletedAt: doc.deletedAt,
          deletedBy: doc.deletedBy
        })),
        ...(data.folders || []).map((folder: any) => ({
          id: folder.id,
          name: folder.name,
          type: 'folder' as const,
          deletedAt: folder.deletedAt,
          deletedBy: folder.deletedBy
        }))
      ];
      
      setTrashItems(items);
    } catch (err) {
      console.error('Error fetching trash:', err);
      setError('Failed to load trash items');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (itemId: string, itemType: 'document' | 'folder') => {
    try {
      const response = await fetch('/api/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: itemId, type: itemType }]
        })
      });

      if (!response.ok) throw new Error('Failed to restore item');
      
      await fetchTrashItems();
      onRestore();
    } catch (err) {
      console.error('Error restoring item:', err);
      setError('Failed to restore item');
    }
  };

  const handlePermanentDelete = async (itemId: string, itemType: 'document' | 'folder') => {
    if (!confirm(`Are you sure you want to permanently delete this ${itemType}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/trash/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: itemId, type: itemType }]
        })
      });

      if (!response.ok) throw new Error('Failed to delete item');
      
      await fetchTrashItems();
      onDelete();
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to permanently delete item');
    }
  };

  const handleBulkRestore = async () => {
    if (selectedItems.size === 0) return;

    try {
      const itemsToRestore = Array.from(selectedItems).map(key => {
        const [type, id] = key.split('-');
        return { id, type };
      });

      const response = await fetch('/api/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToRestore })
      });

      if (!response.ok) throw new Error('Failed to restore items');
      
      await fetchTrashItems();
      setSelectedItems(new Set());
      setSelectAll(false);
      onRestore();
    } catch (err) {
      console.error('Error restoring items:', err);
      setError('Failed to restore selected items');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    if (!confirm(`Are you sure you want to permanently delete ${selectedItems.size} item(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const itemsToDelete = Array.from(selectedItems).map(key => {
        const [type, id] = key.split('-');
        return { id, type };
      });

      const response = await fetch('/api/trash/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToDelete })
      });

      if (!response.ok) throw new Error('Failed to delete items');
      
      await fetchTrashItems();
      setSelectedItems(new Set());
      setSelectAll(false);
      onDelete();
    } catch (err) {
      console.error('Error deleting items:', err);
      setError('Failed to permanently delete selected items');
    }
  };

  const handleEmptyTrash = async () => {
    if (trashItems.length === 0) return;

    if (!confirm(`Are you sure you want to permanently delete ALL ${trashItems.length} items in trash? This action cannot be undone.`)) {
      return;
    }

    try {
      const itemsToDelete = trashItems.map(item => ({
        id: item.id,
        type: item.type
      }));

      const response = await fetch('/api/trash/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToDelete })
      });

      if (!response.ok) throw new Error('Failed to empty trash');
      
      await fetchTrashItems();
      setSelectedItems(new Set());
      setSelectAll(false);
      onDelete();
    } catch (err) {
      console.error('Error emptying trash:', err);
      setError('Failed to empty trash');
    }
  };

  const toggleItemSelection = (itemId: string, itemType: string) => {
    const key = `${itemType}-${itemId}`;
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const getDaysUntilDeletion = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const now = new Date();
    const diffInMs = now.getTime() - deleted.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    return Math.max(0, TRASH_RETENTION_DAYS - diffInDays);
  };

  const filteredItems = trashItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, endIndex);

  const canPermanentlyDelete = hasPermission(session, Permission.PERMANENTLY_DELETE);
  const canRestore = hasPermission(session, Permission.RESTORE_TRASH);

  return (
    <Modal show={show} onHide={onHide} size="xl" centered className="trash-modal">
      <style jsx global>{`
        .trash-modal .modal-content {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
          border: 2px solid rgba(102, 126, 234, 0.3) !important;
          border-radius: 20px !important;
          color: #ffffff !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
        }

        .trash-modal .modal-header {
          background: #667eea !important;
          border: none !important;
          border-radius: 20px 20px 0 0 !important;
          padding: 1.5rem !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .trash-modal .modal-header .btn-close {
          filter: brightness(0) invert(1) !important;
          opacity: 0.8 !important;
        }

        .trash-modal .modal-header .btn-close:hover {
          opacity: 1 !important;
        }

        .trash-modal .modal-title {
          color: #ffffff !important;
          font-weight: 600 !important;
          font-size: 1.25rem !important;
        }

        .trash-modal-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .trash-modal-title h5 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .trash-info-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .trash-modal .modal-body {
          background: transparent !important;
          padding: 0 !important;
          max-height: 70vh !important;
          overflow: hidden !important;
          color: #ffffff !important;
        }

        .trash-toolbar {
          background: rgba(102, 126, 234, 0.1);
          border-bottom: 1px solid rgba(102, 126, 234, 0.2);
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .trash-toolbar-left {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .trash-select-all {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          color: #fff;
          font-size: 0.95rem;
        }

        .trash-select-all input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #667eea;
        }

        .trash-search-box {
          flex: 1;
          max-width: 300px;
        }

        .trash-search-box input {
          width: 100%;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(102, 126, 234, 0.3);
          color: #fff;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .trash-search-box input:focus {
          background: rgba(255, 255, 255, 0.15);
          border-color: #667eea;
          outline: none;
        }

        .trash-search-box input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .trash-toolbar-right {
          display: flex;
          gap: 0.5rem;
        }

        .trash-bulk-btn {
          background: transparent;
          border: 1px solid rgba(102, 126, 234, 0.5);
          color: #667eea;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          white-space: nowrap;
        }

        .trash-bulk-btn:hover:not(:disabled) {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .trash-bulk-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .trash-bulk-btn.danger {
          border-color: rgba(220, 53, 69, 0.5);
          color: #dc3545;
        }

        .trash-bulk-btn.danger:hover:not(:disabled) {
          background: #dc3545;
          color: white;
          border-color: #dc3545;
        }

        .trash-items-container {
          padding: 1.5rem 2rem;
          max-height: calc(70vh - 180px);
          overflow-y: auto;
        }

        .trash-items-container::-webkit-scrollbar {
          width: 8px;
        }

        .trash-items-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }

        .trash-items-container::-webkit-scrollbar-thumb {
          background: rgba(102, 126, 234, 0.5);
          border-radius: 10px;
        }

        .trash-items-container::-webkit-scrollbar-thumb:hover {
          background: rgba(102, 126, 234, 0.7);
        }

        .trash-item {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(102, 126, 234, 0.2);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.2s ease;
        }

        .trash-item:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(102, 126, 234, 0.4);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
        }

        .trash-item.selected {
          background: rgba(102, 126, 234, 0.15);
          border-color: #667eea;
        }

        .trash-item-checkbox {
          display: flex;
          align-items: center;
        }

        .trash-item-checkbox input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #667eea;
        }

        .trash-item-icon {
          font-size: 1.5rem;
          color: #667eea;
          min-width: 30px;
          text-align: center;
        }

        .trash-item-info {
          flex: 1;
          min-width: 0;
        }

        .trash-item-name {
          margin: 0;
          color: #fff;
          font-weight: 500;
          font-size: 0.9rem;
          margin-bottom: 0.15rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .trash-item-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.75rem;
        }

        .trash-item-meta-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .trash-item-warning {
          color: #ffc107;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 500;
        }

        .trash-item-actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .trash-action-btn {
          background: transparent;
          border: 1px solid rgba(102, 126, 234, 0.5);
          color: #667eea;
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          white-space: nowrap;
        }

        .trash-action-btn:hover {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .trash-action-btn.delete-btn {
          border-color: rgba(220, 53, 69, 0.5);
          color: #dc3545;
        }

        .trash-action-btn.delete-btn:hover {
          background: #dc3545;
          color: white;
          border-color: #dc3545;
        }

        .trash-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          border-top: 1px solid rgba(102, 126, 234, 0.2);
          background: rgba(102, 126, 234, 0.05);
        }

        .trash-pagination-btn {
          background: transparent;
          border: 1px solid rgba(102, 126, 234, 0.5);
          color: #667eea;
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          transition: all 0.2s ease;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .trash-pagination-btn:hover:not(:disabled) {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .trash-pagination-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .trash-pagination-info {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
          margin: 0 1rem;
        }

        .empty-trash-state {
          text-align: center;
          padding: 4rem 2rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .empty-trash-state svg {
          font-size: 5rem;
          margin-bottom: 1.5rem;
          opacity: 0.4;
        }

        .empty-trash-state h5 {
          color: #fff;
          margin-bottom: 0.5rem;
        }

        .empty-trash-state p {
          margin: 0;
          font-size: 0.95rem;
        }

        @media (max-width: 768px) {
          .trash-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .trash-toolbar-left,
          .trash-toolbar-right {
            width: 100%;
            flex-direction: column;
          }

          .trash-search-box {
            max-width: 100%;
          }

          .trash-item {
            flex-direction: column;
            align-items: flex-start;
          }

          .trash-item-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
        .trash-modal .alert {
          border-radius: 10px !important;
          border: 1px solid !important;
        }

        .trash-modal .alert-danger {
          background: rgba(220, 53, 69, 0.1) !important;
          border-color: rgba(220, 53, 69, 0.3) !important;
          color: #ff6b6b !important;
        }

        .trash-modal .spinner-border {
          color: #667eea !important;
        }
      `}</style>

      <Modal.Header closeButton>
        <Modal.Title>
          <div className="trash-modal-title">
            <h5>
              <FaTrash />
              Trash
            </h5>
            <div className="trash-info-badge">
              <FaClock />
              Items deleted after {TRASH_RETENTION_DAYS} days
            </div>
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ margin: '0 2rem 1rem' }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Loading trash...</p>
          </div>
        ) : trashItems.length === 0 ? (
          <div className="empty-trash-state">
            <FaTrashAlt />
            <h5>Trash is empty</h5>
            <p>Deleted items will appear here and be automatically removed after {TRASH_RETENTION_DAYS} days</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="trash-toolbar">
                <div className="trash-toolbar-left">
                  <label className="trash-select-all">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e) => setSelectAll(e.target.checked)}
                    />
                    <span>Select All ({filteredItems.length})</span>
                  </label>
                  
                  <div className="trash-search-box">
                    <input
                      type="text"
                      placeholder="Search trash..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="trash-toolbar-right">
                  {canRestore && (
                    <button
                      className="trash-bulk-btn"
                      onClick={handleBulkRestore}
                      disabled={selectedItems.size === 0}
                    >
                      <FaUndo />
                      Restore Selected ({selectedItems.size})
                    </button>
                  )}
                  
                  {canPermanentlyDelete && (
                    <>
                      <button
                        className="trash-bulk-btn danger"
                        onClick={handleBulkDelete}
                        disabled={selectedItems.size === 0}
                      >
                        <FaTrashAlt />
                        Delete Selected ({selectedItems.size})
                      </button>
                      
                      <button
                        className="trash-bulk-btn danger"
                        onClick={handleEmptyTrash}
                      >
                        <FaExclamationTriangle />
                        Empty Trash
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="trash-items-container">
                {currentItems.map((item) => {
                  const itemKey = `${item.type}-${item.id}`;
                  const isSelected = selectedItems.has(itemKey);
                  const daysLeft = getDaysUntilDeletion(item.deletedAt);
                  const isExpiringSoon = daysLeft <= 7;

                  return (
                    <div
                      key={itemKey}
                      className={`trash-item ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="trash-item-checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelection(item.id, item.type)}
                        />
                      </div>

                      <div className="trash-item-icon">
                        {item.type === 'folder' ? <FaFolder /> : <FaFile />}
                      </div>

                      <div className="trash-item-info">
                        <h6 className="trash-item-name">{item.name}</h6>
                        <div className="trash-item-meta">
                          <span className="trash-item-meta-item">
                            Deleted {formatDate(item.deletedAt)}
                          </span>
                          {item.deletedBy && (
                            <span className="trash-item-meta-item">
                              by {item.deletedBy.firstName} {item.deletedBy.lastName}
                            </span>
                          )}
                          {isExpiringSoon && (
                            <span className="trash-item-warning">
                              <FaExclamationTriangle />
                              Deletes in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="trash-item-actions">
                        {canRestore && (
                          <button
                            className="trash-action-btn"
                            onClick={() => handleRestore(item.id, item.type)}
                          >
                            <FaUndo /> Restore
                          </button>
                        )}
                        {canPermanentlyDelete && (
                          <button
                            className="trash-action-btn delete-btn"
                            onClick={() => handlePermanentDelete(item.id, item.type)}
                          >
                            <FaTrashAlt /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="trash-pagination">
                  <button
                    className="trash-pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  
                  <span className="trash-pagination-info">
                    Page {currentPage} of {totalPages} ({filteredItems.length} items)
                  </span>
                  
                  <button
                    className="trash-pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}
