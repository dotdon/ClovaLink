'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner, Alert } from 'react-bootstrap';
import { FaDownload, FaFilePdf, FaFileWord, FaFileImage, FaFile } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import '../lib/polyfills';
import { pdfjs } from 'react-pdf';

declare global {
  interface Window {
    __pdfWorkerConfigured?: boolean;
  }
}

// Import required CSS for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Dynamically import react-pdf to avoid SSR issues
const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false, loading: () => <div className="text-center p-4"><Spinner animation="border" /></div> }
);

const Page = dynamic(
  () => import('react-pdf').then((mod) => mod.Page),
  { ssr: false }
);

// Configure PDF.js worker (client-side only)
// Use minified version and add fallback to CDN
if (typeof window !== 'undefined' && !window.__pdfWorkerConfigured) {
  // Try to use local minified worker first
  try {
    // Use absolute URL from the root public folder
    const workerUrl = new URL('/pdf.worker.min.mjs', window.location.origin).href;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    console.log('PDF worker configured with .mjs version from:', workerUrl);
  } catch (e) {
    try {
      // Fallback to .js version
      const workerUrl = new URL('/pdf.worker.min.js', window.location.origin).href;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      console.log('PDF worker configured with .js version from:', workerUrl);
    } catch (e2) {
      // Final fallback to CDN if local files fail
      console.warn('Failed to load local PDF worker, using CDN fallback');
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    }
  }
  window.__pdfWorkerConfigured = true;
}

interface DocumentPreviewProps {
  documentId: string;
  name: string;
  mimeType: string;
  url: string;
  onDownload?: () => void;
}

export default function DocumentPreview({ documentId, name, mimeType = 'application/octet-stream', url, onDownload }: DocumentPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [fileData, setFileData] = useState<string | ArrayBuffer>('');

  useEffect(() => {
    fetchDocument();
  }, [documentId, url, mimeType, name]);

  // Cleanup blob URL when component unmounts or fileData changes
  useEffect(() => {
    return () => {
      if (fileData && typeof fileData === 'string' && fileData.startsWith('blob:')) {
        URL.revokeObjectURL(fileData);
      }
    };
  }, [fileData]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load document');
      
      // For PDFs, convert to ArrayBuffer for better react-pdf compatibility
      if (mimeType === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
        const arrayBuffer = await response.arrayBuffer();
        setFileData(arrayBuffer);
      } else {
        // For images, use blob URL
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setFileData(objectUrl);
      }
    } catch (err) {
      setError('Failed to load document preview');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const isPDF = mimeType === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
  const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
  const isWord = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    || mimeType === 'application/msword'
    || name.toLowerCase().endsWith('.docx') 
    || name.toLowerCase().endsWith('.doc');

  const getFileIcon = () => {
    if (isPDF) return <FaFilePdf className="text-danger" />;
    if (isWord) return <FaFileWord className="text-primary" />;
    if (isImage) return <FaFileImage className="text-success" />;
    return <FaFile className="text-secondary" />;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        {error}
      </Alert>
    );
  }

  return (
    <div className="document-preview">
      {/* Header */}
      <div className="preview-header">
        <div className="d-flex align-items-center">
          <span className="me-3 fs-3">{getFileIcon()}</span>
          <h5 className="mb-0">{name}</h5>
        </div>
        {onDownload && (
          <Button variant="primary" onClick={onDownload}>
            <FaDownload className="me-2" /> Download
          </Button>
        )}
      </div>

      {/* Preview Content */}
      <div className="preview-content">
        {isPDF && fileData && (
          <div className="pdf-viewer">
            <Document
              file={fileData}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                console.error('PDF load error:', error);
                setError('Failed to load PDF: ' + (error?.message || 'Unknown error'));
              }}
            >
              <Page 
                pageNumber={pageNumber} 
                renderTextLayer={true}
                renderAnnotationLayer={true}
                width={Math.min(window.innerWidth - 100, 800)}
              />
            </Document>
            {numPages > 1 && (
              <div className="pdf-controls">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                  disabled={pageNumber <= 1}
                >
                  Previous
                </Button>
                <span className="mx-3">
                  Page {pageNumber} of {numPages}
                </span>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                  disabled={pageNumber >= numPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        {isImage && fileData && (
          <div className="image-viewer">
            <img src={fileData} alt={name} style={{ maxWidth: '100%', height: 'auto' }} />
          </div>
        )}

        {isWord && (
          <div className="docx-viewer">
            <Alert variant="info">
              <h6>Word Document Preview</h6>
              <p className="mb-2">
                DOCX files cannot be previewed directly in the browser. 
                Please download the file to view it in Microsoft Word or a compatible application.
              </p>
              {onDownload && (
                <Button variant="primary" size="sm" onClick={onDownload}>
                  <FaDownload className="me-2" /> Download {name}
                </Button>
              )}
            </Alert>
          </div>
        )}

        {!isPDF && !isImage && !isWord && (
          <div className="unsupported-viewer">
            <Alert variant="warning">
              <h6>Preview Not Available</h6>
              <p className="mb-2">
                This file type ({mimeType}) cannot be previewed in the browser.
                Please download the file to view it.
              </p>
              {onDownload && (
                <Button variant="primary" size="sm" onClick={onDownload}>
                  <FaDownload className="me-2" /> Download {name}
                </Button>
              )}
            </Alert>
          </div>
        )}
      </div>

      <style jsx>{`
        .document-preview {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .preview-header {
          padding: 1.5rem;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fff;
        }

        .preview-content {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          background: #f8f9fa;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .pdf-viewer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .pdf-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .image-viewer {
          display: flex;
          justify-content: center;
          align-items: center;
          background: #fff;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .docx-viewer,
        .unsupported-viewer {
          max-width: 600px;
          width: 100%;
        }

        :global(.react-pdf__Page) {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border-radius: 8px;
          overflow: hidden;
        }

        :global(.react-pdf__Page__canvas) {
          max-width: 100%;
          height: auto !important;
        }
      `}</style>
    </div>
  );
} 