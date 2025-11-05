'use client';

import React, { useState, useEffect } from 'react';
import { Button, Form, Modal, Alert, Dropdown, ButtonGroup } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaDownload, FaTrash, FaFolder, FaEye, FaUpload, FaFolderPlus, FaFile, FaEdit, FaArrowLeft, FaEllipsisV, FaSearch, FaCheckCircle, FaShare, FaFilePdf, FaFileWord, FaFileImage, FaInfo, FaTh, FaList, FaSortAlphaDown, FaSortAmountDown, FaCalendarAlt } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { hasPermission, Permission, canAccessFolder, canManageFolder, canManageDocument } from '@/lib/permissions';
import DocumentViewerModal from '@/components/viewers/DocumentViewerModal';

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
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState<Document | Folder | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');

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
          <div className="search-controls">
            <Form.Control
              type="search"
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <div className="view-controls">
              <ButtonGroup className="view-toggle">
                <Button 
                  variant={viewMode === 'grid' ? 'primary' : 'outline-light'}
                  onClick={() => setViewMode('grid')}
                  size="sm"
                >
                  <FaTh />
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'primary' : 'outline-light'}
                  onClick={() => setViewMode('list')}
                  size="sm"
                >
                  <FaList />
                </Button>
              </ButtonGroup>
              <Dropdown>
                <Dropdown.Toggle variant="outline-light" size="sm" className="sort-dropdown">
                  {sortBy === 'name' && <FaSortAlphaDown className="me-1" />}
                  {sortBy === 'date' && <FaCalendarAlt className="me-1" />}
                  {sortBy === 'size' && <FaSortAmountDown className="me-1" />}
                  Sort
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => setSortBy('name')}>
                    <FaSortAlphaDown className="me-2" /> Name
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setSortBy('date')}>
                    <FaCalendarAlt className="me-2" /> Date Modified
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setSortBy('size')}>
                    <FaSortAmountDown className="me-2" /> Size
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
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
            <FaFolder className="breadcrumb-icon" />
            <span>Documents</span>
          </button>
          {currentPath.map((item, index) => (
            <React.Fragment key={item.id}>
              <span className="breadcrumb-separator">/</span>
              <button
                className={`breadcrumb-item ${index === currentPath.length - 1 ? 'active' : ''}`}
                onClick={() => handleBreadcrumbClick(index)}
              >
                <FaFolder className="breadcrumb-icon" />
                <span>{item.name}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Content List */}
        <div className={`content-list ${viewMode}`}>
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
                      {isFolder ? (
                        <FaFolder className="folder-icon" />
                      ) : (
                        <>
                          {(item as Document).mimeType === 'application/pdf' && <FaFilePdf className="file-icon pdf-icon" />}
                          {(item as Document).mimeType.startsWith('image/') && <FaFileImage className="file-icon image-icon" />}
                          {((item as Document).mimeType.includes('word') || (item as Document).name.endsWith('.docx')) && <FaFileWord className="file-icon word-icon" />}
                          {!(item as Document).mimeType.includes('pdf') && !(item as Document).mimeType.startsWith('image/') && !(item as Document).mimeType.includes('word') && !((item as Document).name.endsWith('.docx')) && <FaFile className="file-icon" />}
                        </>
                      )}
                    </div>
                    <div className="item-details">
                      <div className="item-name">{item.name}</div>
                      {!isFolder && (
                        <div className="item-meta">
                          <span>{formatFileSize((item as Document).size)}</span>
                          <span className="meta-separator">•</span>
                          <span>{new Date((item as Document).updatedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {isFolder && (
                        <div className="item-meta">
                          <span>Folder</span>
                          <span className="meta-separator">•</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="item-actions">
                    <Dropdown onClick={(e) => e.stopPropagation()}>
                      <Dropdown.Toggle 
                        variant="link" 
                        className="three-dot-menu"
                        id={`dropdown-${item.id}`}
                      >
                        <FaEllipsisV />
                      </Dropdown.Toggle>

                      <Dropdown.Menu align="end">
                        <Dropdown.Item 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInfo(item);
                            setShowInfoModal(true);
                          }}
                        >
                          <FaInfo className="me-2" /> Get Info
                        </Dropdown.Item>
                        <Dropdown.Divider />
                        {canRenameDocuments && (
                          <Dropdown.Item 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRename(item);
                            }}
                          >
                            <FaEdit className="me-2" /> Rename
                          </Dropdown.Item>
                        )}
                        <Dropdown.Item 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedShareItem(item);
                            setShowShareModal(true);
                          }}
                        >
                          <FaShare className="me-2" /> Share
                        </Dropdown.Item>
                        <Dropdown.Item 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isFolder) {
                              handleFolderDownload(item as Folder);
                            } else {
                              handleDownload(item as Document);
                            }
                          }}
                        >
                          <FaDownload className="me-2" /> Download
                        </Dropdown.Item>
                        {canDeleteDocuments && (
                          <>
                            <Dropdown.Divider />
                            <Dropdown.Item 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(item);
                              }}
                              className="text-danger"
                              disabled={isDeleting === item.id}
                            >
                              <FaTrash className="me-2" /> Delete
                            </Dropdown.Item>
                          </>
                        )}
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modals */}
        <DocumentViewerModal
          show={showPreview}
          onHide={() => setShowPreview(false)}
          document={selectedDocument}
          onDownload={handleDownload}
        />

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

        {/* Info Modal */}
        <Modal show={showInfoModal} onHide={() => setShowInfoModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>
              {selectedInfo && 'children' in selectedInfo ? 'Folder' : 'Document'} Information
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedInfo && (
              <div className="info-content">
                <div className="info-row">
                  <strong>Name:</strong>
                  <span>{selectedInfo.name}</span>
                </div>
                <div className="info-row">
                  <strong>Type:</strong>
                  <span>{'children' in selectedInfo ? 'Folder' : (selectedInfo as Document).mimeType}</span>
                </div>
                {!('children' in selectedInfo) && (
                  <>
                    <div className="info-row">
                      <strong>Size:</strong>
                      <span>{formatFileSize((selectedInfo as Document).size)}</span>
                    </div>
                    <div className="info-row">
                      <strong>Path:</strong>
                      <span>{(selectedInfo as Document).path}</span>
                    </div>
                  </>
                )}
                <div className="info-row">
                  <strong>Created:</strong>
                  <span>{new Date(selectedInfo.createdAt).toLocaleString()}</span>
                </div>
                <div className="info-row">
                  <strong>Modified:</strong>
                  <span>{new Date(selectedInfo.updatedAt).toLocaleString()}</span>
                </div>
                {'children' in selectedInfo && (
                  <div className="info-row">
                    <strong>Items:</strong>
                    <span>
                      {(selectedInfo as Folder).documents.length} document(s), {(selectedInfo as Folder).children.length} folder(s)
                    </span>
                  </div>
                )}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowInfoModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

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
            background: transparent;
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            overflow: hidden;
            z-index: 1;
          }

          .mobile-doc-header {
            background: transparent;
            padding: 1.25rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
            font-weight: 700;
            font-size: 1.375rem;
            color: #ffffff;
          }

          .header-actions {
            display: flex;
            gap: 0.75rem;
            z-index: 101;
          }

          .search-section {
            padding: 1.5rem 2rem;
            background: transparent;
            border-bottom: none;
            flex-shrink: 0;
            position: relative;
            z-index: 5;
          }
          
          .search-controls {
            display: flex;
            align-items: center;
            gap: 1rem;
            max-width: 1400px;
            margin: 0 auto;
          }
          
          .view-controls {
            display: flex;
            gap: 0.75rem;
            align-items: center;
          }
          
          :global(.view-toggle .btn) {
            width: 40px;
            height: 40px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
          }
          
          :global(.view-toggle .btn-outline-light) {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.8);
          }
          
          :global(.view-toggle .btn-outline-light:hover) {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.3);
            color: #ffffff;
          }
          
          :global(.sort-dropdown) {
            background: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
            color: rgba(255, 255, 255, 0.9) !important;
            border-radius: 10px !important;
          }
          
          :global(.sort-dropdown:hover) {
            background: rgba(255, 255, 255, 0.2) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            color: #ffffff !important;
          }

          .search-input {
            border-radius: 50px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            padding: 1rem 2rem;
            font-size: 1rem;
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            color: #ffffff;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
          
          .search-input::placeholder {
            color: rgba(255, 255, 255, 0.7);
            font-weight: 400;
          }
          
          .search-input:focus {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(102, 126, 234, 0.5);
            box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
            outline: none;
            color: #ffffff;
            transform: translateY(-2px);
          }

          .breadcrumb-nav {
            padding: 0.75rem 1.5rem;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            align-items: center;
            background: transparent;
            border-bottom: none;
            flex-shrink: 0;
            position: relative;
            z-index: 5;
          }

          .breadcrumb-item {
            border: none;
            background: none;
            padding: 0.5rem 0.875rem;
            color: #667eea;
            cursor: pointer;
            font-size: 0.9375rem;
            font-weight: 500;
            border-radius: 6px;
            transition: all 0.2s ease;
          }
          
          .breadcrumb-item:hover:not(.active) {
            background: rgba(102, 126, 234, 0.1);
            color: #5568d3;
          }

          .breadcrumb-item.active {
            color: #ffffff;
            cursor: default;
            font-weight: 600;
          }

          .breadcrumb-separator {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.875rem;
          }

          .content-list {
            flex: 1;
            overflow-y: auto;
            padding: 2rem;
            background: transparent;
            min-height: 0;
            position: relative;
            z-index: 1;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1.25rem;
            align-content: start;
          }
          
          .content-list.list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .content-list.list .list-item {
            flex-direction: row;
            height: auto;
            padding: 0.875rem 1.25rem;
            align-items: center;
          }
          
          .content-list.list .item-main {
            flex-direction: row;
            align-items: center;
            text-align: left;
            padding: 0;
          }
          
          .content-list.list .item-details {
            text-align: left;
          }
          
          .content-list.list .item-meta {
            justify-content: flex-start;
          }

          .list-item {
            display: flex;
            flex-direction: column;
            padding: 0;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.2);
            position: relative;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            isolation: isolate;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            overflow: hidden;
            height: 220px;
          }

          .list-item:hover {
            background: rgba(255, 255, 255, 1);
            border-color: rgba(102, 126, 234, 0.5);
            box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
            transform: translateY(-6px) scale(1.02);
          }

          .list-item.drag-over {
            background: rgba(102, 126, 234, 0.1);
            border: 2px dashed #667eea;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }

          .item-main {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            padding: 1.5rem 1rem 1rem;
            cursor: pointer;
            text-align: center;
          }

          .item-icon {
            width: 100%;
            height: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 0.75rem;
            flex-shrink: 0;
          }

          .folder-icon {
            color: #FF9800;
            font-size: 5.5rem;
            filter: drop-shadow(0 2px 4px rgba(255, 152, 0, 0.3));
          }

          .file-icon {
            color: #2196F3;
            font-size: 5.5rem;
            filter: drop-shadow(0 2px 4px rgba(33, 150, 243, 0.3));
          }
          
          .pdf-icon {
            color: #e74c3c;
            filter: drop-shadow(0 2px 4px rgba(231, 76, 60, 0.3));
          }
          
          .word-icon {
            color: #2980b9;
            filter: drop-shadow(0 2px 4px rgba(41, 128, 185, 0.3));
          }
          
          .image-icon {
            color: #27ae60;
            filter: drop-shadow(0 2px 4px rgba(39, 174, 96, 0.3));
          }
          
          .content-list.list .item-icon {
            width: 48px;
            height: 48px;
            margin-bottom: 0;
            margin-right: 1rem;
          }
          
          .content-list.list .folder-icon,
          .content-list.list .file-icon {
            font-size: 2rem;
          }

          .item-details {
            width: 100%;
          }

          .item-name {
            font-weight: 500;
            margin-bottom: 0.5rem;
            font-size: 0.9375rem;
            color: #1a1a2e;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            line-height: 1.3;
          }

          .item-meta {
            font-size: 0.75rem;
            color: #999;
            font-weight: 400;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.375rem;
          }
          
          .meta-separator {
            color: #ccc;
            font-size: 0.75rem;
          }

          .item-actions {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            display: flex;
            align-items: center;
            opacity: 0;
            transition: opacity 0.2s ease;
          }
          
          .list-item:hover .item-actions {
            opacity: 1;
          }
          
          :global(.three-dot-menu) {
            color: #666 !important;
            text-decoration: none !important;
            padding: 0.5rem !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 50% !important;
            transition: all 0.2s ease !important;
            width: 36px !important;
            height: 36px !important;
            background: transparent !important;
            border: none !important;
          }
          
          :global(.three-dot-menu:hover) {
            background: rgba(102, 126, 234, 0.1) !important;
            color: #667eea !important;
          }
          
          :global(.three-dot-menu::after) {
            display: none !important;
          }
          
          :global(.dropdown-menu) {
            border-radius: 12px !important;
            border: 1px solid #ecf0f1 !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
            padding: 0.5rem 0 !important;
          }
          
          :global(.dropdown-item) {
            padding: 0.75rem 1.25rem !important;
            font-size: 0.9375rem !important;
            transition: all 0.2s ease !important;
          }
          
          :global(.dropdown-item:hover) {
            background: rgba(102, 126, 234, 0.1) !important;
            color: #667eea !important;
          }
          
          :global(.dropdown-divider) {
            margin: 0.5rem 0 !important;
            border-color: #ecf0f1 !important;
          }
          
          .info-content {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: start;
            padding: 0.75rem 0;
            border-bottom: 1px solid #ecf0f1;
          }
          
          .info-row:last-child {
            border-bottom: none;
          }
          
          .info-row strong {
            color: #1a1a2e;
            font-weight: 600;
            min-width: 100px;
          }
          
          .info-row span {
            color: #666;
            text-align: right;
            word-break: break-word;
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
            height: 400px;
            color: rgba(255, 255, 255, 0.7);
          }

          .empty-icon {
            margin-bottom: 2rem;
            color: rgba(255, 255, 255, 0.3);
            font-size: 5rem;
            opacity: 0.5;
          }

          .empty-state p {
            font-size: 1.25rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
          }

          /* Mobile styles */
          @media (max-width: 1023px) {
            .documents-page {
              padding-top: 60px;
              padding-bottom: 60px;
            }

            .search-section {
              margin-top: 60px;
              padding: 1.25rem;
            }

            .content-list {
              padding: 1rem;
              grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
              gap: 1rem;
            }
            
            .list-item {
              height: 180px;
            }
            
            .item-icon {
              width: 48px;
              height: 48px;
              margin-bottom: 0.75rem;
            }
            
            .folder-icon, .file-icon {
              font-size: 2.5rem;
            }
            
            .item-name {
              font-size: 0.875rem;
            }
            
            .item-meta {
              font-size: 0.6875rem;
            }

          :global(.upload-btn),
          :global(.btn-outline-primary) {
            padding: 0.5rem !important;
            height: 44px !important;
            width: 44px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 1.25rem !important;
            border-radius: 12px !important;
            border: 2px solid #ecf0f1 !important;
            transition: all 0.3s ease !important;
          }
          
          :global(.upload-btn:hover) {
            transform: scale(1.05) !important;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3) !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border-color: #667eea !important;
          }
          
          :global(.btn-outline-primary:hover) {
            transform: scale(1.05) !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border-color: #667eea !important;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3) !important;
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
              padding: 1rem 2rem;
            }

            .content-list {
              position: relative;
              padding: 2rem;
              flex: 1;
              overflow-y: auto;
              grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
              gap: 1.5rem;
            }
          }
          
          /* Large Desktop */
          @media (min-width: 1440px) {
            .content-list {
              grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
              gap: 2rem;
              padding: 2.5rem;
            }
            
            .list-item {
              height: 220px;
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