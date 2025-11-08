'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Alert } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaPlus, FaCopy, FaTrash, FaUser, FaCalendar, FaLink } from 'react-icons/fa';
import CreateUploadLinkModal from '@/components/modals/CreateUploadLinkModal';
import { useSession } from 'next-auth/react';
import { hasPermission, Permission } from '@/lib/permissions';

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

        <Card className="info-card mt-4">
          <Card.Header>
            <h5 className="mb-0">About Upload Links</h5>
          </Card.Header>
          <Card.Body>
            <p>Upload links allow you to:</p>
            <ul>
              <li>Create secure, temporary links for external users to upload documents</li>
              <li>Set expiration dates and usage limits</li>
              <li>Track usage and manage active links</li>
              <li>Automatically scan uploaded documents for security</li>
            </ul>
          </Card.Body>
        </Card>

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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: white;
            flex-shrink: 0;
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
            position: relative;
          }

          .header-icon::after {
            content: '';
            position: absolute;
            inset: -2px;
            border-radius: 16px;
            padding: 2px;
            background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1));
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border: none !important;
            padding: 0.75rem 1.75rem !important;
            border-radius: 12px !important;
            font-weight: 600 !important;
            font-size: 0.95rem !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.5) !important;
            color: white !important;
            margin-left: auto !important;
            position: relative;
            overflow: hidden;
          }

          :global(.add-btn::before) {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
          }

          :global(.add-btn:hover::before) {
            width: 300px;
            height: 300px;
          }

          :global(.add-btn:hover) {
            transform: translateY(-3px) scale(1.02) !important;
            box-shadow: 0 8px 30px rgba(102, 126, 234, 0.7) !important;
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border-color: #667eea !important;
            transform: translateY(-2px) !important;
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
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
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border: none !important;
            padding: 0.75rem 1.5rem !important;
            border-radius: 10px !important;
            font-weight: 600 !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
            color: white !important;
            position: relative;
            overflow: hidden;
          }

          :global(.gradient-btn::before) {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
          }

          :global(.gradient-btn:hover::before) {
            width: 300px;
            height: 300px;
          }

          :global(.gradient-btn:hover) {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
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

            :global(.info-card) {
              border-radius: 12px !important;
              background: rgba(255, 255, 255, 0.03) !important;
              border: 1px solid rgba(102, 126, 234, 0.2) !important;
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