'use client';

import React from 'react';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { Card, Accordion } from 'react-bootstrap';
import { FaUserShield, FaFolderOpen, FaShareAlt, FaKey, FaArrowsAlt, FaStar, FaLock, FaThumbtack } from 'react-icons/fa';

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

            <Card className="guide-card">
              <Card.Body>
                <div className="guide-icon">
                  <FaArrowsAlt />
                </div>
                <h3>Move & Organize</h3>
                <p>Move files and folders within or across companies with the advanced move modal.</p>
              </Card.Body>
            </Card>

            <Card className="guide-card">
              <Card.Body>
                <div className="guide-icon">
                  <FaStar />
                </div>
                <h3>Quick Access</h3>
                <p>Pin folders and star important items for instant access.</p>
              </Card.Body>
            </Card>

            <Card className="guide-card">
              <Card.Body>
                <div className="guide-icon">
                  <FaLock />
                </div>
                <h3>Password Protection</h3>
                <p>Add an extra layer of security with document and folder passwords.</p>
              </Card.Body>
            </Card>

            <Card className="guide-card">
              <Card.Body>
                <div className="guide-icon">
                  <FaThumbtack />
                </div>
                <h3>Favorites & Pins</h3>
                <p>Organize with starred items and pinned folders for efficient workflow.</p>
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
                  <li>Create folders and subfolders with unlimited nesting depth</li>
                  <li>Drag and drop documents and folders between locations</li>
                  <li>Use the <strong>"Move to..."</strong> option for precise placement</li>
                  <li>Pin frequently used folders to Quick Access for instant navigation</li>
                  <li>Star important files and folders for easy access in the Starred tab</li>
                  <li>Toggle between Grid and List views for optimal browsing</li>
                  <li>Use the search function to find documents quickly</li>
                  <li>Sort documents by name, date, or file size</li>
                </ul>
                <p><strong>Advanced Move Features:</strong></p>
                <ul>
                  <li>Move files and folders within your company</li>
                  <li>Move items across companies (if you have multi-company access)</li>
                  <li>Move items to root (top level) to remove them from folders</li>
                  <li>See full folder paths when moving (Parent / Child / Grandchild)</li>
                  <li>The system prevents circular folder moves automatically</li>
                </ul>
                <p><strong>Quick Access & Favorites:</strong></p>
                <ul>
                  <li>Pin folders to display them in the Quick Access section at the top</li>
                  <li>Star documents and folders to access them from the Starred tab</li>
                  <li>Use breadcrumb navigation to jump between folder levels</li>
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
                  <li>Secure user authentication with 2FA and passkey support</li>
                  <li>Role-based access control with granular permissions</li>
                  <li>Document and folder password protection</li>
                  <li>Encrypted file storage and transfer</li>
                  <li>Temporary, expiring download and upload links</li>
                  <li>Detailed activity logging and monitoring</li>
                  <li>Company data isolation with cross-company access control</li>
                  <li>Automatic malware scanning for uploads</li>
                  <li>Regular security updates</li>
                </ul>
                <p><strong>Password Protection Features:</strong></p>
                <ul>
                  <li>Add passwords to individual documents and folders</li>
                  <li>Users must enter password to access protected items</li>
                  <li>Passwords are securely hashed and stored</li>
                  <li>Administrators can remove password protection</li>
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

            <Accordion.Item eventKey="7">
              <Accordion.Header>How do I move files and folders?</Accordion.Header>
              <Accordion.Body>
                <p>ClovaLink offers powerful file and folder moving capabilities:</p>
                <h5>Using the Move Modal:</h5>
                <ol>
                  <li>Click the three-dot menu (⋮) on any file or folder</li>
                  <li>Select "Move to..."</li>
                  <li>Choose your destination folder from the dropdown</li>
                  <li>Select "Root" to move items to the top level (out of folders)</li>
                  <li>If you have multi-company access, change the company in the lower section</li>
                  <li>Click "Move" to complete the action</li>
                </ol>
                <p><strong>Move Features:</strong></p>
                <ul>
                  <li>View all folders with full paths (Parent / Child / Grandchild)</li>
                  <li>Move within the same company or across companies</li>
                  <li>Move multiple items by selecting them first</li>
                  <li>The system prevents moving folders into themselves</li>
                  <li>Drag and drop is also available for quick moves</li>
                </ul>
                <p><strong>Cross-Company Moves:</strong></p>
                <ul>
                  <li>Available if you have access to multiple companies</li>
                  <li>Documents transfer ownership to the target company</li>
                  <li>All moves are logged in the activity tracker</li>
                  <li>Permissions are preserved during the move</li>
                </ul>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="8">
              <Accordion.Header>What's the difference between Pinning and Starring?</Accordion.Header>
              <Accordion.Body>
                <p>Both features help you organize and access important items quickly:</p>
                <h5>Pinning (Folders Only):</h5>
                <ul>
                  <li>Click the pin icon on any folder</li>
                  <li>Pinned folders appear in the "Quick Access" section at the top</li>
                  <li>Perfect for folders you access frequently</li>
                  <li>Provides instant navigation without browsing</li>
                  <li>Only works with folders, not individual documents</li>
                </ul>
                <h5>Starring (Files and Folders):</h5>
                <ul>
                  <li>Click the star icon on any file or folder</li>
                  <li>Starred items appear in the dedicated "Starred" tab</li>
                  <li>Works for both documents and folders</li>
                  <li>Similar to Google Drive's starred items</li>
                  <li>Great for marking important items for easy retrieval</li>
                </ul>
                <p><strong>Use Cases:</strong></p>
                <ul>
                  <li><strong>Pin:</strong> Project folders you're actively working on</li>
                  <li><strong>Star:</strong> Important contracts, reports, or reference documents</li>
                  <li>You can use both features together for maximum organization</li>
                </ul>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="9">
              <Accordion.Header>How do I protect documents with passwords?</Accordion.Header>
              <Accordion.Body>
                <p>Add an extra layer of security to sensitive files and folders:</p>
                <h5>Setting a Password:</h5>
                <ol>
                  <li>Click the three-dot menu (⋮) on a document or folder</li>
                  <li>Select "Set Password"</li>
                  <li>Enter your desired password</li>
                  <li>Confirm the password</li>
                  <li>Click "Set Password" to save</li>
                </ol>
                <h5>Accessing Protected Items:</h5>
                <ol>
                  <li>Click on a password-protected item</li>
                  <li>A password prompt will appear</li>
                  <li>Enter the correct password</li>
                  <li>The item will be accessible for your session</li>
                </ol>
                <p><strong>Password Protection Features:</strong></p>
                <ul>
                  <li>Passwords protect both viewing and downloading</li>
                  <li>Folder passwords protect all contents within</li>
                  <li>Starred/pinned items still require passwords to access</li>
                  <li>Administrators can remove passwords if needed</li>
                  <li>Passwords are securely hashed and cannot be recovered</li>
                  <li>Each item can have a unique password</li>
                </ul>
                <p><strong>Important Notes:</strong></p>
                <ul>
                  <li>Remember your passwords - they cannot be recovered, only reset</li>
                  <li>Contact an administrator if you forget a password</li>
                  <li>Password protection is separate from user permissions</li>
                </ul>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="10">
              <Accordion.Header>How do I view document activity logs?</Accordion.Header>
              <Accordion.Body>
                <p>Track all activities related to specific documents and folders:</p>
                <h5>Accessing Activity Logs:</h5>
                <ol>
                  <li>Click the three-dot menu (⋮) on any document or folder</li>
                  <li>Select "Activity Log"</li>
                  <li>View detailed activity history for that specific item</li>
                </ol>
                <p><strong>Tracked Activities Include:</strong></p>
                <ul>
                  <li>Uploads and downloads</li>
                  <li>Moves and renames</li>
                  <li>Password changes</li>
                  <li>Share link generation</li>
                  <li>Access attempts</li>
                  <li>Deletions and modifications</li>
                  <li>Favoriting and pinning actions</li>
                </ul>
                <p><strong>Activity Information Displayed:</strong></p>
                <ul>
                  <li>User who performed the action</li>
                  <li>Timestamp of the action</li>
                  <li>Type of activity</li>
                  <li>Detailed description</li>
                  <li>Company context</li>
                </ul>
                <p><strong>Benefits:</strong></p>
                <ul>
                  <li>Compliance and audit trails</li>
                  <li>Track document access and usage</li>
                  <li>Identify who made changes</li>
                  <li>Monitor sensitive document activity</li>
                </ul>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="11">
              <Accordion.Header>Can I access multiple companies?</Accordion.Header>
              <Accordion.Body>
                <p>Yes! ClovaLink supports cross-company access for users who need to work with multiple organizations:</p>
                <h5>Getting Access:</h5>
                <ul>
                  <li>An administrator must grant you cross-company access</li>
                  <li>Access is configured per-company basis</li>
                  <li>Your primary company remains unchanged</li>
                </ul>
                <h5>Using Multi-Company Access:</h5>
                <ol>
                  <li>Look for the company dropdown in the documents page</li>
                  <li>Select the company you want to work with</li>
                  <li>All documents will switch to that company's context</li>
                  <li>Your Quick Access and Starred items are company-specific</li>
                </ol>
                <p><strong>Moving Between Companies:</strong></p>
                <ul>
                  <li>Use the "Move to..." feature to transfer files between companies</li>
                  <li>Select the target company in the move modal</li>
                  <li>Choose destination folder in the target company</li>
                  <li>All moves are logged for security and compliance</li>
                </ul>
                <p><strong>Permissions:</strong></p>
                <ul>
                  <li>Your role may differ between companies</li>
                  <li>Each company maintains separate permissions</li>
                  <li>Administrators control cross-company access grants</li>
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