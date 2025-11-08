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

  // Check permissions
  const canViewLinks = hasPermission(session, Permission.VIEW_UPLOAD_LINKS);
  const canCreateLinks = hasPermission(session, Permission.CREATE_UPLOAD_LINKS);

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

  // Mobile upload link card component
  const UploadLinkCard = ({ link }: { link: UploadLink }) => (
    <Card className="upload-link-card mb-3">
      <Card.Body>
        <div className="link-header">
          <h3 className="link-name">{link.name || 'Unnamed Link'}</h3>
          {getStatusBadge(link)}
        </div>
        
        <div className="link-details">
          <div className="detail">
            <FaUser className="detail-icon" />
            <span>Created by {link.employee.name}</span>
          </div>
          <div className="detail">
            <FaCalendar className="detail-icon" />
            <span>Expires: {new Date(link.expiresAt).toLocaleDateString()}</span>
          </div>
          <div className="detail">
            <FaLink className="detail-icon" />
            <span>Uses: {link.useCount} / {link.maxUses}</span>
          </div>
        </div>

        <div className="link-token">
          <code className="token-text">{link.token.substring(0, 16)}...</code>
        </div>

        <div className="link-actions">
          <Button
            variant="outline-primary"
            size="sm"
            className="me-2"
            onClick={() => handleCopyLink(link.token)}
          >
            <FaCopy className="me-1" /> Copy
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => handleDeleteLink(link.id)}
          >
            <FaTrash className="me-1" /> Delete
          </Button>
        </div>
      </Card.Body>
    </Card>
  );

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
            {/* Desktop View */}
            <div className="desktop-view">
              <Card>
                <Card.Body>
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Created By</th>
                        <th>Link</th>
                        <th>Status</th>
                        <th>Uses</th>
                        <th>Expires</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={7} className="text-center">Loading...</td>
                        </tr>
                      ) : links.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center">No upload links created yet</td>
                        </tr>
                      ) : (
                        links.map((link) => (
                          <tr key={link.id}>
                            <td>{link.name || 'Unnamed Link'}</td>
                            <td>{link.employee.name}</td>
                            <td>
                              <code className="small">{link.token.substring(0, 16)}...</code>
                            </td>
                            <td>{getStatusBadge(link)}</td>
                            <td>
                              {link.useCount} / {link.maxUses}
                            </td>
                            <td>{new Date(link.expiresAt).toLocaleDateString()}</td>
                            <td>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="me-2"
                                onClick={() => handleCopyLink(link.token)}
                              >
                                <FaCopy /> Copy
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteLink(link.id)}
                              >
                                <FaTrash /> Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </div>

            {/* Mobile View */}
            <div className="mobile-view">
              {isLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : links.length === 0 ? (
                <div className="text-center py-4">No upload links created yet</div>
              ) : (
                links.map((link) => (
                  <UploadLinkCard key={link.id} link={link} />
                ))
              )}
            </div>
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

          /* Mobile Styles */
          @media (max-width: 1023px) {
            .upload-links-container {
              padding: 0.5rem;
            }

            .page-header {
              padding: 0.5rem;
              margin-bottom: 1rem;
              flex-wrap: wrap;
              gap: 1rem;
            }

            .page-header h1 {
              font-size: 1.5rem;
              width: 100%;
            }

            .page-header button {
              width: 100%;
            }

            .desktop-view {
              display: none;
            }

            .mobile-view {
              display: block;
              padding: 0.5rem;
            }

            :global(.upload-link-card) {
              border: none;
              border-radius: 12px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }

            :global(.link-header) {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 1rem;
            }

            :global(.link-name) {
              font-size: 1.125rem;
              margin: 0;
              font-weight: 600;
            }

            :global(.link-details) {
              display: flex;
              flex-direction: column;
              gap: 0.5rem;
              margin-bottom: 1rem;
            }

            :global(.detail) {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              color: #6c757d;
              font-size: 0.875rem;
            }

            :global(.detail-icon) {
              color: #0d6efd;
              font-size: 1rem;
            }

            :global(.link-token) {
              background: #f8f9fa;
              padding: 0.5rem;
              border-radius: 6px;
              margin-bottom: 1rem;
            }

            :global(.token-text) {
              font-size: 0.875rem;
              color: #495057;
            }

            :global(.link-actions) {
              display: flex;
              gap: 0.5rem;
            }

            :global(.info-card) {
              border: none;
              border-radius: 12px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
          }

          /* Desktop Styles */
          @media (min-width: 1024px) {
            .upload-links-container {
              padding: 2rem;
            }

            .mobile-view {
              display: none;
            }

            .desktop-view {
              display: block;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
} 