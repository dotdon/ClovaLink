'use client';

import React, { useState, useEffect } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaDownload, FaTrash, FaFolder, FaEye, FaUpload, FaFolderPlus, FaFile, FaEdit, FaArrowLeft, FaEllipsisV, FaSearch, FaCheckCircle, FaShare } from 'react-icons/fa';
import DocumentPreview from '@/components/DocumentPreview';
import { useSession } from 'next-auth/react';
import { hasPermission, Permission, canAccessFolder, canManageFolder, canManageDocument } from '@/lib/permissions';

interface Document {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: string;
  folderId: string | null;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  documents: Document[];
  parentId: string | null;
  children: Folder[];
  createdAt: string;
  updatedAt: string;
}

interface RenameModalProps {
  show: boolean;
  onHide: () => void;
  item: Document | Folder | null;
  onRename: (newName: string) => Promise<void>;
}

interface SuccessModalProps {
  show: boolean;
  onHide: () => void;
  message: string;
}

interface ShareLinkModalProps {
  show: boolean;
  onHide: () => void;
  item: Document | Folder | null;
}

function SuccessModal({ show, onHide, message }: SuccessModalProps) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Body className="text-center py-4">
        <FaCheckCircle className="text-success mb-3" size={48} />
        <p className="mb-0">{message}</p>
      </Modal.Body>
      <Modal.Footer className="justify-content-center border-0 pt-0">
        <Button variant="primary" onClick={onHide}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function ShareLinkModal({ show, onHide, item }: ShareLinkModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadLink, setDownloadLink] = useState<string>('');
  const [expiresInDays, setExpiresInDays] = useState(7);

  const generateLink = async () => {
    if (!item) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/download-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          folderId: 'children' in item ? item.id : undefined,
          documentId: !('children' in item) ? item.id : undefined,
          expiresInDays
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate download link');
      }

      const data = await response.json();
      setDownloadLink(data.downloadLink.url);
    } catch (error) {
      console.error('Error generating link:', error);
      alert('Failed to generate download link');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(downloadLink);
    alert('Link copied to clipboard!');
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Share {item && 'children' in item ? 'Folder' : 'Document'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Link expires in (days)</Form.Label>
            <Form.Control
              type="number"
              min="1"
              max="30"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
            />
          </Form.Group>
          {!downloadLink && (
            <Button
              variant="primary"
              onClick={generateLink}
              disabled={isGenerating}
              className="w-100"
            >
              {isGenerating ? 'Generating...' : 'Generate Download Link'}
            </Button>
          )}
          {downloadLink && (
            <div className="mt-3">
              <Form.Group>
                <Form.Label>Download Link</Form.Label>
                <div className="d-flex">
                  <Form.Control
                    type="text"
                    value={downloadLink}
                    readOnly
                  />
                  <Button variant="outline-primary" onClick={copyToClipboard} className="ms-2">
                    Copy
                  </Button>
                </div>
              </Form.Group>
            </div>
          )}
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default function DocumentsPage() {
  const { data: session } = useSession();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [unorganizedDocuments, setUnorganizedDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<Array<{ id: string; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showItemActions, setShowItemActions] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ type: 'document' | 'folder', id: string } | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [selectedItem, setSelectedItem] = useState<Document | Folder | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedShareItem, setSelectedShareItem] = useState<Document | Folder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Document | Folder | null>(null);

  // Permission checks
  const canDeleteDocuments = hasPermission(session, Permission.DELETE_DOCUMENTS);
  const canRenameDocuments = hasPermission(session, Permission.RENAME_DOCUMENTS);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      // Add company filter to the query
      const companyFilter = session?.user?.role === 'ADMIN' ? '' : `&companyId=${session?.user?.companyId}`;
      const response = await fetch(`/api/documents?${companyFilter}`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setFolders(data.folders || []);
      setUnorganizedDocuments(data.unorganizedDocuments || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}`);
      if (!response.ok) throw new Error('Failed to get document info');
      
      const fileResponse = await fetch(`/api/documents/${doc.id}/download`);
      const blob = await fileResponse.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const handleDelete = async (item: Document | Folder) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      // Prevent multiple delete requests for the same item
      if (isDeleting === itemToDelete.id) return;
      setIsDeleting(itemToDelete.id);

      // Check if user has permission to delete this item
      const isFolder = 'children' in itemToDelete;
      const canDelete = isFolder 
        ? canManageFolder(session, itemToDelete)
        : canManageDocument(session, itemToDelete);

      if (!canDelete) {
        throw new Error('You do not have permission to delete this item');
      }

      const itemType = isFolder ? 'folder' : 'document';
      
      const endpoint = isFolder ? `/api/documents/folders/${itemToDelete.id}` : `/api/documents/${itemToDelete.id}`;
      console.log('Deleting item:', { type: itemType, id: itemToDelete.id, endpoint });
      
      const response = await fetch(endpoint, { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || result.error || `Failed to delete ${itemType}`);
      }

      // If we're in the folder that's being deleted, navigate back
      if (isFolder && currentFolderId === itemToDelete.id) {
        handleNavigateBack();
      }

      await fetchDocuments();
      
      // Show success modal
      setSuccessMessage(result.message || `Successfully deleted ${itemType}`);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error deleting item:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete item');
    } finally {
      setIsDeleting(null);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!session?.user?.companyId && session?.user?.role !== 'ADMIN') {
        throw new Error('Company ID not found');
      }

      const response = await fetch('/api/documents/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentFolderId,
          companyId: session.user.companyId
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create folder');
      }

      setShowCreateFolderModal(false);
      setNewFolderName('');
      setSuccessMessage('Folder created successfully');
      setShowSuccessModal(true);
      await fetchDocuments();
    } catch (error) {
      console.error('Error creating folder:', error);
      alert(error instanceof Error ? error.message : 'Failed to create folder');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFiles.length) return;

    try {
      const formData = new FormData();
      uploadFiles.forEach(file => {
        formData.append('files', file);
      });
      
      if (currentFolderId) {
        formData.append('folderId', currentFolderId);
      }

      if (session?.user?.companyId) {
        formData.append('companyId', session.user.companyId);
      }

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload documents');
      }

      setShowUploadModal(false);
      setUploadFiles([]);
      setSuccessMessage('Documents uploaded successfully');
      setShowSuccessModal(true);
      await fetchDocuments();
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload documents');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const findFolder = (folderId: string, folderList: Folder[]): Folder | null => {
    for (const folder of folderList) {
      if (folder.id === folderId) {
        return folder;
      }
      if (folder.children.length > 0) {
        const found = findFolder(folderId, folder.children);
        if (found) return found;
      }
    }
    return null;
  };

  const getCurrentFolderContents = () => {
    if (!currentFolderId) {
      // Filter root level items by company
      return {
        folders: folders.filter((folder: Folder) => canAccessFolder(session, folder)),
        documents: unorganizedDocuments.filter((doc: Document) => canManageDocument(session, doc))
      };
    }

    const currentFolder = findFolder(currentFolderId, folders);
    if (!currentFolder || !canAccessFolder(session, currentFolder)) {
      return { folders: [], documents: [] };
    }

    return {
      folders: currentFolder.children.filter((folder: Folder) => canAccessFolder(session, folder)),
      documents: currentFolder.documents.filter((doc: Document) => canManageDocument(session, doc))
    };
  };

  const { folders: currentFolders, documents: currentDocuments } = getCurrentFolderContents();

  const filterItems = (items: (Document | Folder)[], query: string) => {
    if (!query.trim()) return items;
    
    const searchTerm = query.toLowerCase().trim();
    return items.filter((item: Document | Folder) => {
      const isFolder = 'children' in item;
      
      // Search in folder name and recursively in subfolders
      if (isFolder) {
        const folder = item as Folder;
        if (folder.name.toLowerCase().includes(searchTerm)) return true;
        
        // Search in subfolder names
        const hasMatchingSubfolder = (folders: Folder[]): boolean => {
          return folders.some(f => 
            f.name.toLowerCase().includes(searchTerm) || 
            (f.children && hasMatchingSubfolder(f.children))
          );
        };
        
        // Search in contained documents
        const hasMatchingDocument = (docs: Document[]): boolean => {
          return docs.some(doc => doc.name.toLowerCase().includes(searchTerm));
        };
        
        return (folder.children && hasMatchingSubfolder(folder.children)) ||
               (folder.documents && hasMatchingDocument(folder.documents));
      }
      
      // Search in document name
      return (item as Document).name.toLowerCase().includes(searchTerm);
    });
  };

  const contents = getCurrentFolderContents();
  const items = contents ? [...(contents.folders || []), ...(contents.documents || [])] : [];
  const filteredItems = filterItems(items, searchQuery);

  const handleNavigateToFolder = (folder: Folder) => {
    setCurrentFolderId(folder.id);
    setCurrentPath([...currentPath, { id: folder.id, name: folder.name }]);
    setSelectedItems(new Set());
  };

  const handleNavigateBack = () => {
    if (currentPath.length === 0) return;
    const newPath = currentPath.slice(0, -1);
    setCurrentPath(newPath);
    setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
    setSelectedItems(new Set());
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = currentPath.slice(0, index + 1);
    setCurrentPath(newPath);
    setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
    setSelectedItems(new Set());
  };

  const handleDragStart = (e: React.DragEvent, type: 'document' | 'folder', id: string) => {
    e.stopPropagation();
    setDraggedItem({ type, id });
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { type, id } = data;

      if (type === 'document') {
        const response = await fetch(`/api/documents/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: targetFolderId })
        });
        if (!response.ok) throw new Error('Failed to move document');
      } else if (type === 'folder') {
        if (id === targetFolderId) {
          alert('Cannot move a folder into itself');
          return;
        }
        const response = await fetch(`/api/documents/folders/${id}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: targetFolderId })
        });
        if (!response.ok) throw new Error('Failed to move folder');
      }

      setDraggedItem(null);
      await fetchDocuments();
    } catch (error) {
      console.error('Error handling drop:', error);
      alert('Failed to move item');
    }
  };

  const handleRename = async (item: Document | Folder) => {
    setSelectedItem(item);
    setShowRenameModal(true);
  };

  const handleRenameSubmit = async (newName: string) => {
    try {
      if (!selectedItem) return;

      const isFolder = 'children' in selectedItem;
      const endpoint = isFolder 
        ? `/api/documents/folders/${selectedItem.id}`
        : `/api/documents/${selectedItem.id}`;

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to rename ${isFolder ? 'folder' : 'document'}`);
      }

      await fetchDocuments();
      setShowRenameModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error renaming item:', error);
      alert(error instanceof Error ? error.message : 'Failed to rename item');
    }
  };

  const handleFolderDownload = async (folder: Folder) => {
    try {
      const response = await fetch(`/api/documents/folders/${folder.id}/download`);
      if (!response.ok) throw new Error('Failed to download folder');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folder.name}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading folder:', error);
      alert('Failed to download folder');
    }
  };

  return (
    <DashboardLayout>
      <div className="documents-page">
        {/* Mobile Header */}
        <div className="mobile-doc-header">
          <div className="header-left">
            {currentPath.length > 0 && (
              <button className="back-button" onClick={handleNavigateBack}>
                <FaArrowLeft />
              </button>
            )}
            <div className="current-location">
              {currentPath.length === 0 ? 'Documents' : currentPath[currentPath.length - 1].name}
            </div>
          </div>
          <div className="header-actions">
            <Button variant="primary" className="upload-btn" onClick={() => setShowUploadModal(true)}>
              <FaUpload />
            </Button>
            <Button variant="outline-primary" onClick={() => setShowCreateFolderModal(true)}>
              <FaFolderPlus />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <Form.Control
            type="search"
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Breadcrumb Navigation */}
        <div className="breadcrumb-nav">
          <button 
            className={`breadcrumb-item ${currentPath.length === 0 ? 'active' : ''}`}
            onClick={() => {
              setCurrentPath([]);
              setCurrentFolderId(null);
            }}
          >
            Documents
          </button>
          {currentPath.map((item, index) => (
            <React.Fragment key={item.id}>
              <span className="breadcrumb-separator">/</span>
              <button
                className={`breadcrumb-item ${index === currentPath.length - 1 ? 'active' : ''}`}
                onClick={() => handleBreadcrumbClick(index)}
              >
                {item.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Content List */}
        <div className="content-list">
          {isLoading ? (
            <div className="loading-state">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              {searchQuery ? (
                <>
                  <FaSearch size={48} className="empty-icon" />
                  <p>No matches found for "{searchQuery}"</p>
                </>
              ) : (
                <>
                  <FaFolder size={48} className="empty-icon" />
                  <p>This folder is empty</p>
                </>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isFolder = 'children' in item;
              return (
                <div 
                  key={item.id} 
                  className="list-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, isFolder ? 'folder' : 'document', item.id)}
                  onDragOver={isFolder ? handleDragOver : undefined}
                  onDragLeave={isFolder ? handleDragLeave : undefined}
                  onDrop={isFolder ? (e) => handleDrop(e, item.id) : undefined}
                >
                  <div 
                    className="item-main"
                    onClick={() => {
                      if (isFolder) {
                        handleNavigateToFolder(item as Folder);
                      } else {
                        setSelectedDocument(item as Document);
                        setShowPreview(true);
                      }
                    }}
                  >
                    <div className="item-icon">
                      {isFolder ? <FaFolder className="folder-icon" /> : <FaFile className="file-icon" />}
                    </div>
                    <div className="item-details">
                      <div className="item-name">{item.name}</div>
                      {!isFolder && (
                        <div className="item-meta">
                          {formatFileSize((item as Document).size)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="item-actions">
                    {canRenameDocuments && (
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(item);
                        }}
                        title={`Rename ${isFolder ? 'Folder' : 'Document'}`}
                      >
                        <FaEdit />
                      </button>
                    )}
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShareItem(item);
                        setShowShareModal(true);
                      }}
                      title="Share"
                    >
                      <FaShare />
                    </button>
                    {isFolder && (
                      <button 
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFolderDownload(item as Folder);
                        }}
                        title="Download as ZIP"
                      >
                        <FaDownload />
                      </button>
                    )}
                    {!isFolder && (
                      <button 
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(item as Document);
                        }}
                        title="Download"
                      >
                        <FaDownload />
                      </button>
                    )}
                    {canDeleteDocuments && (
                      <button 
                        className="action-btn delete-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(item);
                        }}
                        disabled={isDeleting === item.id}
                        title={`Delete ${isFolder ? 'Folder' : 'Document'}`}
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modals */}
        <Modal show={showPreview} onHide={() => setShowPreview(false)} fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>{selectedDocument?.name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedDocument && (
              <DocumentPreview
                documentId={selectedDocument.id}
                name={selectedDocument.name}
                mimeType={selectedDocument.mimeType}
                url={`/api/documents/${selectedDocument.id}/download`}
              />
            )}
          </Modal.Body>
        </Modal>

        <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Upload Documents</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleUpload}>
              <Form.Group>
                <Form.Label>Select Files</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const files = Array.from(e.target.files || []);
                    setUploadFiles(files);
                  }}
                  required
                />
              </Form.Group>
              <div className="mt-3 d-flex justify-content-end">
                <Button variant="secondary" onClick={() => {
                  setShowUploadModal(false);
                  setUploadFiles([]);
                }} className="me-2">
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={!uploadFiles.length}>
                  Upload {uploadFiles.length > 0 ? `(${uploadFiles.length} files)` : ''}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        <Modal show={showCreateFolderModal} onHide={() => setShowCreateFolderModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Create New Folder</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleCreateFolder}>
              <Form.Group>
                <Form.Label>Folder Name</Form.Label>
                <Form.Control
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  required
                />
              </Form.Group>
              <div className="mt-3 d-flex justify-content-end">
                <Button variant="secondary" onClick={() => setShowCreateFolderModal(false)} className="me-2">
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Create
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        <RenameModal
          show={showRenameModal}
          onHide={() => {
            setShowRenameModal(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          onRename={handleRenameSubmit}
        />

        <SuccessModal
          show={showSuccessModal}
          onHide={() => {
            setShowSuccessModal(false);
            setSuccessMessage('');
          }}
          message={successMessage}
        />

        <ShareLinkModal
          show={showShareModal}
          onHide={() => {
            setShowShareModal(false);
            setSelectedShareItem(null);
          }}
          item={selectedShareItem}
        />

        {/* Add Delete Confirmation Modal */}
        <Modal show={showDeleteModal} onHide={() => {
          setShowDeleteModal(false);
          setItemToDelete(null);
        }}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to delete {itemToDelete?.name}? This action cannot be undone.
            {('children' in (itemToDelete || {})) && (
              <div className="text-danger mt-2">
                Warning: This will also delete all files and subfolders within this folder.
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => {
              setShowDeleteModal(false);
              setItemToDelete(null);
            }}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={confirmDelete}
              disabled={isDeleting === itemToDelete?.id}
            >
              {isDeleting === itemToDelete?.id ? 'Deleting...' : 'Delete'}
            </Button>
          </Modal.Footer>
        </Modal>

        <style jsx>{`
          .documents-page {
            display: flex;
            flex-direction: column;
            height: 100vh;
            background: #f8f9fa;
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            overflow: hidden;
            z-index: 1;
          }

          .mobile-doc-header {
            background: #fff;
            padding: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e9ecef;
            position: fixed;
            top: 60px;
            left: 0;
            right: 0;
            z-index: 10;
            flex-shrink: 0;
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .back-button {
            border: none;
            background: none;
            padding: 0.75rem;
            color: #6c757d;
            cursor: pointer;
            font-size: 1.25rem;
          }

          .current-location {
            font-weight: 600;
            font-size: 1.25rem;
          }

          .header-actions {
            display: flex;
            gap: 0.75rem;
            z-index: 101;
          }

          .search-section {
            padding: 1.25rem;
            background: #fff;
            border-bottom: 1px solid #e9ecef;
            flex-shrink: 0;
            position: relative;
            z-index: 5;
          }

          .search-input {
            border-radius: 8px;
            border: 1px solid #dee2e6;
            padding: 0.875rem 1.25rem;
            font-size: 1rem;
            width: 100%;
          }

          .breadcrumb-nav {
            padding: 1rem 1.25rem;
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            align-items: center;
            background: #fff;
            border-bottom: 1px solid #e9ecef;
            flex-shrink: 0;
            position: relative;
            z-index: 5;
          }

          .breadcrumb-item {
            border: none;
            background: none;
            padding: 0.5rem 0.75rem;
            color: #0d6efd;
            cursor: pointer;
            font-size: 1rem;
          }

          .breadcrumb-item.active {
            color: #495057;
            cursor: default;
          }

          .breadcrumb-separator {
            color: #6c757d;
            font-size: 1rem;
          }

          .content-list {
            flex: 1;
            overflow-y: auto;
            padding: 1.5rem;
            background: #fff;
            min-height: 0;
            position: relative;
            z-index: 1;
          }

          .list-item {
            display: flex;
            align-items: center;
            padding: 1.25rem;
            border-radius: 12px;
            margin-bottom: 0.75rem;
            background: #fff;
            border: 1px solid #e9ecef;
            position: relative;
            cursor: move;
            transition: all 0.2s ease;
            isolation: isolate;
          }

          .list-item:hover {
            background: #f8f9fa;
            border-color: #dee2e6;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }

          .list-item.drag-over {
            background: #e9ecef;
            border: 2px dashed #0d6efd;
          }

          .item-main {
            display: flex;
            align-items: center;
            flex: 1;
            min-width: 0;
            cursor: pointer;
          }

          .item-icon {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1.25rem;
            flex-shrink: 0;
          }

          .folder-icon {
            color: #ffd43b;
            font-size: 2rem;
          }

          .file-icon {
            color: #748ffc;
            font-size: 2rem;
          }

          .item-details {
            flex: 1;
            min-width: 0;
          }

          .item-name {
            font-weight: 500;
            margin-bottom: 0.375rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 1rem;
          }

          .item-meta {
            font-size: 0.875rem;
            color: #6c757d;
          }

          .item-actions {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .action-btn {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            border: 1px solid #dee2e6;
            background: #fff;
            color: #6c757d;
            cursor: pointer;
            transition: all 0.2s ease;
            padding: 0;
          }

          .action-btn:hover {
            background: #f8f9fa;
            border-color: #ced4da;
            color: #495057;
          }

          .action-btn.delete-btn:hover {
            background: #dc3545;
            border-color: #dc3545;
            color: #fff;
          }

          .loading-state {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 300px;
            color: #6c757d;
            font-size: 1.25rem;
          }

          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 300px;
            color: #6c757d;
          }

          .empty-icon {
            margin-bottom: 1.5rem;
            color: #dee2e6;
            font-size: 4rem;
          }

          .empty-state p {
            font-size: 1.25rem;
            color: #6c757d;
          }

          /* Mobile styles */
          @media (max-width: 1023px) {
            .documents-page {
              padding-top: 60px;
              padding-bottom: 60px;
            }

            .search-section {
              margin-top: 60px;
            }

            .content-list {
              padding: 1rem;
            }

            :global(.upload-btn),
            :global(.btn-outline-primary) {
              padding: 0.5rem !important;
              height: 40px !important;
              width: 40px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              font-size: 1.25rem !important;
            }

            .header-actions {
              position: relative;
              right: 0;
            }

            .item-name {
              font-size: 0.875rem;
            }

            .item-icon {
              width: 40px;
              height: 40px;
            }

            .folder-icon,
            .file-icon {
              font-size: 1.5rem;
            }
          }

          /* Desktop styles */
          @media (min-width: 1024px) {
            .documents-page {
              left: 280px;
              width: calc(100% - 280px);
              display: flex;
              flex-direction: column;
            }

            .mobile-doc-header {
              position: relative;
              top: 0;
              padding: 1.5rem 2rem;
            }

            .search-section {
              position: relative;
              margin-top: 0;
              padding: 1.5rem 2rem;
            }

            .breadcrumb-nav {
              position: relative;
              padding: 1.25rem 2rem;
            }

            .content-list {
              position: relative;
              padding: 2rem;
              flex: 1;
              overflow-y: auto;
            }
          }

          /* Large desktop styles */
          @media (min-width: 1440px) {
            .mobile-doc-header {
              padding: 2rem 2.5rem;
            }

            .search-section {
              padding: 1.75rem 2.5rem;
            }

            .breadcrumb-nav {
              padding: 1.5rem 2.5rem;
            }

            .content-list {
              padding: 2.5rem;
            }

            .list-item {
              padding: 1.75rem;
            }

            .item-name {
              font-size: 1.25rem;
            }

            .current-location {
              font-size: 1.5rem;
            }

            .search-input {
              font-size: 1.125rem;
              padding: 1rem 1.5rem;
            }
          }

          :global(.upload-btn) {
            padding: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}

function RenameModal({ show, onHide, item, onRename }: RenameModalProps) {
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFolder = item ? 'children' in item : false;

  useEffect(() => {
    if (show && item) {
      setNewName(item.name);
    }
  }, [show, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !item) return;

    setIsSubmitting(true);
    try {
      await onRename(newName.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) {
    return null;
  }

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Rename {isFolder ? 'Folder' : 'Document'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group>
            <Form.Label>New Name</Form.Label>
            <Form.Control
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`Enter new ${isFolder ? 'folder' : 'document'} name`}
              required
            />
          </Form.Group>
          <div className="mt-3 d-flex justify-content-end">
            <Button variant="secondary" onClick={onHide} className="me-2">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}