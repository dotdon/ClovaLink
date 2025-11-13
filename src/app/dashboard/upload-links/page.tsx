'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Alert } from 'react-bootstrap';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaPlus, FaCopy, FaTrash, FaUser, FaCalendar, FaLink } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { hasPermission, Permission } from '@/lib/permissions';

const CreateUploadLinkModal = dynamic(() => import('@/components/modals/CreateUploadLinkModal'), {
  ssr: false,
});

interface UploadLink {
  id: string;
  name: string;
  token: string;
  expiresAt: string;
  maxUses: number;
  useCount: number;
  used: boolean;
  employee: {
    name: string;
  };
}

export default function UploadLinksPage() {
  const { data: session } = useSession();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [links, setLinks] = useState<UploadLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const linksPerPage = 10;

  // Check permissions
  const canViewLinks = hasPermission(session, Permission.VIEW_UPLOAD_LINKS);
  const canCreateLinks = hasPermission(session, Permission.CREATE_UPLOAD_LINKS);

  // Pagination
  const indexOfLastLink = currentPage * linksPerPage;
  const indexOfFirstLink = indexOfLastLink - linksPerPage;
  const currentLinks = links.slice(indexOfFirstLink, indexOfLastLink);
  const totalPages = Math.ceil(links.length / linksPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const fetchLinks = async () => {
    try {
      const response = await fetch('/api/upload-links');
      if (!response.ok) throw new Error('Failed to fetch upload links');
      const data = await response.json();
      setLinks(data.data || []);
    } catch (error) {
      console.error('Error fetching upload links:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch upload links');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canViewLinks) {
      fetchLinks();
    } else {
      setIsLoading(false);
    }
  }, [canViewLinks]);

  const handleCreateLink = async (data: any) => {
    try {
      const response = await fetch('/api/upload-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to create upload link');
      }

      await fetchLinks();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating upload link:', error);
      throw error;
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      const response = await fetch(`/api/upload-links/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete upload link');
      }

      await fetchLinks();
    } catch (error) {
      console.error('Error deleting upload link:', error);
    }
  };

  const handleCopyLink = async (token: string) => {
    try {
      const baseUrl = window.location.origin;
      const uploadUrl = `${baseUrl}/upload/${token}`;
      await navigator.clipboard.writeText(uploadUrl);
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link. Please try again.');
    }
  };

  const getStatusBadge = (link: UploadLink) => {
    if (link.used) {
      return <Badge bg="secondary">Used</Badge>;
    }
    if (new Date(link.expiresAt) < new Date()) {
      return <Badge bg="danger">Expired</Badge>;
    }
    if (link.useCount >= link.maxUses) {
      return <Badge bg="warning">Limit Reached</Badge>;
    }
    return <Badge bg="success">Active</Badge>;
  };

  // Pagination component
  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="pagination-container">
        <Button 
          onClick={() => paginate(currentPage - 1)} 
          disabled={currentPage === 1}
          className="pagination-btn"
        >
          Previous
        </Button>
        
        <div className="pagination-pages">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
            <Button
              key={number}
              onClick={() => paginate(number)}
              className={`pagination-number ${currentPage === number ? 'active' : ''}`}
            >
              {number}
            </Button>
          ))}
        </div>
        
        <Button 
          onClick={() => paginate(currentPage + 1)} 
          disabled={currentPage === totalPages}
          className="pagination-btn"
        >
          Next
        </Button>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="upload-links-container">
        <div className="page-header">
          <div className="header-icon">
            <FaLink />
          </div>
          <div className="header-text">
            <h1>Upload Links</h1>
            <p className="header-subtitle">Create and manage secure upload links for external users</p>
          </div>
          {canCreateLinks && (
            <Button variant="primary" className="add-btn" onClick={() => setShowCreateModal(true)}>
              <FaPlus className="me-2" /> Create Upload Link
            </Button>
          )}
        </div>

        {!canViewLinks ? (
          <Alert variant="warning">
            You do not have permission to view upload links. Please contact your administrator for access.
          </Alert>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : (
          <>
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading upload links...</p>
              </div>
            ) : links.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <FaLink />
                </div>
                <h3>No Upload Links Yet</h3>
                <p>Create your first upload link to get started</p>
                {canCreateLinks && (
                  <Button className="gradient-btn mt-3" onClick={() => setShowCreateModal(true)}>
                    <FaPlus className="me-2" /> Create Upload Link
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="modern-table-container">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Created By</th>
                        <th>Token</th>
                        <th>Uses</th>
                        <th>Expires</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLinks.map((link) => (
                        <tr key={link.id} className="table-row">
                          <td className="link-name-cell">
                            <div className="name-with-icon">
                              <div className="small-icon">
                                <FaLink />
                              </div>
                              <span>{link.name || 'Unnamed Link'}</span>
                            </div>
                          </td>
                          <td>{getStatusBadge(link)}</td>
                          <td>{link.employee.name}</td>
                          <td>
                            <code className="token-code">{link.token.substring(0, 16)}...</code>
                          </td>
                          <td>
                            <span className="usage-text">{link.useCount} / {link.maxUses}</span>
                          </td>
                          <td>{new Date(link.expiresAt).toLocaleDateString()}</td>
                          <td>
                            <div className="table-actions">
                              <Button
                                size="sm"
                                className="action-btn-sm copy-btn-sm"
                                onClick={() => handleCopyLink(link.token)}
                              >
                                <FaCopy />
                              </Button>
                              <Button
                                size="sm"
                                className="action-btn-sm delete-btn-sm"
                                onClick={() => handleDeleteLink(link.id)}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination />
              </>
            )}
          </>
        )}

        <div className="info-section">
          <div className="info-card-modern">
            <div className="info-header">
              <div className="info-icon">
                <FaLink />
              </div>
              <h5>About Upload Links</h5>
            </div>
            <div className="info-content">
              <p className="info-intro">Upload links allow you to:</p>
              <ul className="info-list">
                <li>
                  <span className="list-icon">✓</span>
                  <span>Create secure, temporary links for external users to upload documents</span>
                </li>
                <li>
                  <span className="list-icon">✓</span>
                  <span>Set expiration dates and usage limits</span>
                </li>
                <li>
                  <span className="list-icon">✓</span>
                  <span>Track usage and manage active links</span>
                </li>
                <li>
                  <span className="list-icon">✓</span>
                  <span>Automatically scan uploaded documents for security</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {canCreateLinks && (
          <CreateUploadLinkModal
            show={showCreateModal}
            onHide={() => setShowCreateModal(false)}
            onSubmit={handleCreateLink}
          />
        )}

        <style jsx>{`
          .upload-links-container {
            padding: 1rem;
          }

          /* Page Header */
          .page-header {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            margin-bottom: 2rem;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 16px;
            padding: 1.75rem 2rem;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(102, 126, 234, 0.2);
          }

          .page-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
            background-size: 200% 100%;
            animation: shimmer 3s linear infinite;
          }

          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }

          .header-icon {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: white;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            position: relative;
          }

          

          .header-text {
            flex: 1;
            min-width: 0;
          }

          .page-header h1 {
            margin: 0;
            font-size: 1.75rem;
            font-weight: 700;
            color: #ffffff !important;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          }

          .header-subtitle {
            margin: 0.35rem 0 0 0;
            color: rgba(255, 255, 255, 0.75) !important;
            font-size: 0.95rem;
            font-weight: 400;
          }

          :global(.add-btn) {
            background: #667eea !important;
            border: none !important;
            padding: 0.75rem 1.75rem !important;
            border-radius: 12px !important;
            font-weight: 600 !important;
            font-size: 0.95rem !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3) !important;
            color: white !important;
            margin-left: auto !important;
            position: relative;
            overflow: hidden;
          }

          

          

          :global(.add-btn:hover) {
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
          }

          :global(.add-btn:active) {
            transform: translateY(-1px) scale(0.98) !important;
          }

          /* Modern Table */
          .modern-table-container {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 16px;
            padding: 1.5rem;
            overflow-x: auto;
            margin-bottom: 1.5rem;
          }

          .modern-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
          }

          .modern-table thead {
            background: rgba(102, 126, 234, 0.15);
            border-radius: 12px;
          }

          .modern-table thead th {
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            font-size: 0.9rem;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid rgba(102, 126, 234, 0.3);
            white-space: nowrap;
          }

          .modern-table thead th:first-child {
            border-top-left-radius: 12px;
            padding-left: 1.5rem;
          }

          .modern-table thead th:last-child {
            border-top-right-radius: 12px;
            padding-right: 1.5rem;
          }

          .modern-table tbody tr {
            transition: all 0.3s ease;
            border-bottom: 1px solid rgba(102, 126, 234, 0.1);
          }

          .modern-table tbody tr:hover {
            background: rgba(102, 126, 234, 0.1);
            transform: scale(1.01);
          }

          .modern-table tbody td {
            padding: 1rem;
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.95rem;
          }

          .modern-table tbody td:first-child {
            padding-left: 1.5rem;
          }

          .modern-table tbody td:last-child {
            padding-right: 1.5rem;
          }

          .name-with-icon {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .small-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.85rem;
            flex-shrink: 0;
          }

          .link-name-cell {
            font-weight: 600;
            color: #ffffff !important;
          }

          .token-code {
            background: rgba(102, 126, 234, 0.15);
            padding: 0.35rem 0.75rem;
            border-radius: 6px;
            font-size: 0.85rem;
            color: #667eea;
            font-family: 'Courier New', monospace;
            border: 1px solid rgba(102, 126, 234, 0.3);
          }

          .usage-text {
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
          }

          .table-actions {
            display: flex;
            gap: 0.5rem;
          }

          :global(.action-btn-sm) {
            width: 36px !important;
            height: 36px !important;
            padding: 0 !important;
            border-radius: 8px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border: none !important;
            transition: all 0.3s ease !important;
          }

          :global(.copy-btn-sm) {
            background: #667eea !important;
            color: white !important;
          }

          :global(.copy-btn-sm:hover) {
            transform: scale(1.1) !important;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.6) !important;
          }

          :global(.delete-btn-sm) {
            background: rgba(220, 53, 69, 0.15) !important;
            color: #dc3545 !important;
            border: 1px solid rgba(220, 53, 69, 0.3) !important;
          }

          :global(.delete-btn-sm:hover) {
            background: rgba(220, 53, 69, 0.3) !important;
            transform: scale(1.1) !important;
          }

          /* Pagination */
          .pagination-container {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1rem;
            margin-top: 1.5rem;
          }

          .pagination-pages {
            display: flex;
            gap: 0.5rem;
          }

          :global(.pagination-btn) {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%) !important;
            border: 1px solid rgba(102, 126, 234, 0.3) !important;
            color: rgba(255, 255, 255, 0.9) !important;
            padding: 0.65rem 1.25rem !important;
            border-radius: 10px !important;
            font-weight: 600 !important;
            transition: all 0.3s ease !important;
          }

          :global(.pagination-btn:hover:not(:disabled)) {
            background: #667eea !important;
            border-color: #667eea !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
          }

          :global(.pagination-btn:disabled) {
            opacity: 0.4 !important;
            cursor: not-allowed !important;
          }

          :global(.pagination-number) {
            width: 40px !important;
            height: 40px !important;
            padding: 0 !important;
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(102, 126, 234, 0.2) !important;
            color: rgba(255, 255, 255, 0.7) !important;
            border-radius: 10px !important;
            font-weight: 600 !important;
            transition: all 0.3s ease !important;
          }

          :global(.pagination-number.active) {
            background: #667eea !important;
            border-color: #667eea !important;
            color: white !important;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
          }

          :global(.pagination-number:hover:not(.active)) {
            background: rgba(102, 126, 234, 0.2) !important;
            border-color: rgba(102, 126, 234, 0.4) !important;
            color: rgba(255, 255, 255, 0.9) !important;
          }

          /* Empty State */
          .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 16px;
          }

          .empty-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(102, 126, 234, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            color: #667eea;
            margin: 0 auto 1.5rem;
          }

          .empty-state h3 {
            color: #ffffff;
            margin-bottom: 0.5rem;
            font-size: 1.5rem;
          }

          .empty-state p {
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 1.5rem;
          }

          /* Loading State */
          .loading-state {
            text-align: center;
            padding: 4rem 2rem;
          }

          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(102, 126, 234, 0.2);
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .loading-state p {
            color: rgba(255, 255, 255, 0.6);
          }

          /* Gradient Button */
          :global(.gradient-btn) {
            background: #667eea !important;
            border: none !important;
            padding: 0.75rem 1.5rem !important;
            border-radius: 10px !important;
            font-weight: 600 !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3) !important;
            color: white !important;
            position: relative;
            overflow: hidden;
          }

          

          

          :global(.gradient-btn:hover) {
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
          }

          /* Info Section */
          .info-section {
            margin-top: 2rem;
          }

          .info-card-modern {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 16px;
            padding: 0;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(102, 126, 234, 0.15);
            transition: all 0.3s ease;
          }

          .info-card-modern:hover {
            border-color: rgba(102, 126, 234, 0.4);
            box-shadow: 0 12px 40px rgba(102, 126, 234, 0.2);
            transform: translateY(-2px);
          }

          .info-header {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.1) 100%);
            border-bottom: 1px solid rgba(102, 126, 234, 0.2);
            padding: 1.5rem 2rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .info-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            color: white;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }

          .info-header h5 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
            color: #ffffff !important;
            display: flex;
            align-items: center;
          }

          .info-content {
            padding: 1.5rem 2rem;
          }

          .info-intro {
            color: rgba(255, 255, 255, 0.9) !important;
            font-size: 1rem;
            font-weight: 500;
            margin-bottom: 1rem;
          }

          .info-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .info-list li {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            color: rgba(255, 255, 255, 0.85);
            font-size: 0.95rem;
            line-height: 1.6;
            padding: 0.5rem 0;
          }

          .list-icon {
            color: #667eea;
            font-weight: 700;
            font-size: 1.1rem;
            flex-shrink: 0;
            margin-top: 0.1rem;
            background: rgba(102, 126, 234, 0.15);
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(102, 126, 234, 0.3);
          }

          .info-list li span:last-child {
            flex: 1;
            color: rgba(255, 255, 255, 0.85);
          }

          /* Mobile Styles */
        @media (max-width: 1023px) {
          .upload-links-container {
            padding: 0.5rem;
          }

          .page-header {
            flex-direction: column;
            align-items: center;
            padding: 1rem !important;
            margin-bottom: 1rem !important;
            gap: 0.75rem !important;
          }

          .header-icon {
            width: 42px !important;
            height: 42px !important;
            font-size: 1.1rem !important;
          }

          .header-text {
            text-align: center;
            width: 100%;
          }

          .page-header h1 {
            font-size: 1.35rem !important;
          }

          .header-subtitle {
            font-size: 0.8rem !important;
          }

          :global(.add-btn) {
            width: 100% !important;
            margin-left: 0 !important;
            padding: 0.7rem 1rem !important;
            font-size: 0.9rem !important;
          }

            .modern-table-container {
              padding: 0.75rem;
              overflow-x: scroll;
            }

            .modern-table {
              font-size: 0.85rem;
            }

            .modern-table thead th {
              padding: 0.75rem 0.5rem;
              font-size: 0.75rem;
            }

            .modern-table thead th:first-child {
              padding-left: 0.75rem;
            }

            .modern-table thead th:last-child {
              padding-right: 0.75rem;
            }

            .modern-table tbody td {
              padding: 0.75rem 0.5rem;
              font-size: 0.85rem;
            }

            .modern-table tbody td:first-child {
              padding-left: 0.75rem;
            }

            .modern-table tbody td:last-child {
              padding-right: 0.75rem;
            }

            .small-icon {
              width: 28px;
              height: 28px;
              font-size: 0.75rem;
            }

            .name-with-icon {
              gap: 0.5rem;
              font-size: 0.85rem;
            }

            .token-code {
              font-size: 0.75rem;
              padding: 0.25rem 0.5rem;
            }

            .table-actions {
              gap: 0.35rem;
            }

            :global(.action-btn-sm) {
              width: 32px !important;
              height: 32px !important;
            }

            .pagination-container {
              flex-direction: column;
              gap: 0.75rem;
            }

            .pagination-pages {
              flex-wrap: wrap;
              justify-content: center;
            }

            :global(.pagination-btn) {
              padding: 0.5rem 0.85rem !important;
              font-size: 0.85rem !important;
            }

            :global(.pagination-number) {
              width: 36px !important;
              height: 36px !important;
              font-size: 0.85rem !important;
            }

            .empty-state {
              padding: 3rem 1.5rem;
            }

            .empty-icon {
              width: 64px;
              height: 64px;
              font-size: 2rem;
              margin-bottom: 1rem;
            }

            .empty-state h3 {
              font-size: 1.25rem;
            }

            .info-section {
              margin-top: 1.5rem;
            }

            .info-card-modern {
              border-radius: 12px !important;
            }

            .info-header {
              padding: 1rem 1.25rem !important;
              flex-direction: column;
              align-items: flex-start;
              gap: 0.75rem;
            }

            .info-icon {
              width: 40px;
              height: 40px;
              font-size: 1.1rem;
            }

            .info-header h5 {
              font-size: 1.1rem !important;
            }

            .info-content {
              padding: 1rem 1.25rem !important;
            }

            .info-intro {
              font-size: 0.9rem !important;
            }

            .info-list li {
              font-size: 0.875rem;
              gap: 0.5rem;
            }

            .list-icon {
              width: 20px;
              height: 20px;
              font-size: 0.9rem;
            }
          }

          /* Desktop Styles */
          @media (min-width: 1024px) {
            .upload-links-container {
              padding: 2rem;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
} 