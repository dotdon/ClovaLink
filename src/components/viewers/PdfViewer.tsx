'use client';

import React, { useState, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button, Spinner } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight, FaSearchPlus, FaSearchMinus, FaExpand, FaCompress } from 'react-icons/fa';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up the worker for PDF.js - try local first, fallback to CDN
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';

interface PdfViewerProps {
  documentId: string;
  documentName: string;
}

export default function PdfViewer({ documentId, documentName }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fileUrl = `/api/documents/${documentId}/download`;

  // Memoize file configuration to prevent unnecessary reloads
  const fileConfig = useMemo(() => ({
    url: fileUrl,
    httpHeaders: {
      'Cache-Control': 'no-cache'
    },
    withCredentials: true
  }), [fileUrl]);

  // Memoize PDF.js options - use HTTPS explicitly
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  }), []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log('✅ PDF loaded successfully with', numPages, 'pages');
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error('❌ Error loading PDF:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    setError(`Failed to load PDF: ${error.message}`);
    setLoading(false);
  }

  function onLoadProgress({ loaded, total }: { loaded: number; total: number }) {
    console.log(`📥 Loading PDF: ${loaded} / ${total} bytes (${Math.round((loaded / total) * 100)}%)`);
  }

  function onSourceError(error: Error) {
    console.error('❌ Source error:', error);
    setError(`Failed to fetch PDF: ${error.message}`);
    setLoading(false);
  }

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return Math.min(Math.max(1, newPage), numPages);
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`pdf-viewer ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Controls */}
      <div className="pdf-controls">
        <div className="pdf-controls-left">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={previousPage}
            disabled={pageNumber <= 1 || loading}
          >
            <FaChevronLeft />
          </Button>
          <span className="page-info">
            Page {pageNumber} of {numPages || '?'}
          </span>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={nextPage}
            disabled={pageNumber >= numPages || loading}
          >
            <FaChevronRight />
          </Button>
        </div>

        <div className="pdf-controls-right">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={zoomOut}
            disabled={loading}
            title="Zoom Out"
          >
            <FaSearchMinus />
          </Button>
          <span className="zoom-info">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={zoomIn}
            disabled={loading}
            title="Zoom In"
          >
            <FaSearchPlus />
          </Button>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={toggleFullscreen}
            disabled={loading}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="pdf-content">
        {loading && !error && (
          <div className="pdf-loading">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Loading PDF...</p>
            <small className="text-muted">Document ID: {documentId}</small>
            <small className="text-muted d-block mt-1">Check browser console (F12) for details</small>
          </div>
        )}

        {error && (
          <div className="pdf-error">
            <p className="text-danger">{error}</p>
            <p className="text-muted mt-2">Check browser console for more details</p>
          </div>
        )}

        {!error && (
          <Document
            file={fileConfig}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            onLoadProgress={onLoadProgress}
            onSourceError={onSourceError}
            loading={<></>}
            error={<></>}
            options={pdfOptions}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={
                <div className="pdf-loading">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Loading page {pageNumber}...</p>
                </div>
              }
            />
          </Document>
        )}
      </div>
    </div>
  );
}

