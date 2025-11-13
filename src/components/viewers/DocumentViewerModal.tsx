'use client';

import dynamic from 'next/dynamic';
import { Modal, Button, Alert } from 'react-bootstrap';
import { FaDownload, FaTimes } from 'react-icons/fa';

// Dynamic imports for heavy PDF and DOCX viewers - reduces initial bundle by ~500KB
const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
  loading: () => <div className="text-center p-4"><div className="spinner-border" role="status" /></div>,
});

const DocxViewer = dynamic(() => import('./DocxViewer'), {
  ssr: false,
  loading: () => <div className="text-center p-4"><div className="spinner-border" role="status" /></div>,
});

interface Document {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

interface DocumentViewerModalProps {
  show: boolean;
  onHide: () => void;
  document: Document | null;
  onDownload?: (document: Document) => void;
}

export default function DocumentViewerModal({
  show,
  onHide,
  document,
  onDownload,
}: DocumentViewerModalProps) {
  if (!document) return null;

  // Determine if the document is viewable
  const isPdf = document.mimeType === 'application/pdf';
  const isDocx = 
    document.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    document.name.toLowerCase().endsWith('.docx');
  const isViewable = isPdf || isDocx;

  const handleDownload = () => {
    if (onDownload) {
      onDownload(document);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      className="document-viewer-modal"
    >
      <Modal.Header className="document-viewer-header">
        <div className="header-content">
          <Modal.Title>{document.name}</Modal.Title>
          <div className="document-meta">
            <span className="file-size">{formatFileSize(document.size)}</span>
          </div>
        </div>
        <div className="header-actions">
          {isViewable && onDownload && (
            <Button
              variant="outline-light"
              size="sm"
              onClick={handleDownload}
              className="me-2"
            >
              <FaDownload className="me-1" />
              Download
            </Button>
          )}
          <Button
            variant="link"
            onClick={onHide}
            className="close-btn"
          >
            <FaTimes size={24} />
          </Button>
        </div>
      </Modal.Header>

      <Modal.Body className="document-viewer-body">
        {isViewable ? (
          <>
            {isPdf && (
              <PdfViewer
                documentId={document.id}
                documentName={document.name}
              />
            )}
            {isDocx && (
              <DocxViewer
                documentId={document.id}
                documentName={document.name}
              />
            )}
          </>
        ) : (
          <div className="unsupported-viewer">
            <Alert variant="info">
              <Alert.Heading>Preview Not Available</Alert.Heading>
              <p>
                This file type cannot be previewed in the browser. Please download the file to view it.
              </p>
              {onDownload && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleDownload}
                  className="mt-3"
                >
                  <FaDownload className="me-2" />
                  Download File
                </Button>
              )}
            </Alert>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}

