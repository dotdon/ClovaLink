'use client';

import React, { useState, useEffect } from 'react';
import { Button, Form, Modal, Alert, Dropdown, ButtonGroup } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaDownload, FaTrash, FaFolder, FaEye, FaUpload, FaFolderPlus, FaFile, FaEdit, FaArrowLeft, FaEllipsisV, FaSearch, FaCheckCircle, FaShare, FaFilePdf, FaFileWord, FaFileImage, FaInfo, FaTh, FaList, FaSortAlphaDown, FaSortAmountDown, FaCalendarAlt, FaStar, FaRegStar, FaThumbtack, FaBuilding, FaLock, FaClipboardList, FaArrowsAlt, FaInfoCircle, FaStickyNote } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { hasPermission, Permission, canAccessFolder, canManageFolder, canManageDocument } from '@/lib/permissions';
import DocumentViewerModal from '@/components/viewers/DocumentViewerModal';
import ActiveUsers from '@/components/ActiveUsers';
import MemoModal from '@/components/modals/MemoModal';

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

  // Force list view on mobile
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        setViewMode('list');
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // New states for Google Drive-like features
  const [favoriteDocuments, setFavoriteDocuments] = useState<FavoriteItem[]>([]);
  const [favoriteFolders, setFavoriteFolders] = useState<FavoriteItem[]>([]);
  const [pinnedFolders, setPinnedFolders] = useState<PinnedFolderItem[]>([]);
  const [accessibleCompanies, setAccessibleCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [showQuickAccess, setShowQuickAccess] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'starred'>('browse');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedFolderForPassword, setSelectedFolderForPassword] = useState<Folder | null>(null);
  const [folderPassword, setFolderPassword] = useState('');
  const [showPasswordVerifyModal, setShowPasswordVerifyModal] = useState(false);
  const [folderToVerify, setFolderToVerify] = useState<Folder | null>(null);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [unlockedFolders, setUnlockedFolders] = useState<Set<string>>(new Set());
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [selectedMemoItem, setSelectedMemoItem] = useState<{ item: Document | Folder; type: 'document' | 'folder' } | null>(null);
  
  // Document password states
  const [showDocPasswordModal, setShowDocPasswordModal] = useState(false);
  const [selectedDocForPassword, setSelectedDocForPassword] = useState<Document | null>(null);
  const [docPassword, setDocPassword] = useState('');
  
  // Move modal states
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [itemToMove, setItemToMove] = useState<Document | Folder | null>(null);
  const [moveTargetCompanyId, setMoveTargetCompanyId] = useState<string | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);
  const [availableFolders, setAvailableFolders] = useState<Folder[]>([]);
  const [showDocPasswordVerifyModal, setShowDocPasswordVerifyModal] = useState(false);
  const [docToVerify, setDocToVerify] = useState<Document | null>(null);
  const [verifyDocPassword, setVerifyDocPassword] = useState('');
  const [unlockedDocuments, setUnlockedDocuments] = useState<Set<string>>(new Set());
  
  // Activity log modal (per-item)
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [activityItemId, setActivityItemId] = useState<string | null>(null);
  const [activityItemName, setActivityItemName] = useState<string>('');
  const [activityItemType, setActivityItemType] = useState<'document' | 'folder'>('document');

  // Permission checks
  const canDeleteDocuments = hasPermission(session, Permission.DELETE_DOCUMENTS);
  const canRenameDocuments = hasPermission(session, Permission.RENAME_DOCUMENTS);
  const isAdmin = session?.user?.role === 'ADMIN';
  const isManager = session?.user?.role === 'MANAGER' || isAdmin;

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
    if (!selectedCompanyId) return;
    
    try {
      const companyFilter = `?companyId=${selectedCompanyId}`;
      const response = await fetch(`/api/documents/favorites${companyFilter}`);
      if (!response.ok) {
        console.warn('Failed to fetch favorites:', response.status);
        return;
      }
      const data = await response.json();
      console.log('Fetched favorites:', {
        folders: data.folders?.map((f: any) => ({
          id: f.id,
          name: f.folder?.name,
          hasPassword: f.folder?.hasPassword,
          password: f.folder?.password
        }))
      });
      setFavoriteDocuments(data.documents || []);
      setFavoriteFolders(data.folders || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setFavoriteDocuments([]);
      setFavoriteFolders([]);
    }
  };

  const fetchPinnedFolders = async () => {
    if (!selectedCompanyId) return;
    
    try {
      const companyFilter = `?companyId=${selectedCompanyId}`;
      const response = await fetch(`/api/documents/folders/pinned${companyFilter}`);
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

  const handleSetPassword = async () => {
    if (!selectedFolderForPassword || !folderPassword.trim()) {
      alert('Please enter a password');
      return;
    }

    console.log('Setting password for folder:', {
      folderId: selectedFolderForPassword.id,
      folderName: selectedFolderForPassword.name,
      passwordLength: folderPassword.length,
      password: folderPassword // TEMPORARY - remove after debugging
    });

    try {
      const response = await fetch(`/api/documents/folders/${selectedFolderForPassword.id}/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: folderPassword,
        }),
      });

      const data = await response.json();
      console.log('Set password response:', {
        ok: response.ok,
        status: response.status,
        data
      });

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to set password');
      }

      setShowPasswordModal(false);
      setSelectedFolderForPassword(null);
      setFolderPassword('');
      setSuccessMessage('Password protection added successfully');
      setShowSuccessModal(true);
      await fetchDocuments();
      await fetchFavorites();
      await fetchPinnedFolders();
    } catch (error) {
      console.error('Error setting password:', error);
      alert(error instanceof Error ? error.message : 'Failed to set password');
    }
  };

  const handleRemovePassword = async (folder: Folder) => {
    try {
      const response = await fetch(`/api/documents/folders/${folder.id}/password`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove password');
      }

      setSuccessMessage('Password protection removed successfully');
      setShowSuccessModal(true);
      
      // Remove from unlocked folders
      setUnlockedFolders(prev => {
        const newSet = new Set(prev);
        newSet.delete(folder.id);
        return newSet;
      });
      
      await fetchDocuments();
    } catch (error) {
      console.error('Error removing password:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove password');
    }
  };

  // Document password handlers
  const handleSetDocPassword = async () => {
    if (!selectedDocForPassword || !docPassword.trim()) {
      alert('Please enter a password');
      return;
    }

    console.log('Setting password for document:', selectedDocForPassword.name);

    try {
      const response = await fetch(`/api/documents/${selectedDocForPassword.id}/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: docPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set password');
      }

      setShowDocPasswordModal(false);
      setSelectedDocForPassword(null);
      setDocPassword('');
      setSuccessMessage('Document password protection added successfully');
      setShowSuccessModal(true);
      await fetchDocuments();
    } catch (error) {
      console.error('Error setting document password:', error);
      alert(error instanceof Error ? error.message : 'Failed to set password');
    }
  };

  const handleRemoveDocPassword = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/password`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove password');
      }

      setSuccessMessage('Document password protection removed successfully');
      setShowSuccessModal(true);
      
      // Remove from unlocked documents
      setUnlockedDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
      
      await fetchDocuments();
    } catch (error) {
      console.error('Error removing document password:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove password');
    }
  };

  const handleVerifyDocPassword = async () => {
    if (!docToVerify || !verifyDocPassword.trim()) {
      alert('Please enter a password');
      return;
    }

    try {
      const response = await fetch(`/api/documents/${docToVerify.id}/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: verifyDocPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert('Incorrect password');
        return;
      }

      // Password correct, add to unlocked documents
      setUnlockedDocuments(prev => new Set(prev).add(docToVerify.id));
      setShowDocPasswordVerifyModal(false);
      setVerifyDocPassword('');
      
      // Now open the document
      setSelectedDocument(docToVerify);
      setShowPreview(true);
      setDocToVerify(null);
    } catch (error) {
      console.error('Error verifying document password:', error);
      alert('Failed to verify password');
    }
  };

  // Fetch activity logs for specific item
  const fetchActivityLogs = async (itemId: string, itemType: 'document' | 'folder') => {
    try {
      const filterParam = itemType === 'document' ? `documentId=${itemId}` : `folderId=${itemId}`;
      console.log('Fetching activities:', { itemId, itemType, filterParam });
      const response = await fetch(`/api/activities?${filterParam}&limit=5`);
      console.log('Activity API response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Activity API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch activity logs');
      }
      
      const data = await response.json();
      console.log('Activity logs data:', data);
      setActivityLogs(data.activities || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      alert(`Failed to load activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Download full activity log as CSV
  const handleDownloadActivityLog = async () => {
    if (!activityItemId || !activityItemType) return;
    
    try {
      const filterParam = activityItemType === 'document' ? `documentId=${activityItemId}` : `folderId=${activityItemId}`;
      const response = await fetch(`/api/activities/export?${filterParam}`);
      
      if (!response.ok) {
        throw new Error('Failed to download activity log');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-log-${activityItemName}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading activity log:', error);
      alert('Failed to download activity log');
    }
  };

  // Open activity modal for specific item
  const handleOpenActivityModal = (item: Document | Folder, type: 'document' | 'folder') => {
    // Close any open dropdowns first
    const dropdowns = document.querySelectorAll('.dropdown-menu.show');
    dropdowns.forEach(dropdown => {
      dropdown.classList.remove('show');
    });
    
    setActivityItemId(item.id);
    setActivityItemName(item.name);
    setActivityItemType(type);
    
    // Small delay to ensure dropdown closes first
    setTimeout(() => {
      setShowActivityModal(true);
      fetchActivityLogs(item.id, type);
    }, 50);
  };

  // Prevent modal dragging and repositioning
  useEffect(() => {
    if (showActivityModal) {
      const preventDrag = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      const preventMouseEvents = (e: MouseEvent) => {
        const modal = document.querySelector('.activity-modal-dialog') as HTMLElement;
        if (modal) {
          // Lock position using inline styles
          modal.style.position = 'static';
          modal.style.transform = 'none';
          modal.style.top = 'auto';
          modal.style.left = 'auto';
          modal.style.right = 'auto';
          modal.style.bottom = 'auto';
        }
      };

      const modalElements = document.querySelectorAll('.activity-modal, .activity-modal *, .activity-modal-dialog');
      modalElements.forEach(el => {
        el.addEventListener('dragstart', preventDrag);
        el.addEventListener('drag', preventDrag);
        el.addEventListener('mousemove', preventMouseEvents);
        el.addEventListener('mouseleave', preventMouseEvents);
        el.addEventListener('mouseenter', preventMouseEvents);
        (el as HTMLElement).draggable = false;
      });

      // Lock the modal dialog position
      const lockPosition = setInterval(() => {
        const modal = document.querySelector('.activity-modal-dialog') as HTMLElement;
        if (modal) {
          modal.style.position = 'static';
          modal.style.transform = 'none';
          modal.style.margin = '0';
        }
      }, 10);

      return () => {
        clearInterval(lockPosition);
        modalElements.forEach(el => {
          el.removeEventListener('dragstart', preventDrag);
          el.removeEventListener('drag', preventDrag);
          el.removeEventListener('mousemove', preventMouseEvents);
          el.removeEventListener('mouseleave', preventMouseEvents);
          el.removeEventListener('mouseenter', preventMouseEvents);
        });
      };
    }
  }, [showActivityModal]);

  // Check if document should show password prompt
  const handleDocumentClick = (doc: Document) => {
    const isPasswordProtected = (doc as any).password || (doc as any).hasPassword;
    
    if (isPasswordProtected && !unlockedDocuments.has(doc.id)) {
      setDocToVerify(doc);
      setShowDocPasswordVerifyModal(true);
      return;
    }
    
    setSelectedDocument(doc);
    setShowPreview(true);
  };

  const handleVerifyPassword = async () => {
    if (!folderToVerify || !verifyPassword.trim()) {
      alert('Please enter a password');
      return;
    }

    console.log('Verifying password for folder:', {
      folderId: folderToVerify.id,
      folderName: folderToVerify.name,
      passwordLength: verifyPassword.length,
      password: verifyPassword // TEMPORARY - remove after debugging
    });

    try {
      const response = await fetch(`/api/documents/folders/${folderToVerify.id}/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: verifyPassword,
        }),
      });

      const data = await response.json();
      
      console.log('Verify password response:', {
        ok: response.ok,
        status: response.status,
        data
      });

      if (!response.ok || !data.success) {
        console.error('Password verification failed:', data);
        alert('Incorrect password');
        return;
      }

      console.log('Password verified successfully, unlocking folder:', folderToVerify.id);
      
      // Password correct, add to unlocked folders
      setUnlockedFolders(prev => new Set(prev).add(folderToVerify.id));
      setShowPasswordVerifyModal(false);
      setVerifyPassword('');
      
      // Now navigate to the folder
      performFolderNavigation(folderToVerify, false);
      setFolderToVerify(null);
    } catch (error) {
      console.error('Error verifying password:', error);
      alert('Failed to verify password: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
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

      const result = await response.json();
      const newFolder = result.data; // API returns { success: true, data: folder }

      console.log('New folder created:', newFolder);
      console.log('Current folder ID:', currentFolderId);
      console.log('Current folders state:', folders);

      setShowCreateFolderModal(false);
      setNewFolderName('');
      setSuccessMessage('Folder created successfully');
      setShowSuccessModal(true);

      // Immediately add the new folder to state for instant UI update
      if (currentFolderId) {
        // If we're inside a folder, update that folder's children recursively
        const updateFolderChildren = (folderList: Folder[]): Folder[] => {
          return folderList.map(folder => {
            if (folder.id === currentFolderId) {
              console.log('Found parent folder, adding child:', folder.name);
              return {
                ...folder,
                children: [...(folder.children || []), {
                  ...newFolder,
                  children: [],
                  documents: []
                }]
              };
            }
            if (folder.children && folder.children.length > 0) {
              return {
                ...folder,
                children: updateFolderChildren(folder.children)
              };
            }
            return folder;
          });
        };
        const updatedFolders = updateFolderChildren(folders);
        console.log('Updated folders after adding child:', updatedFolders);
        setFolders(updatedFolders);
      } else {
        // If we're at root level, add to folders array
        const normalizedFolder = {
          ...newFolder,
          parentId: null, // Ensure parentId is explicitly null for root folders
          children: [],
          documents: []
        };
        console.log('Adding folder to root:', normalizedFolder);
        const updatedFolders = [...folders, normalizedFolder];
        console.log('Updated folders array:', updatedFolders);
        setFolders(updatedFolders);
      }
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

  // Build the full path from root to a given folder
  const buildPathToFolder = (folderId: string, folderList: Folder[], currentPath: { id: string; name: string }[] = []): { id: string; name: string }[] | null => {
    if (!folderList || !Array.isArray(folderList)) return null;
    
    for (const folder of folderList) {
      if (!folder) continue;
      
      const newPath = [...currentPath, { id: folder.id, name: folder.name }];
      
      if (folder.id === folderId) {
        return newPath;
      }
      
      if (folder.children && folder.children.length > 0) {
        const found = buildPathToFolder(folderId, folder.children, newPath);
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

    // Check if current folder is password protected and not unlocked
    const isPasswordProtected = (currentFolder as any).password || (currentFolder as any).hasPassword;
    if (isPasswordProtected && !unlockedFolders.has(currentFolderId)) {
      console.log('Folder is locked, showing empty contents:', currentFolder.name);
      // Return empty contents if folder is locked
      return {
        folders: [],
        documents: []
      };
    }

    return {
      folders: (currentFolder.children || []).filter((folder: Folder) => 
        folder && canAccessFolder(session, folder)
      ),
      documents: currentFolder.documents || []
    };
  };

  const handleNavigateToFolder = (folder: Folder, fromBrowseTab = false) => {
    // Check if folder is password protected and not unlocked
    // Check both 'password' field and 'hasPassword' flag (from API)
    const isPasswordProtected = !!(((folder as any).password) || ((folder as any).hasPassword));
    
    console.log('Navigate to folder:', {
      name: folder.name,
      id: folder.id,
      password: (folder as any).password ? '[REDACTED]' : undefined,
      hasPassword: (folder as any).hasPassword,
      isPasswordProtected,
      isUnlocked: unlockedFolders.has(folder.id),
      unlockedFolders: Array.from(unlockedFolders)
    });
    
    if (isPasswordProtected && !unlockedFolders.has(folder.id)) {
      console.log('🔒 Showing password modal for folder:', folder.name);
      setFolderToVerify(folder);
      setShowPasswordVerifyModal(true);
      return;
    }

    // Proceed with navigation
    console.log('✅ Proceeding with navigation to:', folder.name);
    performFolderNavigation(folder, fromBrowseTab);
  };

  const performFolderNavigation = (folder: Folder, fromBrowseTab = false) => {
    // Check if the folder is already in the current path to avoid duplicates
    const existingIndex = currentPath.findIndex(p => p.id === folder.id);
    
    if (existingIndex !== -1) {
      // If folder is already in path, navigate to it (slice the path)
      const newPath = currentPath.slice(0, existingIndex + 1);
      setCurrentPath(newPath);
      setCurrentFolderId(folder.id);
    } else if (activeTab === 'starred' || !fromBrowseTab) {
      // When navigating from starred tab or quick access, build the full path to the folder
      setActiveTab('browse');
      setCurrentFolderId(folder.id);
      
      // Try to build the full path from root to this folder
      const fullPath = buildPathToFolder(folder.id, folders);
      if (fullPath) {
        setCurrentPath(fullPath);
      } else {
        // If we can't build the full path, just navigate directly to the folder
        setCurrentPath([{ id: folder.id, name: folder.name }]);
      }
    } else {
      // Normal navigation - append to current path
      setCurrentFolderId(folder.id);
      setCurrentPath([...currentPath, { id: folder.id, name: folder.name }]);
    }
    setSearchQuery('');
  };

  // Starred files should always be accessible, even if parent folder is locked
  // Password protection only applies to browsing folder contents

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
      const targetFolderId = currentPath[index].id;
      
      // Check if the target folder is password protected
      const targetFolder = findFolder(targetFolderId, folders);
      
      if (targetFolder) {
        const isPasswordProtected = (targetFolder as any).password || (targetFolder as any).hasPassword;
        
        if (isPasswordProtected && !unlockedFolders.has(targetFolderId)) {
          // Folder is locked, show password modal
          console.log('Breadcrumb navigation blocked - folder is locked:', targetFolder.name);
          setFolderToVerify(targetFolder);
          setShowPasswordVerifyModal(true);
          return;
        }
      }
      
      const newPath = currentPath.slice(0, index + 1);
      setCurrentPath(newPath);
      setCurrentFolderId(targetFolderId);
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

  // Move modal functions
  const handleOpenMoveModal = (item: Document | Folder) => {
    setItemToMove(item);
    setMoveTargetCompanyId(selectedCompanyId);
    setShowMoveModal(true);
    // Fetch folders for the currently selected company and filter out the item being moved if it's a folder
    if (selectedCompanyId) {
      fetchFoldersForCompany(selectedCompanyId, 'children' in item ? item.id : null);
    }
  };

  const fetchFoldersForCompany = async (companyId: string, excludeFolderId: string | null = null) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/documents`);
      if (!response.ok) throw new Error('Failed to fetch folders');
      const data = await response.json();
      
      // Flatten all folders and filter out the one being moved and its children
      const flattenFolders = (folderList: Folder[], parentPath = ''): Folder[] => {
        let result: Folder[] = [];
        for (const folder of folderList) {
          // Skip the folder being moved and its children
          if (excludeFolderId && (folder.id === excludeFolderId || isChildOfFolder(folder.id, excludeFolderId, folderList))) {
            continue;
          }
          const folderWithPath = { 
            ...folder, 
            name: parentPath ? `${parentPath} / ${folder.name}` : folder.name 
          };
          result.push(folderWithPath);
          if (folder.children && folder.children.length > 0) {
            result = result.concat(flattenFolders(folder.children, folderWithPath.name));
          }
        }
        return result;
      };
      
      setAvailableFolders(flattenFolders(data.folders || []));
    } catch (error) {
      console.error('Error fetching folders:', error);
      setAvailableFolders([]);
    }
  };

  // Helper to check if a folder is a child of another folder
  const isChildOfFolder = (childId: string, parentId: string, folderList: Folder[]): boolean => {
    for (const folder of folderList) {
      if (folder.id === parentId) {
        // Check if childId is in this folder's children
        if (folder.children) {
          for (const child of folder.children) {
            if (child.id === childId) return true;
            if (isChildOfFolder(childId, child.id, folder.children)) return true;
          }
        }
      }
      // Recursively check children
      if (folder.children && isChildOfFolder(childId, parentId, folder.children)) {
        return true;
      }
    }
    return false;
  };

  const handleMoveSubmit = async () => {
    if (!itemToMove || !moveTargetCompanyId) return;

    const isFolder = 'children' in itemToMove;
    const endpoint = isFolder 
      ? `/api/documents/folders/${itemToMove.id}/move`
      : `/api/documents/${itemToMove.id}/move`;

    try {
      const bodyParam = isFolder 
        ? { parentId: moveTargetFolderId, targetCompanyId: moveTargetCompanyId }
        : { targetFolderId: moveTargetFolderId, targetCompanyId: moveTargetCompanyId };

      const method = isFolder ? 'PATCH' : 'POST';
      
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
      
      // Optimistically update the UI
      if (isFolder) {
        // Remove the folder from its current location
        const removeFolderFromState = (folderList: Folder[]): Folder[] => {
          return folderList.filter(f => f.id !== itemToMove.id).map(folder => ({
            ...folder,
            children: folder.children ? removeFolderFromState(folder.children) : []
          }));
        };

        // Add the folder to its new location
        const addFolderToState = (folderList: Folder[]): Folder[] => {
          if (!moveTargetFolderId) {
            // Moving to root
            return [...folderList, { ...itemToMove as Folder, parentId: null }];
          }
          return folderList.map(folder => {
            if (folder.id === moveTargetFolderId) {
              return {
                ...folder,
                children: [...(folder.children || []), { ...itemToMove as Folder, parentId: moveTargetFolderId }]
              };
            }
            if (folder.children && folder.children.length > 0) {
              return {
                ...folder,
                children: addFolderToState(folder.children)
              };
            }
            return folder;
          });
        };

        let updatedFolders = removeFolderFromState(folders);
        updatedFolders = addFolderToState(updatedFolders);
        setFolders(updatedFolders);
      } else {
        // Remove document from current location and add to new location
        const removeDocFromState = (docs: Document[]): Document[] => {
          return docs.filter(d => d.id !== itemToMove.id);
        };

        setCurrentDocuments(removeDocFromState(currentDocuments));
      }
      
      setSuccessMessage(result.message || `${isFolder ? 'Folder' : 'Document'} moved successfully`);
      setShowSuccessModal(true);
      setShowMoveModal(false);
      
      // If we moved a folder that we're currently inside, navigate back
      if (isFolder && currentFolderId === itemToMove.id) {
        handleNavigateBack();
      }
    } catch (error) {
      console.error('Error moving item:', error);
      alert(error instanceof Error ? error.message : 'Failed to move item');
      // Refresh on error to ensure consistency
      await fetchDocuments();
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
    item && item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())
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
        {/* Active Users Widget */}
        <div className="active-users-container">
          <ActiveUsers />
        </div>

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


        {/* Quick Access Section - Pinned Folders Only */}
        {showQuickAccess && pinnedFolders.length > 0 && (
          <div className="quick-access-section">
            <div className="section-header">
              <h3><FaThumbtack className="me-2 text-info" />Quick Access - Pinned Folders</h3>
              <button className="collapse-button" onClick={() => setShowQuickAccess(false)}>
                Hide
              </button>
            </div>
            <p className="text-muted small mb-3">Folders pinned to the top for instant access</p>
                <div className="quick-access-grid">
                  {pinnedFolders.map(item => {
                    const folder = {
                      ...item.folder,
                      hasPassword: item.folder.hasPassword || !!item.folder.password,
                      password: item.folder.password // Keep password info for verification
                    };
                    
                    console.log('Quick Access Folder:', {
                      name: folder.name,
                      hasPassword: folder.hasPassword,
                      password: folder.password
                    });
                    
                    return (
                      <div
                        key={item.id}
                        className="quick-access-item pinned-item"
                        onClick={() => {
                          console.log('Quick access clicked:', folder.name, 'hasPassword:', folder.hasPassword);
                          handleNavigateToFolder(folder);
                        }}
                      >
                  <div className="item-icon">
                    <FaFolder className="folder-icon" size={32} style={{ color: '#ffffff' }} />
                    <FaThumbtack className="pin-badge" size={12} style={{ color: '#ffffff' }} />
                    {(folder.hasPassword || (folder as any).password) && (
                      <FaLock className="lock-badge-small" style={{ color: '#ffffff' }} />
                    )}
                  </div>
                  <div className="item-content">
                    <div className="item-name">{folder.name}</div>
                    <div className="item-company">{folder.company?.name}</div>
                  </div>
                </div>
                    );
                  })}
            </div>
          </div>
        )}

        {!showQuickAccess && pinnedFolders.length > 0 && (
          <div className="quick-access-collapsed">
            <button onClick={() => setShowQuickAccess(true)}>
              <FaThumbtack className="me-2" />
              Show Quick Access
            </button>
          </div>
        )}

        {/* Navigation Tabs with Company Switcher */}
        <div className="navigation-tabs">
          <div className="tabs-left">
            <button
              className={`nav-tab ${activeTab === 'browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              <FaFolder className="me-2" />
              My Drive
            </button>
            <button
              className={`nav-tab ${activeTab === 'starred' ? 'active' : ''}`}
              onClick={() => setActiveTab('starred')}
            >
              <FaStar className="me-2" />
              Starred
            </button>
          </div>
          {accessibleCompanies.length > 0 && (
            <div className="tabs-right">
              {accessibleCompanies.length > 1 ? (
                <Dropdown>
                  <Dropdown.Toggle variant="outline-light" className="company-switcher-btn" id="company-dropdown">
                    <FaBuilding className="me-2" />
                    {accessibleCompanies.find(c => c.id === selectedCompanyId)?.name || 'Select Company'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu align="end">
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
              ) : (
                <div className="company-display">
                  <FaBuilding className="me-2" />
                  {accessibleCompanies[0]?.name}
                </div>
              )}
            </div>
          )}
        </div>

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
              <ButtonGroup className="view-toggle d-none d-md-flex">
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
          {activeTab === 'starred' ? (
            // Starred Tab Content
            <div className="starred-content">
              {(favoriteFolders.length === 0 && favoriteDocuments.length === 0) ? (
                <div className="empty-state">
                  <FaStar size={64} className="empty-icon text-warning" />
                  <h3>No starred items yet</h3>
                  <p>Star files and folders to find them quickly here</p>
                </div>
              ) : (
                <>
                  {favoriteFolders.length > 0 && (
                    <div className="starred-section mb-4">
                      <h4 className="mb-3">Starred Folders</h4>
                      <div className={viewMode === 'grid' ? 'items-grid' : 'items-list'}>
                        {favoriteFolders.filter(item => item && item.folder).map(item => {
                          const folder = { 
                            ...item.folder, 
                            isFavorite: true,
                            hasPassword: item.folder.hasPassword || !!item.folder.password
                          };
                          return viewMode === 'grid' ? (
                            <div 
                              key={item.id} 
                              className="grid-item"
                            >
                              <div 
                                className="item-preview"
                                onClick={() => handleNavigateToFolder(folder)}
                              >
                                <div className="item-icon-wrapper">
                                <FaFolder className="folder-icon" size={64} style={{ color: '#ffffff' }} />
                                {(folder.hasPassword || (folder as any).password) && (
                                  <FaLock className="lock-badge" style={{ color: '#ffffff' }} />
                                )}
                              </div>
                            </div>
                              <div className="item-info">
                                <div className="item-name-row">
                                  <div className="item-name" title={folder.name}>{folder.name}</div>
                                  <div className="item-actions-inline">
                                    {renderStarButton(folder)}
                                  </div>
                                </div>
                              </div>
                              <div className="item-dropdown">
                                <Dropdown onClick={(e) => e.stopPropagation()}>
                                  <Dropdown.Toggle 
                                    variant="link" 
                                    className="three-dot-menu"
                                    id={`dropdown-starred-folder-${item.id}`}
                                  >
                                    <FaEllipsisV />
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu align="end">
                                    <Dropdown.Item onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleFavorite(folder, e);
                                    }}>
                                      <FaStar className="me-2 text-warning" /> Remove from Starred
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={(e) => {
                                      e.stopPropagation();
                                      handleNavigateToFolder(folder);
                                    }}>
                                      <FaFolder className="me-2" /> Open Folder
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown>
                              </div>
                            </div>
                          ) : (
                            <div key={item.id} className="list-item">
                              <div className="item-main" onClick={() => handleNavigateToFolder(folder)}>
                                <FaFolder className="folder-icon" style={{ color: '#ffffff' }} />
                                <div className="item-details">
                                  <div className="item-name">{folder.name}</div>
                                  <div className="item-meta">Folder</div>
                                </div>
                              </div>
                              <div className="item-actions">
                                {renderStarButton(folder)}
                                <Dropdown onClick={(e) => e.stopPropagation()}>
                                  <Dropdown.Toggle 
                                    variant="link" 
                                    className="three-dot-menu"
                                    id={`dropdown-starred-folder-list-${item.id}`}
                                  >
                                    <FaEllipsisV />
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu align="end">
                                    <Dropdown.Item onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleFavorite(folder, e);
                                    }}>
                                      <FaStar className="me-2 text-warning" /> Remove from Starred
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={(e) => {
                                      e.stopPropagation();
                                      handleNavigateToFolder(folder);
                                    }}>
                                      <FaFolder className="me-2" /> Open Folder
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {favoriteDocuments.length > 0 && (
                    <div className="starred-section">
                      <h4 className="mb-3">Starred Documents</h4>
                      <div className={viewMode === 'grid' ? 'items-grid' : 'items-list'}>
                        {favoriteDocuments.filter(item => item && item.document).map(item => {
                          const doc = { ...item.document, isFavorite: true };
                          return viewMode === 'grid' ? (
                            <div key={item.id} className="grid-item">
                              <div 
                                className="item-preview"
                                onClick={() => {
                                  // Starred files are always accessible
                                  setSelectedDocument(doc);
                                  setShowPreview(true);
                                }}
                              >
                                <div className="item-icon-wrapper">
                                  <div style={{ position: 'relative' }}>
                                    {doc?.mimeType === 'application/pdf' && <FaFilePdf className="file-icon pdf-icon" size={64} style={{ color: '#ffffff' }} />}
                                    {doc?.mimeType?.startsWith('image/') && <FaFileImage className="file-icon image-icon" size={64} style={{ color: '#ffffff' }} />}
                                    {((doc?.mimeType?.includes('word') || doc?.name?.endsWith('.docx'))) && <FaFileWord className="file-icon word-icon" size={64} style={{ color: '#ffffff' }} />}
                                    {!((doc?.mimeType?.includes('pdf') || doc?.mimeType?.startsWith('image/') || doc?.mimeType?.includes('word'))) && doc?.mimeType && <FaFile className="file-icon" size={64} style={{ color: '#ffffff' }} />}
                                    {((doc as any).password || (doc as any).hasPassword) && (
                                      <FaLock className="lock-badge" style={{ color: '#ffffff' }} />
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="item-info">
                                <div className="item-name-row">
                                  <div className="item-name" title={doc.name}>{doc.name}</div>
                                  <div className="item-actions-inline">
                                    {renderStarButton(doc)}
                                  </div>
                                </div>
                                <div className="item-meta">
                                  {formatFileSize(doc.size)}
                                </div>
                              </div>
                              <div className="item-dropdown">
                                <Dropdown onClick={(e) => e.stopPropagation()}>
                                  <Dropdown.Toggle 
                                    variant="link" 
                                    className="three-dot-menu"
                                    id={`dropdown-starred-doc-${item.id}`}
                                  >
                                    <FaEllipsisV />
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu align="end">
                                    <Dropdown.Item onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleFavorite(doc, e);
                                    }}>
                                      <FaStar className="me-2 text-warning" /> Remove from Starred
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDocument(doc);
                                      setShowPreview(true);
                                    }}>
                                      <FaEye className="me-2" /> Preview
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(doc);
                                    }}>
                                      <FaDownload className="me-2" /> Download
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown>
                              </div>
                            </div>
                          ) : (
                            <div key={item.id} className="list-item">
                              <div className="item-main" onClick={() => {
                                // Starred files are always accessible
                                setSelectedDocument(doc);
                                setShowPreview(true);
                              }}>
                                <FaFile className="file-icon" style={{ color: '#ffffff' }} />
                                <div className="item-details">
                                  <div className="item-name">{doc.name}</div>
                                  <div className="item-meta">{doc.size ? formatFileSize(doc.size) : ''}</div>
                                </div>
                              </div>
                              <div className="item-actions">
                                {renderStarButton(doc)}
                                <Dropdown onClick={(e) => e.stopPropagation()}>
                                  <Dropdown.Toggle 
                                    variant="link" 
                                    className="three-dot-menu"
                                    id={`dropdown-starred-doc-list-${item.id}`}
                                  >
                                    <FaEllipsisV />
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu align="end">
                                    <Dropdown.Item onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleFavorite(doc, e);
                                    }}>
                                      <FaStar className="me-2 text-warning" /> Remove from Starred
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDocument(doc);
                                      setShowPreview(true);
                                    }}>
                                      <FaEye className="me-2" /> Preview
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(doc);
                                    }}>
                                      <FaDownload className="me-2" /> Download
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : isLoading ? (
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
                          handleNavigateToFolder(item as Folder, true);
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
                                  <FaThumbtack className="pinned-badge" style={{ color: '#ffffff' }} />
                                )}
                                {((item as any).password || (item as any).hasPassword) && (
                                  <FaLock className="lock-badge" style={{ color: '#ffffff' }} />
                                )}
                              </>
                            ) : (
                              <div style={{ position: 'relative' }}>
                                {(item as Document).mimeType === 'application/pdf' && <FaFilePdf className="file-icon pdf-icon" size={64} style={{ color: '#ffffff' }} />}
                                {(item as Document).mimeType?.startsWith('image/') && <FaFileImage className="file-icon image-icon" size={64} style={{ color: '#ffffff' }} />}
                                {((item as Document).mimeType?.includes('word') || (item as Document).name?.endsWith('.docx')) && <FaFileWord className="file-icon word-icon" size={64} style={{ color: '#ffffff' }} />}
                                {!((item as Document).mimeType?.includes('pdf') || (item as Document).mimeType?.startsWith('image/') || (item as Document).mimeType?.includes('word')) && (item as Document).mimeType && <FaFile className="file-icon" size={64} style={{ color: '#ffffff' }} />}
                                {((item as any).password || (item as any).hasPassword) && (
                                  <FaLock className="lock-badge" style={{ color: '#ffffff' }} />
                                )}
                              </div>
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
                              handleToggleFavorite(item, e);
                            }}
                          >
                            {item.isFavorite ? (
                              <><FaStar className="me-2 text-warning" /> Remove from Starred</>
                            ) : (
                              <><FaRegStar className="me-2" /> Add to Starred</>
                            )}
                          </Dropdown.Item>
                          {isFolder && (
                            <Dropdown.Item 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePin(item as Folder, e);
                              }}
                            >
                              {(item as Folder).isPinned ? (
                                <><FaThumbtack className="me-2 text-info" /> Unpin from Quick Access</>
                              ) : (
                                <><FaThumbtack className="me-2" /> Pin to Quick Access</>
                              )}
                            </Dropdown.Item>
                          )}
                          <Dropdown.Divider />
                          {isFolder && isManager && (
                            <Dropdown.Item 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFolderForPassword(item as Folder);
                                setShowPasswordModal(true);
                              }}
                            >
                              <FaLock className="me-2" /> {(item as any).password ? 'Change Password' : 'Set Password'}
                            </Dropdown.Item>
                          )}
                          {isFolder && isAdmin && (item as any).password && (
                            <Dropdown.Item 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Remove password protection from this folder?')) {
                                  handleRemovePassword(item as Folder);
                                }
                              }}
                              className="text-warning"
                            >
                              <FaLock className="me-2" /> Remove Password
                            </Dropdown.Item>
                          )}
                          {(isFolder && (isManager || (isAdmin && (item as any).password))) && <Dropdown.Divider />}
                          {!isFolder && isManager && (
                            <Dropdown.Item 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDocForPassword(item as Document);
                                setShowDocPasswordModal(true);
                              }}
                            >
                              <FaLock className="me-2" /> {(item as any).password ? 'Change Password' : 'Set Password'}
                            </Dropdown.Item>
                          )}
                          {!isFolder && isAdmin && (item as any).password && (
                            <Dropdown.Item 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Remove password protection from this document?')) {
                                  handleRemoveDocPassword(item as Document);
                                }
                              }}
                              className="text-warning"
                            >
                              <FaLock className="me-2" /> Remove Password
                            </Dropdown.Item>
                          )}
                          {(!isFolder && (isManager || (isAdmin && (item as any).password))) && <Dropdown.Divider />}
                          <Dropdown.Item 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInfo(item);
                              setShowInfoModal(true);
                            }}
                          >
                            <FaInfo className="me-2" /> Get Info
                          </Dropdown.Item>
                          <Dropdown.Item 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenActivityModal(item, isFolder ? 'folder' : 'document');
                            }}
                          >
                            <FaClipboardList className="me-2" /> Activity Log
                          </Dropdown.Item>
                          <Dropdown.Item 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMemoItem({ item, type: isFolder ? 'folder' : 'document' });
                              setShowMemoModal(true);
                            }}
                          >
                            <FaStickyNote className="me-2" style={{ color: '#ffc107' }} /> Memos
                          </Dropdown.Item>
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
                              handleOpenMoveModal(item);
                            }}
                          >
                            <FaArrowsAlt className="me-2" /> Move to...
                          </Dropdown.Item>
                          <Dropdown.Item 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedShareItem(item);
                              setShowShareModal(true);
                            }}
                          >
                            <FaShare className="me-2" /> Share Link
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
                          handleNavigateToFolder(item as Folder, true);
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
                              handleToggleFavorite(item, e);
                            }}
                          >
                            {item.isFavorite ? (
                              <><FaStar className="me-2 text-warning" /> Remove from Starred</>
                            ) : (
                              <><FaRegStar className="me-2" /> Add to Starred</>
                            )}
                          </Dropdown.Item>
                          {isFolder && (
                            <Dropdown.Item 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePin(item as Folder, e);
                              }}
                            >
                              {(item as Folder).isPinned ? (
                                <><FaThumbtack className="me-2 text-info" /> Unpin from Quick Access</>
                              ) : (
                                <><FaThumbtack className="me-2" /> Pin to Quick Access</>
                              )}
                            </Dropdown.Item>
                          )}
                          <Dropdown.Divider />
                          {isFolder && isManager && (
                            <Dropdown.Item 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFolderForPassword(item as Folder);
                                setShowPasswordModal(true);
                              }}
                            >
                              <FaLock className="me-2" /> {(item as any).password ? 'Change Password' : 'Set Password'}
                            </Dropdown.Item>
                          )}
                          {isFolder && isAdmin && (item as any).password && (
                            <Dropdown.Item 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Remove password protection from this folder?')) {
                                  handleRemovePassword(item as Folder);
                                }
                              }}
                              className="text-warning"
                            >
                              <FaLock className="me-2" /> Remove Password
                            </Dropdown.Item>
                          )}
                          {(isFolder && (isManager || (isAdmin && (item as any).password))) && <Dropdown.Divider />}
                          {!isFolder && isManager && (
                            <Dropdown.Item 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDocForPassword(item as Document);
                                setShowDocPasswordModal(true);
                              }}
                            >
                              <FaLock className="me-2" /> {(item as any).password ? 'Change Password' : 'Set Password'}
                            </Dropdown.Item>
                          )}
                          {!isFolder && isAdmin && (item as any).password && (
                            <Dropdown.Item 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Remove password protection from this document?')) {
                                  handleRemoveDocPassword(item as Document);
                                }
                              }}
                              className="text-warning"
                            >
                              <FaLock className="me-2" /> Remove Password
                            </Dropdown.Item>
                          )}
                          {(!isFolder && (isManager || (isAdmin && (item as any).password))) && <Dropdown.Divider />}
                          <Dropdown.Item 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInfo(item);
                              setShowInfoModal(true);
                            }}
                          >
                            <FaInfo className="me-2" /> Get Info
                          </Dropdown.Item>
                          <Dropdown.Item 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenActivityModal(item, isFolder ? 'folder' : 'document');
                            }}
                          >
                            <FaClipboardList className="me-2" /> Activity Log
                          </Dropdown.Item>
                          <Dropdown.Item 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMemoItem({ item, type: isFolder ? 'folder' : 'document' });
                              setShowMemoModal(true);
                            }}
                          >
                            <FaStickyNote className="me-2" style={{ color: '#ffc107' }} /> Memos
                          </Dropdown.Item>
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
                              handleOpenMoveModal(item);
                            }}
                          >
                            <FaArrowsAlt className="me-2" /> Move to...
                          </Dropdown.Item>
                          <Dropdown.Item 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedShareItem(item);
                              setShowShareModal(true);
                            }}
                          >
                            <FaShare className="me-2" /> Share Link
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

        <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} centered className="upload-modal">
          <div className="modal-header-custom">
            <div className="d-flex align-items-center gap-3">
              <div className="modal-icon-wrapper">
                <FaUpload />
              </div>
              <Modal.Title>Upload Documents</Modal.Title>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowUploadModal(false)}
              aria-label="Close"
            />
          </div>
          <Form onSubmit={handleUpload}>
            <div className="modal-body-custom">
              <Form.Group>
                <Form.Label className="form-label-custom">
                  <FaFile className="label-icon" />
                  Select Files
                </Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const files = Array.from(e.target.files || []);
                    setUploadFiles(files);
                  }}
                  required
                  className="form-control-custom"
                />
                {uploadFiles.length > 0 && (
                  <div className="selected-files-info">
                    <FaCheckCircle />
                    <span>{uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''} selected</span>
                  </div>
                )}
              </Form.Group>
            </div>
            <div className="modal-footer-custom">
              <Button variant="secondary" onClick={() => {
                setShowUploadModal(false);
                setUploadFiles([]);
              }} className="cancel-btn">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={!uploadFiles.length} className="submit-btn">
                <FaUpload className="me-2" />
                Upload {uploadFiles.length > 0 ? `(${uploadFiles.length})` : ''}
              </Button>
            </div>
          </Form>
        </Modal>

        <Modal show={showCreateFolderModal} onHide={() => setShowCreateFolderModal(false)} centered className="create-folder-modal">
          <div className="modal-header-custom">
            <div className="d-flex align-items-center gap-3">
              <div className="modal-icon-wrapper">
                <FaFolderPlus />
              </div>
              <Modal.Title>Create New Folder</Modal.Title>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowCreateFolderModal(false)}
              aria-label="Close"
            />
          </div>
          <Form onSubmit={handleCreateFolder}>
            <div className="modal-body-custom">
              <Form.Group>
                <Form.Label className="form-label-custom">
                  <FaFolder className="label-icon" />
                  Folder Name
                </Form.Label>
                <Form.Control
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  required
                  className="form-control-custom"
                  autoFocus
                />
              </Form.Group>
              <div className="folder-hint">
                <FaInfoCircle />
                <span>Create a folder to organize your documents</span>
              </div>
            </div>
            <div className="modal-footer-custom">
              <Button variant="secondary" onClick={() => setShowCreateFolderModal(false)} className="cancel-btn">
                Cancel
              </Button>
              <Button variant="primary" type="submit" className="submit-btn">
                <FaFolderPlus className="me-2" />
                Create Folder
              </Button>
            </div>
          </Form>
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

        {/* Move Modal */}
        <Modal 
          show={showMoveModal} 
          onHide={() => {
            setShowMoveModal(false);
            setItemToMove(null);
            setMoveTargetCompanyId(null);
            setMoveTargetFolderId(null);
            setAvailableFolders([]);
          }} 
          centered
          className="move-modal"
        >
          <Modal.Header closeButton className="border-0">
            <Modal.Title className="d-flex align-items-center w-100">
              <div className="modal-icon-wrapper">
                <FaArrowsAlt />
              </div>
              <div className="flex-grow-1">
                <div className="modal-title-text">
                  Move {itemToMove && ('children' in itemToMove ? 'Folder' : 'Document')}
                </div>
                <div className="modal-subtitle">
                  {itemToMove?.name}
                </div>
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {itemToMove && (
              <div className="move-modal-content">
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">
                    <FaFolder className="me-2" />
                    Destination Folder
                  </Form.Label>
                  <Form.Select
                    value={moveTargetFolderId || ''}
                    onChange={(e) => setMoveTargetFolderId(e.target.value || null)}
                    className="move-select"
                  >
                    <option value="">📁 Root (Top level - no folder)</option>
                    {availableFolders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        📁 {folder.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="help-text">
                    {availableFolders.length === 0 
                      ? 'No folders available. Select "Root" to move to the top level.' 
                      : 'Choose a folder or select "Root" to move to the top level'}
                  </Form.Text>
                </Form.Group>

                {accessibleCompanies.length > 1 && (
                  <>
                    <div className="section-divider"></div>
                    <Form.Group className="mb-0">
                      <Form.Label className="form-label">
                        <FaBuilding className="me-2" />
                        Move to Different Company
                      </Form.Label>
                      <Form.Select
                        value={moveTargetCompanyId || ''}
                        onChange={(e) => {
                          const companyId = e.target.value;
                          setMoveTargetCompanyId(companyId);
                          setMoveTargetFolderId(null);
                          if (companyId) {
                            fetchFoldersForCompany(companyId, 'children' in itemToMove ? itemToMove.id : null);
                          }
                        }}
                        className="move-select"
                      >
                        {accessibleCompanies.map(company => (
                          <option key={company.id} value={company.id}>
                            {company.name} {company.isPrimary ? '(Primary)' : ''} {company.id === selectedCompanyId ? '(Current)' : ''}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="help-text">
                        Currently: <strong>{accessibleCompanies.find(c => c.id === moveTargetCompanyId)?.name}</strong>
                      </Form.Text>
                    </Form.Group>
                  </>
                )}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowMoveModal(false);
                setItemToMove(null);
                setMoveTargetCompanyId(null);
                setMoveTargetFolderId(null);
              }}
              className="cancel-btn"
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleMoveSubmit}
              disabled={!moveTargetCompanyId}
              className="submit-btn"
            >
              <FaArrowsAlt className="me-2" />
              Move {moveTargetFolderId ? 'to Folder' : 'to Root'}
            </Button>
          </Modal.Footer>
        </Modal>

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
                  <span>{selectedInfo.name || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <strong>Type:</strong>
                  <span>{'children' in selectedInfo ? 'Folder' : ((selectedInfo as Document).mimeType || 'Unknown')}</span>
                </div>
                {!('children' in selectedInfo) && (selectedInfo as Document).size && (
                  <div className="info-row">
                    <strong>Size:</strong>
                    <span>{formatFileSize((selectedInfo as Document).size)}</span>
                  </div>
                )}
                {!('children' in selectedInfo) && (selectedInfo as Document).path && (
                  <div className="info-row">
                    <strong>Path:</strong>
                    <span>{(selectedInfo as Document).path}</span>
                  </div>
                )}
                {selectedInfo.createdAt && (
                  <div className="info-row">
                    <strong>Created:</strong>
                    <span>{new Date(selectedInfo.createdAt).toLocaleString()}</span>
                  </div>
                )}
                {selectedInfo.updatedAt && (
                  <div className="info-row">
                    <strong>Modified:</strong>
                    <span>{new Date(selectedInfo.updatedAt).toLocaleString()}</span>
                  </div>
                )}
                {'children' in selectedInfo && (
                  <>
                    <div className="info-row">
                      <strong>Items:</strong>
                      <span>
                        {((selectedInfo as Folder).documents || []).length} document(s), {((selectedInfo as Folder).children || []).length} folder(s)
                      </span>
                    </div>
                    <div className="info-row">
                      <strong>Protected:</strong>
                      <span>{(selectedInfo as any).password ? 'Yes' : 'No'}</span>
                    </div>
                  </>
                )}
                {selectedInfo.id && (
                  <div className="info-row">
                    <strong>ID:</strong>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{selectedInfo.id}</span>
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

        {/* Password Protection Modal */}
        <Modal 
          show={showPasswordModal} 
          onHide={() => {
            setShowPasswordModal(false);
            setSelectedFolderForPassword(null);
            setFolderPassword('');
          }}
          centered
          className="password-modal"
        >
          <Modal.Header closeButton className="border-0">
            <Modal.Title className="d-flex align-items-center">
              <div className="modal-icon-wrapper">
                <FaLock />
              </div>
              <div>
                <div className="modal-title-text">
                  {(selectedFolderForPassword as any)?.password ? 'Change Folder Password' : 'Set Folder Password'}
                </div>
                <div className="modal-subtitle">
                  {selectedFolderForPassword?.name}
                </div>
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="password-modal-content">
              <p className="modal-description">
                <FaLock className="me-2" />
                Only users with the password will be able to browse the contents of this folder.
              </p>
              <div className="alert alert-warning mb-3" style={{
                background: 'rgba(255, 193, 7, 0.15)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                <strong>⚠️ Important:</strong> Starred files from this folder can be opened directly by users who starred them, even without the folder password. The password only protects browsing the folder contents.
              </div>
              <Form.Group className="mb-0">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter a secure password"
                  value={folderPassword}
                  onChange={(e) => setFolderPassword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSetPassword();
                    }
                  }}
                  autoFocus
                  className="password-input"
                />
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowPasswordModal(false);
                setSelectedFolderForPassword(null);
                setFolderPassword('');
              }}
              className="cancel-btn"
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSetPassword}
              className="submit-btn"
            >
              <FaLock className="me-2" />
              {(selectedFolderForPassword as any)?.password ? 'Change Password' : 'Set Password'}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Folder Password Verify Modal */}
        <Modal 
          show={showPasswordVerifyModal} 
          onHide={() => {
            setShowPasswordVerifyModal(false);
            setFolderToVerify(null);
            setVerifyPassword('');
          }}
          centered
          className="password-modal"
        >
          <Modal.Header closeButton className="border-0">
            <Modal.Title className="d-flex align-items-center">
              <div className="modal-icon-wrapper locked">
                <FaLock />
              </div>
              <div>
                <div className="modal-title-text">
                  Password Protected Folder
                </div>
                <div className="modal-subtitle">
                  {folderToVerify?.name}
                </div>
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="password-modal-content">
              <p className="modal-description">
                <FaLock className="me-2 text-warning" />
                This folder is password protected. Enter the password to access its contents.
              </p>
              <Form.Group className="mb-0">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter folder password"
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleVerifyPassword();
                    }
                  }}
                  autoFocus
                  className="password-input"
                />
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowPasswordVerifyModal(false);
                setFolderToVerify(null);
                setVerifyPassword('');
              }}
              className="cancel-btn"
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleVerifyPassword}
              className="submit-btn"
            >
              <FaLock className="me-2" />
              Unlock Folder
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Document Password Set Modal */}
        <Modal 
          show={showDocPasswordModal} 
          onHide={() => {
            setShowDocPasswordModal(false);
            setSelectedDocForPassword(null);
            setDocPassword('');
          }}
          centered
          className="password-modal"
        >
          <Modal.Header closeButton className="border-0">
            <Modal.Title className="d-flex align-items-center">
              <div className="modal-icon-wrapper">
                <FaLock />
              </div>
              <div>
                <div className="modal-title-text">
                  {(selectedDocForPassword as any)?.password ? 'Change Document Password' : 'Set Document Password'}
                </div>
                <div className="modal-subtitle">
                  {selectedDocForPassword?.name}
                </div>
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="password-modal-content">
              <p className="modal-description">
                <FaLock className="me-2" />
                Only users with the password will be able to view or download this document.
              </p>
              <Form.Group className="mb-0">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter a secure password"
                  value={docPassword}
                  onChange={(e) => setDocPassword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSetDocPassword();
                    }
                  }}
                  autoFocus
                  className="password-input"
                />
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowDocPasswordModal(false);
                setSelectedDocForPassword(null);
                setDocPassword('');
              }}
              className="cancel-btn"
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSetDocPassword}
              className="submit-btn"
            >
              <FaLock className="me-2" />
              {(selectedDocForPassword as any)?.password ? 'Change Password' : 'Set Password'}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Document Password Verify Modal */}
        <Modal 
          show={showDocPasswordVerifyModal} 
          onHide={() => {
            setShowDocPasswordVerifyModal(false);
            setDocToVerify(null);
            setVerifyDocPassword('');
          }}
          centered
          className="password-modal"
        >
          <Modal.Header closeButton className="border-0">
            <Modal.Title className="d-flex align-items-center">
              <div className="modal-icon-wrapper locked">
                <FaLock />
              </div>
              <div>
                <div className="modal-title-text">
                  Password Protected Document
                </div>
                <div className="modal-subtitle">
                  {docToVerify?.name}
                </div>
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="password-modal-content">
              <p className="modal-description">
                <FaLock className="me-2 text-warning" />
                This document is password protected. Enter the password to view or download it.
              </p>
              <Form.Group className="mb-0">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter document password"
                  value={verifyDocPassword}
                  onChange={(e) => setVerifyDocPassword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleVerifyDocPassword();
                    }
                  }}
                  autoFocus
                  className="password-input"
                />
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowDocPasswordVerifyModal(false);
                setDocToVerify(null);
                setVerifyDocPassword('');
              }}
              className="cancel-btn"
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleVerifyDocPassword}
              className="submit-btn"
            >
              <FaLock className="me-2" />
              Unlock Document
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Activity Log Modal */}
        <Modal
          show={showActivityModal}
          onHide={() => setShowActivityModal(false)}
          size="xl"
          className="activity-modal"
          backdrop="static"
          keyboard={true}
          enforceFocus={false}
          dialogClassName="activity-modal-dialog"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
          dialogStyle={{
            position: 'static',
            transform: 'none',
            margin: 0,
            pointerEvents: 'auto',
          }}
        >
          <Modal.Header closeButton className="border-0" style={{ cursor: 'default', userSelect: 'none' }}>
            <Modal.Title className="d-flex align-items-center">
              <div className="modal-icon-wrapper">
                <FaClipboardList />
              </div>
              <div>
                <div className="modal-title-text">Activity Log</div>
                <div className="modal-subtitle">{activityItemName}</div>
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="activity-log-content">
              {activityLogs.length === 0 ? (
                <div className="no-activities">
                  <FaClipboardList size={48} />
                  <p>No recent activities</p>
                </div>
              ) : (
                <>
                  <div className="activity-header-text mb-3">
                    <small style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      Showing 5 most recent activities. Download full log for complete history.
                    </small>
                  </div>
                <div className="activities-list">
                  {activityLogs.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-icon">
                        {activity.type === 'VIEW' && <FaEye />}
                        {activity.type === 'DOWNLOAD' && <FaDownload />}
                        {activity.type === 'CREATE' && <FaUpload />}
                        {activity.type === 'UPDATE' && <FaEdit />}
                        {activity.type === 'DELETE' && <FaTrash />}
                      </div>
                      <div className="activity-details">
                        <div className="activity-description">{activity.description}</div>
                        <div className="activity-meta">
                          <span className="activity-user">{activity.employee?.name || 'Unknown User'}</span>
                          <span className="activity-separator">•</span>
                          <span className="activity-time">
                            {new Date(activity.createdAt).toLocaleString()}
                          </span>
                          {activity.document && (
                            <>
                              <span className="activity-separator">•</span>
                              <span className="activity-document">{activity.document.name}</span>
                            </>
                          )}
                          {activity.folder && (
                            <>
                              <span className="activity-separator">•</span>
                              <span className="activity-folder">{activity.folder.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0 d-flex justify-content-between">
            <Button 
              variant="outline-primary" 
              onClick={handleDownloadActivityLog}
              className="download-log-btn"
            >
              <FaDownload className="me-2" />
              Download Full Log
            </Button>
            <Button variant="secondary" onClick={() => setShowActivityModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        <style jsx>{`
          .active-users-container {
            margin-bottom: 1rem;
          }

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

          .navigation-tabs {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            padding: 0 2rem;
            background: rgba(255, 255, 255, 0.02);
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
            width: 100%;
          }

          .tabs-left {
            display: flex;
            gap: 0;
          }

          .tabs-right {
            display: flex;
            align-items: center;
          }

          .company-switcher-btn {
            background: rgba(102, 126, 234, 0.15) !important;
            border: 1px solid rgba(102, 126, 234, 0.3) !important;
            color: rgba(255, 255, 255, 0.9) !important;
            padding: 0.5rem 1rem !important;
            border-radius: 8px !important;
            display: flex !important;
            align-items: center !important;
            font-size: 0.9rem !important;
            transition: all 0.2s ease !important;
          }

          .company-switcher-btn:hover {
            background: rgba(102, 126, 234, 0.25) !important;
            border-color: rgba(102, 126, 234, 0.5) !important;
            color: #ffffff !important;
          }

          .company-display {
            background: rgba(102, 126, 234, 0.15);
            border: 1px solid rgba(102, 126, 234, 0.3);
            color: rgba(255, 255, 255, 0.9);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            display: flex;
            align-items: center;
            font-size: 0.9rem;
          }

          .activity-log-btn {
            background: rgba(40, 167, 69, 0.15) !important;
            border: 1px solid rgba(40, 167, 69, 0.3) !important;
            color: rgba(255, 255, 255, 0.9) !important;
            padding: 0.5rem 1rem !important;
            border-radius: 8px !important;
            display: flex !important;
            align-items: center !important;
            font-size: 0.9rem !important;
            transition: all 0.2s ease !important;
            margin-right: 0.75rem !important;
          }

          .activity-log-btn:hover {
            background: rgba(40, 167, 69, 0.25) !important;
            border-color: rgba(40, 167, 69, 0.5) !important;
            color: #ffffff !important;
          }

          /* Activity Modal Styles */
          :global(.activity-modal) {
            z-index: 1055 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
          }

          :global(.activity-modal-dialog),
          :global(.activity-modal .modal-dialog) {
            position: static !important;
            transform: none !important;
            margin: 0 auto !important;
            max-width: 900px !important;
            width: 90% !important;
            pointer-events: auto !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            bottom: auto !important;
          }

          :global(.activity-modal .modal-header) {
            cursor: default !important;
            user-select: none !important;
            -webkit-user-drag: none !important;
            -moz-user-drag: none !important;
          }

          :global(.activity-modal .modal-header *) {
            cursor: default !important;
            -webkit-user-drag: none !important;
            -moz-user-drag: none !important;
          }

          :global(.activity-modal .modal-content) {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1624 100%) !important;
            border: 1px solid rgba(102, 126, 234, 0.4) !important;
            border-radius: 20px !important;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6), 
                        0 0 1px rgba(102, 126, 234, 0.3) !important;
            color: #ffffff !important;
            backdrop-filter: blur(10px);
          }

          :global(.activity-modal .modal-header) {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.1) 100%) !important;
            border-bottom: 1px solid rgba(102, 126, 234, 0.3) !important;
            padding: 2rem 2rem 1.5rem 2rem !important;
            border-radius: 20px 20px 0 0 !important;
          }

          :global(.activity-modal .modal-header .btn-close) {
            filter: brightness(0) invert(1) !important;
            opacity: 0.7 !important;
          }

          :global(.activity-modal .modal-header .btn-close:hover) {
            opacity: 1 !important;
          }

          :global(.activity-modal .modal-title) {
            gap: 1rem !important;
            color: #ffffff !important;
          }

          :global(.activity-modal .modal-body) {
            padding: 2rem !important;
            max-height: 65vh !important;
            overflow-y: auto !important;
            background: transparent !important;
          }

          :global(.activity-modal .modal-body::-webkit-scrollbar) {
            width: 8px;
          }

          :global(.activity-modal .modal-body::-webkit-scrollbar-track) {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
          }

          :global(.activity-modal .modal-body::-webkit-scrollbar-thumb) {
            background: #667eea;
            border-radius: 4px;
          }

          :global(.activity-modal .modal-body::-webkit-scrollbar-thumb:hover) {
            background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
          }

          :global(.activity-modal .modal-footer) {
            background: rgba(0, 0, 0, 0.3) !important;
            border-top: 1px solid rgba(102, 126, 234, 0.2) !important;
            padding: 1.25rem 2rem !important;
            border-radius: 0 0 20px 20px !important;
          }

          :global(.activity-modal .modal-footer .btn-secondary) {
            background: linear-gradient(135deg, rgba(108, 117, 125, 0.8) 0%, rgba(73, 80, 87, 0.8) 100%);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #ffffff;
            padding: 0.6rem 1.5rem;
            border-radius: 10px;
            font-weight: 500;
            transition: all 0.3s ease;
          }

          :global(.activity-modal .modal-footer .btn-secondary:hover) {
            background: linear-gradient(135deg, rgba(108, 117, 125, 1) 0%, rgba(73, 80, 87, 1) 100%);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
          }

          :global(.activity-modal .download-log-btn) {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%) !important;
            border: 1px solid rgba(102, 126, 234, 0.4) !important;
            color: #8b9cff !important;
            padding: 0.6rem 1.5rem !important;
            border-radius: 10px !important;
            font-weight: 500 !important;
            transition: all 0.3s ease !important;
          }

          :global(.activity-modal .download-log-btn:hover) {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%) !important;
            border-color: rgba(102, 126, 234, 0.6) !important;
            color: #ffffff !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3) !important;
          }

          .activity-log-content {
            min-height: 250px;
          }

          .no-activities {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem 2rem;
            color: rgba(255, 255, 255, 0.4);
            background: rgba(102, 126, 234, 0.05);
            border-radius: 16px;
            border: 1px dashed rgba(102, 126, 234, 0.2);
          }

          .no-activities svg {
            margin-bottom: 1.5rem;
            opacity: 0.4;
            color: #667eea;
          }

          .no-activities p {
            font-size: 1.1rem;
            font-weight: 500;
            margin: 0;
          }

          .activities-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .activity-item {
            display: flex;
            align-items: flex-start;
            padding: 1.25rem;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 14px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
          }

          .activity-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 3px;
            height: 100%;
            background: #667eea;
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .activity-item:hover {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.1) 100%);
            border-color: rgba(102, 126, 234, 0.4);
            transform: translateX(8px) scale(1.01);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
          }

          .activity-item:hover::before {
            opacity: 1;
          }

          .activity-icon {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.25) 100%);
            border-radius: 12px;
            margin-right: 1.25rem;
            flex-shrink: 0;
            border: 1px solid rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
          }

          .activity-item:hover .activity-icon {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%);
            transform: scale(1.1) rotate(5deg);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
          }

          .activity-icon svg {
            color: #8b9cff;
            font-size: 1.25rem;
          }

          .activity-details {
            flex: 1;
            min-width: 0;
          }

          .activity-description {
            font-size: 1rem !important;
            font-weight: 600 !important;
            color: #ffffff !important;
            margin-bottom: 0.6rem !important;
            line-height: 1.4 !important;
          }

          .activity-meta {
            display: flex !important;
            align-items: center !important;
            flex-wrap: wrap !important;
            gap: 0.6rem !important;
            font-size: 0.875rem !important;
            color: rgba(255, 255, 255, 0.55) !important;
          }

          .activity-separator {
            color: rgba(102, 126, 234, 0.4) !important;
            font-weight: bold !important;
          }

          .activity-user {
            color: #8b9cff !important;
            font-weight: 600 !important;
            background: rgba(102, 126, 234, 0.15) !important;
            padding: 0.2rem 0.6rem !important;
            border-radius: 6px !important;
            border: 1px solid rgba(102, 126, 234, 0.2) !important;
          }

          .activity-time {
            color: rgba(255, 255, 255, 0.5) !important;
            font-style: italic !important;
          }

          .activity-document,
          .activity-folder {
            color: rgba(255, 255, 255, 0.85) !important;
            background: rgba(255, 255, 255, 0.08) !important;
            padding: 0.2rem 0.6rem !important;
            border-radius: 6px !important;
            font-style: normal !important;
            font-weight: 500 !important;
          }

          .nav-tab {
            background: none;
            border: none;
            padding: 1rem 1.5rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            font-size: 0.95rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            transition: all 0.2s ease;
            border-bottom: 3px solid transparent;
            margin-bottom: -2px;
          }

          .nav-tab:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.05);
          }

          .nav-tab.active {
            color: #ffffff;
            border-bottom-color: #667eea;
            background: rgba(102, 126, 234, 0.1);
          }

          .starred-content {
            padding: 2rem;
          }

          .starred-section h4 {
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
            margin-bottom: 1rem;
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

          .quick-access-item .item-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
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
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }

          .quick-access-item .pin-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 0.9rem;
            color: #17a2b8;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 50%;
            padding: 0.15rem;
          }

          .quick-access-item.pinned-item {
            border: 2px solid rgba(23, 162, 184, 0.3);
            background: rgba(23, 162, 184, 0.08);
          }

          .quick-access-item.pinned-item:hover {
            border-color: rgba(23, 162, 184, 0.5);
            background: rgba(23, 162, 184, 0.15);
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
            width: 100%;
          }
          
          .search-controls {
            display: flex;
            align-items: center;
            gap: 1rem;
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
            overflow-x: visible;
            padding: 2rem 3rem;
            max-width: 100%;
            width: 100%;
          }

          @media (min-width: 1920px) {
            .documents-content {
              padding: 2.5rem 4rem;
            }
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
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 2rem 1.5rem;
            max-width: 100%;
            margin: 0;
            overflow: visible;
            width: 100%;
          }

          @media (min-width: 1920px) {
            .items-grid {
              grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
              gap: 2.5rem 2rem;
            }
          }

          @media (max-width: 1400px) {
            .items-grid {
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            }
          }

          @media (max-width: 1024px) {
            .items-grid {
              grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
              gap: 1.5rem 1rem;
            }
          }

          .grid-item {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            overflow: visible;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            aspect-ratio: 1;
            display: flex;
            flex-direction: column;
            max-width: 280px;
            justify-self: start;
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
            color: #17a2b8 !important;
            background: transparent !important;
            border-radius: 50%;
            padding: 6px;
            box-shadow: none;
            opacity: 0.7;
            transition: opacity 0.2s ease;
          }

          .pinned-badge:hover,
          .grid-item:hover .pinned-badge,
          .list-item:hover .pinned-badge {
            opacity: 1;
          }

          .lock-badge {
            position: absolute;
            top: -8px;
            left: -8px;
            background: transparent !important;
            padding: 6px;
            border-radius: 50%;
            font-size: 0.75rem;
            color: #ffc107 !important;
            box-shadow: none;
            z-index: 1;
            opacity: 0.7;
            transition: opacity 0.2s ease;
          }

          .grid-item:hover .lock-badge,
          .list-item:hover .lock-badge {
            opacity: 1;
          }

          .lock-badge-small {
            position: absolute;
            bottom: -4px;
            left: -4px;
            background: transparent !important;
            padding: 4px;
            border-radius: 50%;
            font-size: 0.5rem;
            color: #ffc107 !important;
            box-shadow: none;
            opacity: 0.7;
            transition: opacity 0.2s ease;
          }

          .grid-item:hover .lock-badge-small,
          .list-item:hover .lock-badge-small {
            opacity: 1;
          }

          .pin-badge {
            color: #ffffff !important;
            opacity: 0.9;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* Star buttons transparent like search bar */
          .item-actions-inline button,
          button[aria-label*="star" i],
          button[aria-label*="favorite" i] {
            background: transparent !important;
            border: none !important;
            padding: 0.5rem !important;
            opacity: 0.7 !important;
            transition: opacity 0.2s ease !important;
          }

          .item-actions-inline button:hover,
          button[aria-label*="star" i]:hover,
          button[aria-label*="favorite" i]:hover {
            opacity: 1 !important;
            background: transparent !important;
          }

          .item-actions-inline button svg {
            opacity: 0.7;
            transition: opacity 0.2s ease;
          }

          .item-actions-inline button:hover svg {
            opacity: 1;
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
            opacity: 0;
            transition: opacity 0.2s ease;
          }

          .grid-item:hover .item-actions-inline,
          .list-item:hover .item-actions-inline {
            opacity: 1;
          }

          .star-button, .pin-button {
            background: transparent !important;
            border: none !important;
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            padding: 0.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            transition: all 0.2s ease;
            box-shadow: none !important;
          }

          .star-button:hover, .pin-button:hover {
            color: #ffffff;
            transform: scale(1.1);
            background: transparent !important;
          }

          .star-button .text-warning {
            color: #ffc107 !important;
            opacity: 1 !important;
          }

          .item-actions-inline .text-warning {
            opacity: 1 !important;
          }

          .grid-item:hover .item-actions-inline,
          .list-item:hover .item-actions-inline,
          .item-actions-inline:has(.text-warning) {
            opacity: 1;
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
                z-index: 100;
              }

              .item-dropdown :global(.dropdown-toggle) {
                background: none !important;
                border: none !important;
                padding: 0.5rem !important;
                color: rgba(255, 255, 255, 0.7) !important;
              }

              .item-dropdown :global(.dropdown-toggle:hover) {
                color: #ffffff !important;
                background: rgba(255, 255, 255, 0.1) !important;
                border-radius: 4px !important;
              }

              .item-dropdown :global(.dropdown-toggle::after) {
                display: none !important;
              }

          .item-dropdown :global(.dropdown-menu) {
            position: absolute !important;
            z-index: 9999 !important;
          }

          .three-dot-menu {
            padding: 0.25rem 0.5rem;
            color: rgba(255, 255, 255, 0.7);
            text-decoration: none;
          }

          .three-dot-menu:hover {
            color: #ffffff;
          }

          :global(.dropdown-menu) {
            min-width: 220px !important;
            max-height: 500px !important;
            overflow-y: auto !important;
            background-color: rgba(30, 30, 40, 0.98) !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            border-radius: 12px !important;
            padding: 0.5rem !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
          }

          :global(.dropdown-item) {
            color: rgba(255, 255, 255, 0.9) !important;
            padding: 0.65rem 1rem !important;
            border-radius: 8px !important;
            margin-bottom: 0.25rem !important;
            font-size: 0.95rem !important;
            display: flex !important;
            align-items: center !important;
            transition: all 0.2s ease !important;
          }

          :global(.dropdown-item:hover) {
            background-color: rgba(102, 126, 234, 0.2) !important;
            color: #ffffff !important;
          }

          :global(.dropdown-item.text-danger) {
            color: #ff6b6b !important;
          }

          :global(.dropdown-item.text-danger:hover) {
            background-color: rgba(255, 107, 107, 0.2) !important;
            color: #ff6b6b !important;
          }

          :global(.dropdown-item.text-warning) {
            color: #ffc107 !important;
          }

          :global(.dropdown-item.text-warning:hover) {
            background-color: rgba(255, 193, 7, 0.2) !important;
            color: #ffc107 !important;
          }

          :global(.dropdown-divider) {
            border-color: rgba(255, 255, 255, 0.1) !important;
            margin: 0.5rem 0 !important;
          }

          .items-list {
            max-width: 100%;
            margin: 0;
            overflow: visible;
            width: 100%;
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
            position: relative;
            overflow: visible;
            max-width: 100%;
          }

          @media (min-width: 1920px) {
            .list-item {
              padding: 1.25rem 2rem;
            }
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

          .item-actions {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            flex-shrink: 0;
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
              padding: 0.75rem;
            }

            /* Force list view layout on mobile */
            .items-list {
              gap: 0.5rem !important;
            }

            .list-item-row {
              padding: 0.75rem !important;
              min-height: auto !important;
            }

            .item-icon-wrapper {
              width: 40px !important;
              height: 40px !important;
            }

            .item-icon-wrapper :global(svg) {
              font-size: 32px !important;
            }

            .item-details {
              flex: 1 !important;
              min-width: 0 !important;
            }

            .item-name {
              font-size: 0.95rem !important;
              font-weight: 500 !important;
            }

            .item-meta {
              font-size: 0.75rem !important;
              margin-top: 0.25rem !important;
            }

            .list-item-actions {
              gap: 0.25rem !important;
            }

            .list-item-actions :global(.btn) {
              padding: 0.4rem 0.6rem !important;
              font-size: 0.8rem !important;
            }

            /* Grid fallback if somehow still used */
            .items-grid {
              grid-template-columns: 1fr !important;
              gap: 0.5rem;
            }

            .item-card {
              padding: 0.75rem !important;
              display: flex !important;
              flex-direction: row !important;
              align-items: center !important;
              gap: 0.75rem !important;
            }

            .item-card h6 {
              font-size: 0.9rem !important;
              margin: 0 !important;
            }

            .company-switcher, .action-bar, .navigation-tabs {
              display: none !important;
            }

            /* Quick Access Section Mobile */
            .quick-access-section {
              padding: 0.75rem !important;
              margin-bottom: 0.75rem !important;
            }

            .quick-access-section .section-header h3 {
              font-size: 1.1rem !important;
            }

            .quick-access-section .section-header {
              margin-bottom: 0.5rem !important;
            }

            .quick-access-section p {
              font-size: 0.8rem !important;
              margin-bottom: 0.75rem !important;
            }

            .quick-access-grid {
              display: flex !important;
              flex-direction: column !important;
              gap: 0.5rem !important;
            }

            .quick-access-item {
              display: flex !important;
              flex-direction: row !important;
              align-items: center !important;
              padding: 0.75rem !important;
              gap: 0.75rem !important;
              width: 100% !important;
              min-height: 60px !important;
            }

            .quick-access-item .item-icon {
              width: 40px !important;
              height: 40px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              flex-shrink: 0 !important;
              position: relative !important;
            }

            .quick-access-item .item-icon :global(svg) {
              font-size: 28px !important;
            }

            .quick-access-item .pin-badge {
              font-size: 10px !important;
              right: -2px !important;
              bottom: -2px !important;
            }

            .quick-access-item .lock-badge-small {
              font-size: 10px !important;
              left: -2px !important;
              bottom: -2px !important;
            }

            .quick-access-item .item-content {
              display: flex !important;
              flex-direction: column !important;
              flex: 1 !important;
              min-width: 0 !important;
            }

            .quick-access-item .item-name {
              font-size: 0.95rem !important;
              font-weight: 500 !important;
              text-align: left !important;
              margin: 0 !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }

            .quick-access-item .item-company {
              font-size: 0.75rem !important;
              margin-top: 0.15rem !important;
              text-align: left !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }

            .quick-access-collapsed {
              padding: 0.5rem 0.75rem !important;
            }

            .quick-access-collapsed button {
              font-size: 0.9rem !important;
              padding: 0.5rem 0.75rem !important;
            }

            .search-section, .breadcrumb-nav {
              padding: 0.75rem;
            }

            .search-section h4 {
              font-size: 1.1rem !important;
            }

            /* Optimize dropdowns for mobile */
            .item-dropdown :global(.dropdown-menu) {
              min-width: 180px !important;
              font-size: 0.9rem !important;
            }

            /* Mobile-friendly buttons */
            .mobile-doc-header :global(.btn) {
              padding: 0.5rem 0.75rem !important;
              font-size: 0.875rem !important;
            }

            /* Better touch targets for mobile */
            .list-item-row {
              min-height: 60px !important;
            }

            /* Hide less critical info on mobile */
            .breadcrumb-nav {
              font-size: 0.85rem !important;
            }

            /* Hide view toggle on mobile */
            .view-toggle {
              display: none !important;
            }
          }

          @media (min-width: 769px) {
            .mobile-doc-header {
              display: none;
            }
          }

          /* Password Modal Styles */
          :global(.password-modal .modal-content) {
            background: #1e1e28 !important;
            border: 1px solid rgba(102, 126, 234, 0.3) !important;
            border-radius: 16px !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
          }

          :global(.password-modal .modal-header) {
            padding: 2rem 2rem 1rem !important;
            background: transparent !important;
            border-bottom: none !important;
          }

          :global(.password-modal .modal-title) {
            gap: 1rem !important;
            width: 100% !important;
            color: #ffffff !important;
          }

          :global(.password-modal .modal-icon-wrapper) {
            width: 50px;
            height: 50px;
            border-radius: 12px;
            background: #667eea !important;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white !important;
            font-size: 1.5rem;
            flex-shrink: 0;
          }

          :global(.password-modal .modal-icon-wrapper.locked) {
            background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%) !important;
          }

          :global(.password-modal .modal-title-text) {
            font-size: 1.25rem !important;
            font-weight: 600 !important;
            color: #ffffff !important;
            margin-bottom: 0.25rem !important;
          }

          :global(.password-modal .modal-subtitle) {
            font-size: 0.875rem !important;
            color: rgba(255, 255, 255, 0.7) !important;
            font-weight: 400 !important;
          }

          :global(.password-modal .modal-body) {
            padding: 1rem 2rem 2rem !important;
            background: transparent !important;
          }

          :global(.password-modal .password-modal-content) {
            background: rgba(255, 255, 255, 0.05) !important;
            border-radius: 12px !important;
            padding: 1.5rem !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
          }

          :global(.password-modal .modal-description) {
            color: rgba(255, 255, 255, 0.9) !important;
            margin-bottom: 1.5rem !important;
            display: flex !important;
            align-items: center !important;
            font-size: 0.9rem !important;
          }

          :global(.password-modal .form-label) {
            color: rgba(255, 255, 255, 0.95) !important;
            font-weight: 500 !important;
            margin-bottom: 0.5rem !important;
            font-size: 0.9rem !important;
            display: block !important;
          }

          :global(.password-modal .password-input) {
            background: rgba(255, 255, 255, 0.1) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: #ffffff !important;
            padding: 0.75rem 1rem !important;
            border-radius: 8px !important;
            font-size: 1rem !important;
            transition: all 0.2s ease !important;
            width: 100% !important;
          }

          :global(.password-modal .password-input:focus) {
            background: rgba(255, 255, 255, 0.15) !important;
            border-color: #667eea !important;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3) !important;
            color: #ffffff !important;
            outline: none !important;
          }

          :global(.password-modal .password-input::placeholder) {
            color: rgba(255, 255, 255, 0.5) !important;
          }

          :global(.password-modal .modal-footer) {
            padding: 1rem 2rem 2rem !important;
            background: transparent !important;
            border-top: none !important;
          }

          :global(.password-modal .cancel-btn) {
            background: rgba(255, 255, 255, 0.1) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: rgba(255, 255, 255, 0.95) !important;
            padding: 0.65rem 1.5rem !important;
            border-radius: 8px !important;
            font-weight: 500 !important;
            transition: all 0.2s ease !important;
          }

          :global(.password-modal .cancel-btn:hover) {
            background: rgba(255, 255, 255, 0.2) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            color: #ffffff !important;
          }

          :global(.password-modal .submit-btn) {
            background: #667eea !important;
            border: none !important;
            color: #ffffff !important;
            padding: 0.65rem 1.5rem !important;
            border-radius: 8px !important;
            font-weight: 500 !important;
            transition: all 0.2s ease !important;
            display: flex !important;
            align-items: center !important;
            gap: 0.5rem !important;
          }

          :global(.password-modal .submit-btn:hover) {
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4) !important;
          }

          :global(.password-modal .btn-close) {
            filter: brightness(0) invert(1) !important;
            opacity: 0.7 !important;
          }

          :global(.password-modal .btn-close:hover) {
            opacity: 1 !important;
          }

          /* Move Modal Styles */
          :global(.move-modal .modal-content) {
            background: #1e1e28 !important;
            border: 1px solid rgba(102, 126, 234, 0.3) !important;
            border-radius: 16px !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
          }

          :global(.move-modal .modal-header) {
            padding: 2rem 2rem 1rem !important;
            background: transparent !important;
            border-bottom: none !important;
          }

          :global(.move-modal .modal-title) {
            gap: 1rem !important;
            width: 100% !important;
            color: #ffffff !important;
          }

          :global(.move-modal .modal-icon-wrapper) {
            width: 50px;
            height: 50px;
            border-radius: 12px;
            background: #667eea !important;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white !important;
            font-size: 1.5rem;
            flex-shrink: 0;
          }

          :global(.move-modal .modal-title-text) {
            font-size: 1.25rem !important;
            font-weight: 600 !important;
            color: #ffffff !important;
            margin-bottom: 0.25rem !important;
          }

          :global(.move-modal .modal-subtitle) {
            font-size: 0.875rem !important;
            color: rgba(255, 255, 255, 0.7) !important;
            font-weight: 400 !important;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          :global(.move-modal .modal-body) {
            padding: 1rem 2rem 2rem !important;
            background: transparent !important;
          }

          :global(.move-modal .move-modal-content) {
            background: rgba(255, 255, 255, 0.05) !important;
            border-radius: 12px !important;
            padding: 1.5rem !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
          }

          :global(.move-modal .form-label) {
            color: rgba(255, 255, 255, 0.95) !important;
            font-weight: 500 !important;
            margin-bottom: 0.75rem !important;
            font-size: 0.95rem !important;
            display: flex !important;
            align-items: center !important;
          }

          :global(.move-modal .move-select) {
            background: rgba(255, 255, 255, 0.1) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: #ffffff !important;
            padding: 0.75rem 1rem !important;
            border-radius: 8px !important;
            font-size: 1rem !important;
            transition: all 0.2s ease !important;
            width: 100% !important;
          }

          :global(.move-modal .move-select:focus) {
            background: rgba(255, 255, 255, 0.15) !important;
            border-color: #667eea !important;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3) !important;
            color: #ffffff !important;
            outline: none !important;
          }

          :global(.move-modal .move-select option) {
            background: #1e1e28 !important;
            color: #ffffff !important;
            padding: 0.5rem !important;
          }

          :global(.move-modal .help-text) {
            color: rgba(255, 255, 255, 0.6) !important;
            font-size: 0.85rem !important;
            margin-top: 0.5rem !important;
            display: block !important;
          }

          :global(.move-modal .section-divider) {
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 1.5rem 0;
          }

          :global(.move-modal .modal-footer) {
            padding: 1rem 2rem 2rem !important;
            background: transparent !important;
            border-top: none !important;
          }

          :global(.move-modal .cancel-btn) {
            background: rgba(255, 255, 255, 0.1) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: rgba(255, 255, 255, 0.95) !important;
            padding: 0.65rem 1.5rem !important;
            border-radius: 8px !important;
            font-weight: 500 !important;
            transition: all 0.2s ease !important;
          }

          :global(.move-modal .cancel-btn:hover) {
            background: rgba(255, 255, 255, 0.2) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            color: #ffffff !important;
          }

          :global(.move-modal .submit-btn) {
            background: #667eea !important;
            border: none !important;
            color: #ffffff !important;
            padding: 0.65rem 1.5rem !important;
            border-radius: 8px !important;
            font-weight: 500 !important;
            transition: all 0.2s ease !important;
            display: flex !important;
            align-items: center !important;
            gap: 0.5rem !important;
          }

          :global(.move-modal .submit-btn:hover) {
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4) !important;
          }

          :global(.move-modal .submit-btn:disabled) {
            background: rgba(255, 255, 255, 0.1) !important;
            color: rgba(255, 255, 255, 0.4) !important;
            cursor: not-allowed !important;
            transform: none !important;
            box-shadow: none !important;
          }

          :global(.move-modal .btn-close) {
            filter: brightness(0) invert(1) !important;
            opacity: 0.7 !important;
          }

          :global(.move-modal .btn-close:hover) {
            opacity: 1 !important;
          }

          /* Upload Modal Styles */
          :global(.upload-modal .modal-content),
          :global(.create-folder-modal .modal-content) {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
            border: 1px solid rgba(102, 126, 234, 0.3) !important;
            border-radius: 16px !important;
            overflow: hidden !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
          }

          :global(.upload-modal .modal-header-custom),
          :global(.create-folder-modal .modal-header-custom) {
            background: #667eea !important;
            border-bottom: none !important;
            padding: 1.5rem 2rem !important;
            color: white !important;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          :global(.upload-modal .modal-header-custom .btn-close),
          :global(.create-folder-modal .modal-header-custom .btn-close) {
            filter: brightness(0) invert(1) !important;
            opacity: 0.8 !important;
          }

          :global(.upload-modal .modal-header-custom .btn-close:hover),
          :global(.create-folder-modal .modal-header-custom .btn-close:hover) {
            opacity: 1 !important;
          }

          :global(.upload-modal .modal-title),
          :global(.create-folder-modal .modal-title) {
            font-size: 1.5rem !important;
            font-weight: 600 !important;
            color: white !important;
          }

          :global(.upload-modal .modal-icon-wrapper),
          :global(.create-folder-modal .modal-icon-wrapper) {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            font-size: 1.2rem;
          }

          :global(.upload-modal .modal-body-custom),
          :global(.create-folder-modal .modal-body-custom) {
            padding: 2rem !important;
            background: transparent !important;
          }

          :global(.upload-modal .form-label-custom),
          :global(.create-folder-modal .form-label-custom) {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: rgba(255, 255, 255, 0.9) !important;
            font-weight: 500 !important;
            font-size: 0.95rem !important;
            margin-bottom: 0.75rem !important;
          }

          :global(.upload-modal .label-icon),
          :global(.create-folder-modal .label-icon) {
            color: #667eea;
            font-size: 1rem;
          }

          :global(.upload-modal .form-control-custom),
          :global(.create-folder-modal .form-control-custom) {
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            border-radius: 10px !important;
            color: #ffffff !important;
            padding: 0.75rem 1rem !important;
            font-size: 0.95rem !important;
            transition: all 0.3s ease !important;
          }

          :global(.upload-modal .form-control-custom:focus),
          :global(.create-folder-modal .form-control-custom:focus) {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: #667eea !important;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2) !important;
            color: #ffffff !important;
          }

          :global(.upload-modal .form-control-custom::placeholder),
          :global(.create-folder-modal .form-control-custom::placeholder) {
            color: rgba(255, 255, 255, 0.4) !important;
          }

          :global(.upload-modal .selected-files-info),
          :global(.create-folder-modal .folder-hint) {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 1rem;
            padding: 0.75rem 1rem;
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 8px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.85rem;
          }

          :global(.upload-modal .selected-files-info svg),
          :global(.create-folder-modal .folder-hint svg) {
            color: #667eea;
            flex-shrink: 0;
          }

          :global(.upload-modal .modal-footer-custom),
          :global(.create-folder-modal .modal-footer-custom) {
            background: rgba(255, 255, 255, 0.03) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
            padding: 1.5rem 2rem !important;
            gap: 1rem !important;
            display: flex;
            justify-content: flex-end;
          }

          :global(.upload-modal .cancel-btn),
          :global(.create-folder-modal .cancel-btn) {
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: #ffffff !important;
            padding: 0.65rem 1.5rem !important;
            border-radius: 10px !important;
            font-weight: 500 !important;
            transition: all 0.3s ease !important;
          }

          :global(.upload-modal .cancel-btn:hover),
          :global(.create-folder-modal .cancel-btn:hover) {
            background: rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            transform: translateY(-1px) !important;
          }

          :global(.upload-modal .submit-btn),
          :global(.create-folder-modal .submit-btn) {
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

          :global(.upload-modal .submit-btn:hover:not(:disabled)),
          :global(.create-folder-modal .submit-btn:hover:not(:disabled)) {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
          }

          :global(.upload-modal .submit-btn:disabled),
          :global(.create-folder-modal .submit-btn:disabled) {
            opacity: 0.6 !important;
            cursor: not-allowed !important;
          }
        `}</style>

      {/* Memo Modal */}
      {selectedMemoItem && (
        <MemoModal
          show={showMemoModal}
          onHide={() => {
            setShowMemoModal(false);
            setSelectedMemoItem(null);
          }}
          documentId={selectedMemoItem.type === 'document' ? selectedMemoItem.item.id : undefined}
          folderId={selectedMemoItem.type === 'folder' ? selectedMemoItem.item.id : undefined}
          itemName={selectedMemoItem.item.name}
          itemType={selectedMemoItem.type}
        />
      )}
      </div>
    </DashboardLayout>
  );
}
