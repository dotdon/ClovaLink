'use client';

import DashboardLayout from '@/components/ui/DashboardLayout';
import { Card } from 'react-bootstrap';
import { FaUserShield, FaFolderOpen, FaShareAlt, FaKey, FaArrowsAlt, FaStar, FaLock, FaThumbtack, FaQuestionCircle } from 'react-icons/fa';
import HelpAccordion from '@/components/HelpAccordion';

export default function HelpPage() {
  return (
    <DashboardLayout>
      <div className="help-container">
        <div className="page-header">
          <div className="header-icon">
            <FaQuestionCircle />
          </div>
          <div className="header-text">
            <h1>Help & FAQs</h1>
            <p className="header-subtitle">Learn how to use ClovaLink effectively</p>
          </div>
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
          <HelpAccordion />
        </div>

        <style jsx>{`
          .help-container {
            max-width: 100%;
            padding: 2rem;
            overflow-x: hidden;
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

            .page-header {
              flex-direction: column;
              align-items: center;
              gap: 0.75rem;
              padding: 1rem !important;
              margin-bottom: 1rem !important;
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