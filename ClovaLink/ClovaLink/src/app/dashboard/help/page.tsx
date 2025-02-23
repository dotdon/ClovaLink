'use client';

import React from 'react';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { Card, Accordion } from 'react-bootstrap';
import { FaUserShield, FaFolderOpen, FaShareAlt, FaKey } from 'react-icons/fa';

export default function HelpPage() {
  return (
    <DashboardLayout>
      <div className="help-container">
        <div className="help-header">
          <h1>Getting Started</h1>
          <p className="text-muted">Learn how to use ClovaLink effectively</p>
        </div>

        <div className="quick-start-section">
          <h2>Quick Start Guide</h2>
          <div className="guide-cards">
            <Card className="guide-card">
              <Card.Body>
                <div className="guide-icon">
                  <FaUserShield />
                </div>
                <h3>User Roles</h3>
                <p>Understand the different user roles and their permissions in the system.</p>
              </Card.Body>
            </Card>

            <Card className="guide-card">
              <Card.Body>
                <div className="guide-icon">
                  <FaFolderOpen />
                </div>
                <h3>Document Management</h3>
                <p>Learn how to organize documents in folders, manage upload links, and handle document permissions.</p>
              </Card.Body>
            </Card>

            <Card className="guide-card">
              <Card.Body>
                <div className="guide-icon">
                  <FaShareAlt />
                </div>
                <h3>Sharing & Upload Links</h3>
                <p>Create temporary links for secure document sharing and receiving uploads from external users.</p>
              </Card.Body>
            </Card>

            <Card className="guide-card">
              <Card.Body>
                <div className="guide-icon">
                  <FaKey />
                </div>
                <h3>Security</h3>
                <p>Best practices for keeping your documents secure.</p>
              </Card.Body>
            </Card>
          </div>
        </div>

        <div className="faq-section">
          <h2>Frequently Asked Questions</h2>
          <Accordion>
            <Accordion.Item eventKey="0">
              <Accordion.Header>What are the different user roles?</Accordion.Header>
              <Accordion.Body>
                <p>ClovaLink has three user roles with different permissions:</p>
                <ul>
                  <li><strong>Admin:</strong> Full system access, can manage users, view all documents, and access system settings.</li>
                  <li><strong>Manager:</strong> Can manage documents, create folders, and generate sharing links for their company.</li>
                  <li><strong>User:</strong> Basic access to upload, download, and share documents within their assigned folders.</li>
                </ul>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="1">
              <Accordion.Header>How do I organize documents?</Accordion.Header>
              <Accordion.Body>
                <p>You can organize documents in several ways:</p>
                <ul>
                  <li>Create folders and subfolders to categorize documents</li>
                  <li>Drag and drop documents between folders</li>
                  <li>Use the search function to find documents quickly</li>
                  <li>Sort documents by name, date, or size</li>
                  <li>Create named upload links that automatically organize uploads into specific folders</li>
                  <li>Move multiple documents at once using bulk selection</li>
                  <li>Delete folders and their contents with a single action</li>
                </ul>
                <p><strong>Folder Management Tips:</strong></p>
                <ul>
                  <li>Give folders descriptive names for easy navigation</li>
                  <li>Use the breadcrumb navigation to move between folder levels</li>
                  <li>Right-click folders for quick actions like rename, delete, or share</li>
                </ul>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="2">
              <Accordion.Header>How do I share documents securely?</Accordion.Header>
              <Accordion.Body>
                <p>There are two ways to share documents:</p>
                <h5>1. Download Links</h5>
                <ol>
                  <li>Select a document or folder</li>
                  <li>Click the share icon</li>
                  <li>Set an expiration date for the link (1-30 days)</li>
                  <li>Copy and share the generated link</li>
                </ol>
                <h5>2. Upload Links</h5>
                <ol>
                  <li>Go to the Upload Links section</li>
                  <li>Click "Create Upload Link"</li>
                  <li>Set a name for the destination folder (optional)</li>
                  <li>Configure maximum uses and expiration</li>
                  <li>Share the link with external users</li>
                </ol>
                <p><strong>Security Features:</strong></p>
                <ul>
                  <li>All links automatically expire after their set period</li>
                  <li>Upload links can be limited to a specific number of uses</li>
                  <li>Links can be manually deactivated at any time</li>
                  <li>Uploaded files are automatically scanned for security</li>
                  <li>Activity tracking for all shared link usage</li>
                </ul>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="3">
              <Accordion.Header>What file types are supported?</Accordion.Header>
              <Accordion.Body>
                <p>ClovaLink supports a wide range of file types, including:</p>
                <ul>
                  <li>Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT</li>
                  <li>Images: JPG, JPEG, PNG, GIF, SVG</li>
                  <li>Archives: ZIP, RAR, 7Z</li>
                  <li>Other: CSV, JSON, XML</li>
                </ul>
                <p><strong>Upload Restrictions:</strong></p>
                <ul>
                  <li>Maximum file size is set by your administrator</li>
                  <li>Executable files (.exe, .bat, etc.) are not allowed</li>
                  <li>Files are scanned for malware upon upload</li>
                </ul>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="4">
              <Accordion.Header>How are activities tracked?</Accordion.Header>
              <Accordion.Body>
                <p>The system automatically logs various activities:</p>
                <ul>
                  <li>Document uploads and downloads</li>
                  <li>Folder creation, modification, and deletion</li>
                  <li>Share link generation and usage</li>
                  <li>Upload link creation and utilization</li>
                  <li>Document moves and deletions</li>
                  <li>User access and authentication</li>
                </ul>
                <p><strong>Activity Reports:</strong></p>
                <ul>
                  <li>View recent activities on the dashboard</li>
                  <li>Export activity logs for compliance</li>
                  <li>Filter activities by type, user, or date</li>
                  <li>Track upload link usage and expiration</li>
                  <li>Monitor document access patterns</li>
                </ul>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="5">
              <Accordion.Header>What security measures are in place?</Accordion.Header>
              <Accordion.Body>
                <p>ClovaLink implements comprehensive security measures:</p>
                <ul>
                  <li>Secure user authentication and role-based access control</li>
                  <li>Encrypted file storage and transfer</li>
                  <li>Temporary, expiring download and upload links</li>
                  <li>Detailed activity logging and monitoring</li>
                  <li>Company data isolation</li>
                  <li>Automatic malware scanning for uploads</li>
                  <li>Regular security updates</li>
                </ul>
                <p><strong>Role-Based Permissions:</strong></p>
                <ul>
                  <li>Admins: Full system access and user management</li>
                  <li>Managers: Document and team management within their company</li>
                  <li>Users: Basic document access and sharing capabilities</li>
                </ul>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="6">
              <Accordion.Header>How do upload links work?</Accordion.Header>
              <Accordion.Body>
                <p>Upload links allow external users to securely upload files to your system:</p>
                <ul>
                  <li>Create links with custom folder names for automatic organization</li>
                  <li>Set maximum usage limits and expiration dates</li>
                  <li>Track upload activity and link status</li>
                  <li>Automatically scan uploaded files for security</li>
                </ul>
                <p><strong>Best Practices:</strong></p>
                <ul>
                  <li>Use descriptive folder names for better organization</li>
                  <li>Set appropriate expiration dates based on need</li>
                  <li>Monitor link usage through the dashboard</li>
                  <li>Delete unused or expired links regularly</li>
                </ul>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </div>

        <style jsx>{`
          .help-container {
            max-width: 100%;
            padding: 2rem;
            overflow-x: hidden;
          }

          .help-header {
            margin-bottom: 2rem;
          }

          .help-header h1 {
            margin-bottom: 0.5rem;
            font-size: 2rem;
          }

          .quick-start-section {
            margin-bottom: 3rem;
          }

          .quick-start-section h2,
          .faq-section h2 {
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
          }

          .guide-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
          }

          :global(.guide-card) {
            border: none;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          :global(.guide-card:hover) {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }

          .guide-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: rgba(13, 110, 253, 0.1);
            color: #0d6efd;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            margin-bottom: 1rem;
          }

          :global(.guide-card h3) {
            font-size: 1.25rem;
            margin-bottom: 0.75rem;
          }

          :global(.guide-card p) {
            color: #6c757d;
            margin: 0;
            font-size: 0.875rem;
          }

          .faq-section {
            max-width: 800px;
          }

          :global(.accordion-button) {
            font-weight: 500;
          }

          :global(.accordion-body) {
            padding: 1.25rem;
          }

          :global(.accordion-body ul),
          :global(.accordion-body ol) {
            padding-left: 1.25rem;
            margin-bottom: 0;
          }

          :global(.accordion-body li) {
            margin-bottom: 0.5rem;
          }

          :global(.accordion-body li:last-child) {
            margin-bottom: 0;
          }

          /* Mobile styles */
          @media (max-width: 767px) {
            .help-container {
              padding: 1rem;
            }

            .help-header h1 {
              font-size: 1.5rem;
            }

            .quick-start-section h2,
            .faq-section h2 {
              font-size: 1.25rem;
            }

            .guide-cards {
              grid-template-columns: 1fr;
              gap: 1rem;
            }

            .guide-icon {
              width: 40px;
              height: 40px;
              font-size: 1.25rem;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
} 