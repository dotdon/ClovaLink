'use client';

import React, { useState, useEffect } from 'react';
import { Button, Form, Modal, Alert, Dropdown, ButtonGroup } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaDownload, FaTrash, FaFolder, FaEye, FaUpload, FaFolderPlus, FaFile, FaEdit, FaArrowLeft, FaEllipsisV, FaSearch, FaCheckCircle, FaShare, FaFilePdf, FaFileWord, FaFileImage, FaInfo, FaTh, FaList, FaSortAlphaDown, FaSortAmountDown, FaCalendarAlt, FaStar, FaRegStar, FaThumbtack, FaBuilding } from 'react-icons/fa';
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
  isFavorite?: boolean;
  companyId?: string;
}

interface Folder {
  id: string;
  name: string;
  documents: Document[];
  parentId: string | null;
  children: Folder[];
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  pinnedOrder?: number;
  companyId?: string;
  color?: string;
}

interface Company {
  id: string;
  name: string;
}

interface FavoriteItem {
  id: string;
  document?: any;
  folder?: any;
}

interface PinnedFolderItem {
  id: string;
  order: number;
  folder: any;
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

function RenameModal({ show, onHide, item, onRename }: RenameModalProps) {
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    if (item) {
      setNewName(item.name);
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRenaming(true);
    try {
      await onRename(newName);
      onHide();
    } catch (error) {
      console.error('Error renaming:', error);
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Rename {item && 'children' in item ? 'Folder' : 'Document'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group>
            <Form.Label>New Name</Form.Label>
            <Form.Control
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={isRenaming}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isRenaming}>
            {isRenaming ? 'Renaming...' : 'Rename'}
          </Button>
        </Modal.Footer>
      </Form>
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

  // New states for Google Drive-like features
  const [favoriteDocuments, setFavoriteDocuments] = useState<FavoriteItem[]>([]);
  const [favoriteFolders, setFavoriteFolders] = useState<FavoriteItem[]>([]);
  const [pinnedFolders, setPinnedFolders] = useState<PinnedFolderItem[]>([]);
  const [accessibleCompanies, setAccessibleCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [showQuickAccess, setShowQuickAccess] = useState(true);

  // Permission checks
  const canDeleteDocuments = hasPermission(session, Permission.DELETE_DOCUMENTS);
  const canRenameDocuments = hasPermission(session, Permission.RENAME_DOCUMENTS);

  useEffect(() => {
    if (session?.user?.id) {
      fetchAccessibleCompanies();
    }
  }, [session]);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchDocuments();
      fetchFavorites();
      fetchPinnedFolders();
    } else if (session?.user?.companyId) {
      // Fallback: if no selectedCompanyId is set, use the user's primary company
      setSelectedCompanyId(session.user.companyId);
    }
  }, [selectedCompanyId, session]);

  const fetchAccessibleCompanies = async () => {
    try {
      const response = await fetch('/api/employees/me/accessible-companies');
      if (!response.ok) throw new Error('Failed to fetch companies');
      const companies = await response.json();
      setAccessibleCompanies(companies || []);
      
      // Set initial company
      if (companies && companies.length > 0) {
        setSelectedCompanyId(session?.user?.companyId || companies[0].id);
      }
    } catch (error) {
      console.error('Error fetching accessible companies:', error);
      // Set default company if fetch fails
      if (session?.user?.companyId) {
        setSelectedCompanyId(session.user.companyId);
      }
    }
  };

  const fetchDocuments = async () => {
    if (!selectedCompanyId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const companyFilter = `?companyId=${selectedCompanyId}`;
      const response = await fetch(`/api/documents${companyFilter}`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setFolders(data.folders || []);
      setUnorganizedDocuments(data.unorganizedDocuments || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch documents');
      setFolders([]);
      setUnorganizedDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/documents/favorites');
      if (!response.ok) {
        console.warn('Failed to fetch favorites:', response.status);
        return;
      }
      const data = await response.json();
      setFavoriteDocuments(data.documents || []);
      setFavoriteFolders(data.folders || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setFavoriteDocuments([]);
      setFavoriteFolders([]);
    }
  };

  const fetchPinnedFolders = async () => {
    try {
      const response = await fetch('/api/documents/folders/pinned');
      if (!response.ok) {
        console.warn('Failed to fetch pinned folders:', response.status);
        return;
      }
      const data = await response.json();
      setPinnedFolders(data.folders || []);
    } catch (error) {
      console.error('Error fetching pinned folders:', error);
      setPinnedFolders([]);
    }
  };

  const handleToggleFavorite = async (item: Document | Folder, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    const isFolder = 'children' in item;
    const isFavorite = item.isFavorite;

    try {
      const endpoint = isFolder 
        ? `/api/documents/folders/${item.id}/favorite`
        : `/api/documents/${item.id}/favorite`;

      const response = await fetch(endpoint, {
        method: isFavorite ? 'DELETE' : 'POST'
      });

      if (!response.ok) throw new Error('Failed to toggle favorite');

      // Refresh data
      await fetchDocuments();
      await fetchFavorites();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Failed to update favorite');
    }
  };

  const handleTogglePin = async (folder: Folder, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    const isPinned = folder.isPinned;

    try {
      const response = await fetch(`/api/documents/folders/${folder.id}/pin`, {
        method: isPinned ? 'DELETE' : 'POST'
      });

      if (!response.ok) throw new Error('Failed to toggle pin');

      // Refresh data
      await fetchDocuments();
      await fetchPinnedFolders();
    } catch (error) {
      console.error('Error toggling pin:', error);
      alert('Failed to update pin');
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
      if (isDeleting === itemToDelete.id) return;
      setIsDeleting(itemToDelete.id);

      const isFolder = 'children' in itemToDelete;
      const canDelete = isFolder 
        ? canManageFolder(session, itemToDelete)
        : canManageDocument(session, itemToDelete);

      if (!canDelete) {
        throw new Error('You do not have permission to delete this item');
      }

      const itemType = isFolder ? 'folder' : 'document';
      const endpoint = isFolder ? `/api/documents/folders/${itemToDelete.id}` : `/api/documents/${itemToDelete.id}`;
      
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

      if (isFolder && currentFolderId === itemToDelete.id) {
        handleNavigateBack();
      }

      await fetchDocuments();
      
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
      if (!selectedCompanyId) {
        throw new Error('Please select a company');
      }

      const response = await fetch('/api/documents/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentFolderId,
          companyId: selectedCompanyId
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

      if (selectedCompanyId) {
        formData.append('companyId', selectedCompanyId);
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
    if (!folderList || !Array.isArray(folderList)) return null;
    
    for (const folder of folderList) {
      if (!folder) continue;
      
      if (folder.id === folderId) {
        return folder;
      }
      if (folder.children && folder.children.length > 0) {
        const found = findFolder(folderId, folder.children);
        if (found) return found;
      }
    }
    return null;
  };

  const getCurrentFolderContents = () => {
    if (!currentFolderId) {
      // Show only root-level folders (parentId is null)
      const rootFolders = (folders || []).filter((folder: Folder) => 
        folder && !folder.parentId && canAccessFolder(session, folder)
      );
      return {
        folders: rootFolders,
        documents: unorganizedDocuments || []
      };
    }

    const currentFolder = findFolder(currentFolderId, folders);
    if (!currentFolder) {
      console.error('Current folder not found:', currentFolderId);
      return { folders: [], documents: [] };
    }

    return {
      folders: (currentFolder.children || []).filter((folder: Folder) => 
        folder && canAccessFolder(session, folder)
      ),
      documents: currentFolder.documents || []
    };
  };

  const handleNavigateToFolder = (folder: Folder) => {
    setCurrentFolderId(folder.id);
    setCurrentPath([...currentPath, { id: folder.id, name: folder.name }]);
    setSearchQuery('');
  };

  const handleNavigateBack = () => {
    if (currentPath.length === 0) return;
    
    const newPath = currentPath.slice(0, -1);
    setCurrentPath(newPath);
    setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
  };

  const handleNavigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentPath([]);
      setCurrentFolderId(null);
    } else {
      const newPath = currentPath.slice(0, index + 1);
      setCurrentPath(newPath);
      setCurrentFolderId(newPath[index].id);
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

  const handleDragStart = (e: React.DragEvent, type: 'document' | 'folder', id: string) => {
    setDraggedItem({ type, id });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    if (!draggedItem) return;

    try {
      const endpoint = draggedItem.type === 'document' 
        ? `/api/documents/${draggedItem.id}/move`
        : `/api/documents/folders/${draggedItem.id}/move`;

      const bodyParam = draggedItem.type === 'document' 
        ? { targetFolderId: targetFolderId }  // Documents use targetFolderId
        : { parentId: targetFolderId };        // Folders use parentId

      const method = draggedItem.type === 'document' ? 'POST' : 'PATCH';
      
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyParam)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to move item');
      }

      const result = await response.json();
      
      setSuccessMessage(result.message || `${draggedItem.type === 'document' ? 'Document' : 'Folder'} moved successfully`);
      setShowSuccessModal(true);
      
      // Refresh the documents list to show the updated structure
      await fetchDocuments();
      
      // If we moved a folder that we're currently inside, navigate back
      if (draggedItem.type === 'folder' && currentFolderId === draggedItem.id) {
        handleNavigateBack();
      }
    } catch (error) {
      console.error('Error moving item:', error);
      alert(error instanceof Error ? error.message : 'Failed to move item');
    } finally {
      setDraggedItem(null);
    }
  };

  const handleRename = (item: Document | Folder) => {
    setSelectedItem(item);
    setShowRenameModal(true);
  };

  const handleRenameSubmit = async (newName: string) => {
    if (!selectedItem) return;

    const isFolder = 'children' in selectedItem;
    const endpoint = isFolder 
      ? `/api/documents/folders/${selectedItem.id}`
      : `/api/documents/${selectedItem.id}`;

    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename');
      }

      setSuccessMessage(`${isFolder ? 'Folder' : 'Document'} renamed successfully`);
      setShowSuccessModal(true);
      await fetchDocuments();
    } catch (error) {
      console.error('Error renaming:', error);
      throw error;
    }
  };

  const sortItems = (items: (Document | Folder)[]) => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'size':
          if ('size' in a && 'size' in b) {
            return b.size - a.size;
          }
          return 0;
        default:
          return 0;
      }
    });
  };

  const { folders: currentFolders, documents: currentDocuments } = getCurrentFolderContents();
  
  const filteredItems = sortItems([
    ...currentFolders,
    ...currentDocuments
  ].filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  ));

  const renderStarButton = (item: Document | Folder) => {
    const isFavorite = item.isFavorite;
    return (
      <button
        className="star-button"
        onClick={(e) => handleToggleFavorite(item, e)}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFavorite ? <FaStar className="text-warning" /> : <FaRegStar />}
      </button>
    );
  };

  const renderPinButton = (folder: Folder) => {
    const isPinned = folder.isPinned;
    return (
      <button
        className="pin-button"
        onClick={(e) => handleTogglePin(folder, e)}
        title={isPinned ? 'Unpin folder' : 'Pin folder'}
      >
        <FaThumbtack className={isPinned ? 'text-primary pinned' : ''} />
      </button>
    );
  };

  return (
    <DashboardLayout>
      <div className="documents-page">
        {/* Mobile Header */}
        <div className="mobile-doc-header d-md-none">
          <div className="header-left">
            {currentPath.length > 0 && (
              <button className="back-button" onClick={handleNavigateBack}>
                <FaArrowLeft />
              </button>
            )}
            <div className="current-location">
              {currentPath.length === 0 ? 'My Drive' : currentPath[currentPath.length - 1].name}
            </div>
          </div>
          <div className="header-actions">
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => setShowUploadModal(true)}
            >
              <FaUpload />
            </Button>
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => setShowCreateFolderModal(true)}
            >
              <FaFolderPlus />
            </Button>
          </div>
        </div>

        {/* Company Switcher */}
        {accessibleCompanies.length > 1 && (
          <div className="company-switcher">
            <FaBuilding className="me-2" />
            <Dropdown>
              <Dropdown.Toggle variant="light" id="company-dropdown">
                {accessibleCompanies.find(c => c.id === selectedCompanyId)?.name || 'Select Company'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {accessibleCompanies.map(company => (
                  <Dropdown.Item
                    key={company.id}
                    active={company.id === selectedCompanyId}
                    onClick={() => setSelectedCompanyId(company.id)}
                  >
                    {company.name}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        )}

        {/* Quick Access Section */}
        {showQuickAccess && (pinnedFolders.length > 0 || favoriteFolders.length > 0 || favoriteDocuments.length > 0) && (
          <div className="quick-access-section">
            <div className="section-header">
              <h3>Quick Access</h3>
              <button className="collapse-button" onClick={() => setShowQuickAccess(false)}>
                Hide
              </button>
            </div>

            {/* Pinned Folders */}
            {pinnedFolders.length > 0 && (
              <div className="pinned-folders mb-4">
                <h4><FaThumbtack className="me-2" />Pinned</h4>
                <div className="quick-access-grid">
                  {pinnedFolders.map(item => (
                    <div
                      key={item.id}
                      className="quick-access-item"
                      onClick={() => handleNavigateToFolder(item.folder)}
                    >
                      <div className="item-icon">
                        <FaFolder className="folder-icon" style={{ color: '#ffffff' }} />
                      </div>
                      <div className="item-name">{item.folder.name}</div>
                      <div className="item-company">{item.folder.company?.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Favorite Items */}
            {(favoriteFolders.length > 0 || favoriteDocuments.length > 0) && (
              <div className="favorite-items">
                <h4><FaStar className="me-2 text-warning" />Starred</h4>
                <div className="quick-access-grid">
                  {favoriteFolders.map(item => (
                    <div
                      key={item.id}
                      className="quick-access-item"
                      onClick={() => handleNavigateToFolder(item.folder)}
                    >
                      <div className="item-icon">
                        <FaFolder className="folder-icon" style={{ color: '#ffffff' }} />
                        <FaStar className="star-badge" />
                      </div>
                      <div className="item-name">{item.folder.name}</div>
                      <div className="item-company">{item.folder.company?.name}</div>
                    </div>
                  ))}
                  {favoriteDocuments.map(item => (
                    <div
                      key={item.id}
                      className="quick-access-item"
                      onClick={() => {
                        setSelectedDocument(item.document);
                        setShowPreview(true);
                      }}
                    >
                      <div className="item-icon">
                        {item.document?.mimeType === 'application/pdf' && <FaFilePdf className="pdf-icon" style={{ color: '#ffffff' }} />}
                        {item.document?.mimeType?.startsWith('image/') && <FaFileImage className="image-icon" style={{ color: '#ffffff' }} />}
                        {(item.document?.mimeType?.includes('word') || item.document?.name?.endsWith('.docx')) && <FaFileWord className="word-icon" style={{ color: '#ffffff' }} />}
                        {!(item.document?.mimeType?.includes('pdf') || item.document?.mimeType?.startsWith('image/') || item.document?.mimeType?.includes('word')) && item.document?.mimeType && <FaFile className="file-icon" style={{ color: '#ffffff' }} />}
                        <FaStar className="star-badge" />
                      </div>
                      <div className="item-name">{item.document.name}</div>
                      <div className="item-company">{item.document.company?.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!showQuickAccess && (pinnedFolders.length > 0 || favoriteFolders.length > 0 || favoriteDocuments.length > 0) && (
          <div className="quick-access-collapsed">
            <button onClick={() => setShowQuickAccess(true)}>
              Show Quick Access
            </button>
          </div>
        )}

        {/* Search and Controls */}
        <div className="search-section">
          <div className="search-controls">
            <Form.Control
              type="text"
              placeholder="Search in Drive"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <div className="view-controls">
              <ButtonGroup className="view-toggle">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'outline-light'}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                >
                  <FaTh />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'outline-light'}
                  onClick={() => setViewMode('list')}
                  title="List view"
                >
                  <FaList />
                </Button>
              </ButtonGroup>
              <Dropdown>
                <Dropdown.Toggle variant="outline-light" className="sort-dropdown">
                  {sortBy === 'name' && <><FaSortAlphaDown className="me-2" />Name</>}
                  {sortBy === 'date' && <><FaCalendarAlt className="me-2" />Date</>}
                  {sortBy === 'size' && <><FaSortAmountDown className="me-2" />Size</>}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => setSortBy('name')}>
                    <FaSortAlphaDown className="me-2" />Name
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setSortBy('date')}>
                    <FaCalendarAlt className="me-2" />Date modified
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setSortBy('size')}>
                    <FaSortAmountDown className="me-2" />File size
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
            onClick={() => handleNavigateToBreadcrumb(-1)}
          >
            My Drive
          </button>
          {currentPath.map((pathItem, index) => (
            <React.Fragment key={pathItem.id}>
              <span className="breadcrumb-separator">/</span>
              <button
                className={`breadcrumb-item ${index === currentPath.length - 1 ? 'active' : ''}`}
                onClick={() => handleNavigateToBreadcrumb(index)}
              >
                {pathItem.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Action Bar */}
        <div className="action-bar d-none d-md-flex">
          <div className="action-buttons">
            <Button
              variant="primary"
              onClick={() => setShowUploadModal(true)}
            >
              <FaUpload className="me-2" />
              Upload Files
            </Button>
            <Button
              variant="outline-primary"
              onClick={() => setShowCreateFolderModal(true)}
            >
              <FaFolderPlus className="me-2" />
              New Folder
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="documents-content">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
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
                  <Button variant="primary" onClick={() => setShowUploadModal(true)}>
                    Upload Files
                  </Button>
                </>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="items-grid">
              {filteredItems.map((item) => {
                const isFolder = 'children' in item;
                return (
                  <div 
                    key={item.id} 
                    className="grid-item"
                    draggable
                    onDragStart={(e) => handleDragStart(e, isFolder ? 'folder' : 'document', item.id)}
                    onDragOver={isFolder ? handleDragOver : undefined}
                    onDragLeave={isFolder ? handleDragLeave : undefined}
                    onDrop={isFolder ? (e) => handleDrop(e, item.id) : undefined}
                  >
                    <div 
                      className="item-preview"
                      onClick={() => {
                        if (isFolder) {
                          handleNavigateToFolder(item as Folder);
                        } else {
                          setSelectedDocument(item as Document);
                          setShowPreview(true);
                        }
                      }}
                    >
                      <div className="item-icon-wrapper">
                        {isFolder ? (
                          <>
                            <FaFolder className="folder-icon" size={64} style={{ color: '#ffffff' }} />
                            {(item as Folder).isPinned && (
                              <FaThumbtack className="pinned-badge" />
                            )}
                          </>
                        ) : (
                          <>
                            {(item as Document).mimeType === 'application/pdf' && <FaFilePdf className="file-icon pdf-icon" size={64} style={{ color: '#ffffff' }} />}
                            {(item as Document).mimeType?.startsWith('image/') && <FaFileImage className="file-icon image-icon" size={64} style={{ color: '#ffffff' }} />}
                            {((item as Document).mimeType?.includes('word') || (item as Document).name?.endsWith('.docx')) && <FaFileWord className="file-icon word-icon" size={64} style={{ color: '#ffffff' }} />}
                            {!((item as Document).mimeType?.includes('pdf') || (item as Document).mimeType?.startsWith('image/') || (item as Document).mimeType?.includes('word')) && (item as Document).mimeType && <FaFile className="file-icon" size={64} style={{ color: '#ffffff' }} />}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="item-info">
                      <div className="item-name-row">
                        <div className="item-name" title={item.name}>{item.name}</div>
                        <div className="item-actions-inline">
                          {renderStarButton(item)}
                          {isFolder && renderPinButton(item as Folder)}
                        </div>
                      </div>
                      {!isFolder && (
                        <div className="item-meta">
                          {formatFileSize((item as Document).size)}
                        </div>
                      )}
                    </div>
                    <div className="item-dropdown">
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
              })}
            </div>
          ) : (
            // List view
            <div className="items-list">
              {filteredItems.map((item) => {
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
                          <FaFolder className="folder-icon" style={{ color: '#ffffff' }} />
                        ) : (
                          <>
                            {(item as Document).mimeType === 'application/pdf' && <FaFilePdf className="file-icon pdf-icon" style={{ color: '#ffffff' }} />}
                            {(item as Document).mimeType?.startsWith('image/') && <FaFileImage className="file-icon image-icon" style={{ color: '#ffffff' }} />}
                            {((item as Document).mimeType?.includes('word') || (item as Document).name?.endsWith('.docx')) && <FaFileWord className="file-icon word-icon" style={{ color: '#ffffff' }} />}
                            {!((item as Document).mimeType?.includes('pdf') || (item as Document).mimeType?.startsWith('image/') || (item as Document).mimeType?.includes('word')) && (item as Document).mimeType && <FaFile className="file-icon" style={{ color: '#ffffff' }} />}
                          </>
                        )}
                      </div>
                      <div className="item-details">
                        <div className="item-name-container">
                          <div className="item-name">{item.name}</div>
                          {isFolder && (item as Folder).isPinned && (
                            <FaThumbtack className="text-primary ms-2" />
                          )}
                        </div>
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
                      {renderStarButton(item)}
                      {isFolder && renderPinButton(item as Folder)}
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
              })}
            </div>
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

        {/* Delete Confirmation Modal */}
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
            min-height: 100vh;
            background: transparent;
            width: 100%;
            overflow: hidden;
          }

          .mobile-doc-header {
            background: transparent;
            padding: 1.25rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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

          .company-switcher {
            padding: 1rem 2rem;
            background: rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .quick-access-section {
            padding: 2rem;
            background: transparent;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .quick-access-section .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }

          .quick-access-section h3 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #ffffff;
            margin: 0;
          }

          .quick-access-section h4 {
            font-size: 1.1rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
          }

          .collapse-button {
            background: none;
            border: none;
            color: #667eea;
            cursor: pointer;
            font-weight: 500;
          }

          .quick-access-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 1rem;
          }

          .quick-access-item {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.5rem 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
          }

          .quick-access-item:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(102, 126, 234, 0.5);
            transform: translateY(-2px);
          }

          .quick-access-item .item-icon {
            font-size: 2.5rem;
            margin-bottom: 0.75rem;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .quick-access-item .folder-icon {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          .quick-access-item .pdf-icon {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          .quick-access-item .word-icon {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          .quick-access-item .image-icon {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          .quick-access-item .file-icon {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          .quick-access-item .item-icon svg,
          .quick-access-item .item-icon svg * {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          .quick-access-item .star-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            font-size: 1rem;
            color: #ffc107;
          }

          .quick-access-item .item-name {
            font-weight: 500;
            color: #ffffff;
            font-size: 0.9rem;
            margin-bottom: 0.25rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .quick-access-item .item-company {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.6);
          }

          .quick-access-collapsed {
            padding: 1rem 2rem;
            background: rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            text-align: center;
          }

          .quick-access-collapsed button {
            background: none;
            border: 1px solid rgba(102, 126, 234, 0.5);
            color: #667eea;
            padding: 0.5rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
          }

          .quick-access-collapsed button:hover {
            background: rgba(102, 126, 234, 0.1);
            border-color: #667eea;
          }

          .search-section {
            padding: 1.25rem 2rem 0.75rem;
            background: rgba(255, 255, 255, 0.02);
            border-bottom: none;
            flex-shrink: 0;
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
            flex-shrink: 0;
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
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 0.875rem 1.25rem;
            font-size: 0.95rem;
            width: 100%;
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            color: #ffffff;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          
          .search-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
            font-weight: 400;
          }
          
          .search-input:focus {
            background: rgba(255, 255, 255, 0.12);
            border-color: rgba(102, 126, 234, 0.6);
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
            outline: none;
            color: #ffffff;
          }

          .breadcrumb-nav {
            padding: 0.75rem 2rem 1rem;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            align-items: center;
            background: rgba(255, 255, 255, 0.02);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            flex-shrink: 0;
            max-width: 1400px;
            margin: 0 auto;
            width: 100%;
          }

          .breadcrumb-item {
            border: none;
            background: rgba(255, 255, 255, 0.05);
            padding: 0.5rem 1rem;
            color: rgba(255, 255, 255, 0.8);
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            border-radius: 8px;
            transition: all 0.2s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .breadcrumb-item:hover:not(.active) {
            background: rgba(102, 126, 234, 0.2);
            color: #ffffff;
            border-color: rgba(102, 126, 234, 0.3);
            transform: translateY(-1px);
          }
          
          .breadcrumb-item.active {
            color: #ffffff;
            font-weight: 600;
            background: rgba(102, 126, 234, 0.3);
            border-color: rgba(102, 126, 234, 0.4);
          }
          
          .breadcrumb-separator {
            color: rgba(255, 255, 255, 0.4);
            font-weight: 400;
            padding: 0 0.25rem;
          }

          .action-bar {
            padding: 1rem 2rem;
            background: transparent;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
          }

          .action-buttons {
            display: flex;
            gap: 1rem;
          }

          .documents-content {
            flex: 1;
            overflow-y: auto;
            padding: 2rem;
            max-width: 100%;
          }

          .loading-state, .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem 2rem;
            color: rgba(255, 255, 255, 0.6);
            text-align: center;
          }

          .empty-icon {
            color: #ffffff;
            margin-bottom: 1rem;
          }

          .items-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1.5rem;
            max-width: 1400px;
            margin: 0 auto;
          }

          .grid-item {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
          }

          .grid-item:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(102, 126, 234, 0.4);
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          }

          .grid-item.drag-over {
            border-color: #667eea;
            background: rgba(102, 126, 234, 0.1);
          }

          .item-preview {
            padding: 2rem 1rem 1rem;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 140px;
            background: rgba(255, 255, 255, 0.02);
          }

          .item-icon-wrapper {
            position: relative;
          }

          .folder-icon,
          .folder-icon *,
          svg.folder-icon,
          svg.folder-icon * {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          .pdf-icon,
          .pdf-icon *,
          svg.pdf-icon,
          svg.pdf-icon * {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          .word-icon,
          .word-icon *,
          svg.word-icon,
          svg.word-icon * {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          .image-icon,
          .image-icon *,
          svg.image-icon,
          svg.image-icon * {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          .file-icon,
          .file-icon *,
          svg.file-icon,
          svg.file-icon * {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          .item-icon-wrapper .folder-icon,
          .item-icon-wrapper .pdf-icon,
          .item-icon-wrapper .word-icon,
          .item-icon-wrapper .image-icon,
          .item-icon-wrapper .file-icon {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          .item-icon-wrapper svg {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          .pinned-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 1rem;
            color: #667eea;
            background: white;
            border-radius: 50%;
            padding: 0.2rem;
          }

          .item-info {
            padding: 1rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }

          .item-name-row {
            display: flex;
            justify-content: space-between;
            align-items: start;
            gap: 0.5rem;
          }

          .item-name {
            font-weight: 500;
            color: #ffffff;
            font-size: 0.9rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex: 1;
          }

          .item-actions-inline {
            display: flex;
            gap: 0.25rem;
            flex-shrink: 0;
          }

          .star-button, .pin-button {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            padding: 0.25rem;
            font-size: 0.9rem;
            transition: all 0.2s ease;
          }

          .star-button:hover, .pin-button:hover {
            color: #ffffff;
            transform: scale(1.1);
          }

          .pin-button .pinned {
            color: #667eea !important;
          }

          .item-meta {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.6);
            margin-top: 0.25rem;
          }

          .item-dropdown {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            z-index: 10;
          }

          .three-dot-menu {
            padding: 0.25rem 0.5rem;
            color: rgba(255, 255, 255, 0.7);
            text-decoration: none;
          }

          .three-dot-menu:hover {
            color: #ffffff;
          }

          .items-list {
            max-width: 1200px;
            margin: 0 auto;
          }

          .list-item {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 1rem 1.5rem;
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .list-item:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(102, 126, 234, 0.4);
            transform: translateX(4px);
          }

          .list-item.drag-over {
            border-color: #667eea;
            background: rgba(102, 126, 234, 0.1);
          }

          .item-main {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex: 1;
            min-width: 0;
          }

          .item-icon {
            flex-shrink: 0;
            font-size: 1.5rem;
            color: #ffffff !important;
          }

          .item-icon svg,
          .item-icon svg *,
          .item-icon .folder-icon,
          .item-icon .pdf-icon,
          .item-icon .word-icon,
          .item-icon .image-icon,
          .item-icon .file-icon {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          .item-details {
            flex: 1;
            min-width: 0;
          }

          .item-name-container {
            display: flex;
            align-items: center;
          }

          .meta-separator {
            margin: 0 0.5rem;
            color: rgba(255, 255, 255, 0.3);
          }

          .item-actions {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-shrink: 0;
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
            gap: 1rem;
          }

          .info-row strong {
            min-width: 100px;
            color: rgba(255, 255, 255, 0.8);
          }

          .info-row span {
            color: rgba(255, 255, 255, 0.9);
            text-align: right;
            word-break: break-word;
          }

          @media (max-width: 768px) {
            .documents-page {
              padding-top: 0;
            }

            .documents-content {
              padding: 1rem;
            }

            .items-grid {
              grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
              gap: 1rem;
            }

            .company-switcher, .action-bar {
              display: none;
            }

            .quick-access-grid {
              grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            }

            .search-section, .breadcrumb-nav {
              padding: 1rem;
            }
          }

          @media (min-width: 769px) {
            .mobile-doc-header {
              display: none;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
