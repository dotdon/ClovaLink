'use client';

import React, { ReactNode } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';

interface ThemedModalProps {
  show: boolean;
  onHide: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'lg' | 'xl';
  centered?: boolean;
  closeButton?: boolean;
}

export default function ThemedModal({
  show,
  onHide,
  title,
  children,
  footer,
  size = 'lg',
  centered = true,
  closeButton = true,
}: ThemedModalProps) {
  return (
    <>
      <Modal
        show={show}
        onHide={onHide}
        size={size}
        centered={centered}
        className="themed-modal"
      >
        <Modal.Header className="themed-modal-header">
          <Modal.Title className="themed-modal-title">{title}</Modal.Title>
          {closeButton && (
            <button
              type="button"
              className="themed-modal-close"
              onClick={onHide}
              aria-label="Close"
            >
              <FaTimes />
            </button>
          )}
        </Modal.Header>
        <Modal.Body className="themed-modal-body">{children}</Modal.Body>
        {footer && <Modal.Footer className="themed-modal-footer">{footer}</Modal.Footer>}
      </Modal>

      <style jsx global>{`
        .themed-modal .modal-dialog {
          margin: 1.75rem auto;
        }

        .themed-modal .modal-content {
          border-radius: 28px !important;
          border: none !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4) !important;
          background: rgba(255, 255, 255, 0.98) !important;
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
          overflow: hidden;
        }

        .themed-modal .modal-backdrop {
          background: rgba(10, 0, 21, 0.7) !important;
          backdrop-filter: blur(4px) !important;
          -webkit-backdrop-filter: blur(4px) !important;
        }

        .themed-modal-header {
          border-bottom: 1px solid rgba(236, 240, 241, 0.5) !important;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%) !important;
          padding: 1.75rem 2rem !important;
          position: relative;
        }

        .themed-modal-title {
          color: #1a1a2e !important;
          font-weight: 700 !important;
          font-size: 1.5rem !important;
          margin: 0 !important;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .themed-modal-close {
          position: absolute;
          top: 50%;
          right: 2rem;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #667eea;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.3s ease;
          width: 36px;
          height: 36px;
        }

        .themed-modal-close:hover {
          background: rgba(102, 126, 234, 0.1);
          color: #764ba2;
          transform: translateY(-50%) rotate(90deg);
        }

        .themed-modal-close:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
        }

        .themed-modal-body {
          background: #ffffff !important;
          padding: 2rem !important;
          color: #1a1a2e;
        }

        .themed-modal-footer {
          border-top: 1px solid rgba(236, 240, 241, 0.5) !important;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%) !important;
          padding: 1.5rem 2rem !important;
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .themed-modal-footer .btn {
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .themed-modal-footer .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          border: none !important;
          color: #fff !important;
        }

        .themed-modal-footer .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
        }

        .themed-modal-footer .btn-secondary {
          background: transparent !important;
          border: 2px solid #ecf0f1 !important;
          color: #667eea !important;
        }

        .themed-modal-footer .btn-secondary:hover {
          background: rgba(102, 126, 234, 0.05) !important;
          border-color: #667eea !important;
        }

        /* Animation */
        .themed-modal .modal-dialog {
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-50px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .themed-modal .modal-backdrop {
          animation: backdropFadeIn 0.3s ease-out;
        }

        @keyframes backdropFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Mobile optimizations */
        @media (max-width: 576px) {
          .themed-modal .modal-dialog {
            margin: 0.5rem;
          }

          .themed-modal-header {
            padding: 1.25rem 1.5rem !important;
          }

          .themed-modal-title {
            font-size: 1.25rem !important;
          }

          .themed-modal-close {
            right: 1.5rem;
            width: 32px;
            height: 32px;
            font-size: 1.25rem;
          }

          .themed-modal-body {
            padding: 1.5rem !important;
          }

          .themed-modal-footer {
            padding: 1.25rem 1.5rem !important;
            flex-direction: column-reverse;
          }

          .themed-modal-footer .btn {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}

