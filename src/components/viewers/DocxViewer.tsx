'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Spinner, Alert } from 'react-bootstrap';
import { renderAsync } from 'docx-preview';

interface DocxViewerProps {
  documentId: string;
  documentName: string;
}

export default function DocxViewer({ documentId, documentName }: DocxViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch the document
        const response = await fetch(`/api/documents/${documentId}/download`);
        
        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.statusText}`);
        }

        const blob = await response.blob();

        // Clear previous content
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          
          // Render the DOCX document
          await renderAsync(blob, containerRef.current, undefined, {
            className: 'docx-preview-container',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: true,
            experimental: false,
            trimXmlDeclaration: true,
            useBase64URL: false,
            useMathMLPolyfill: false,
            showChanges: false,
            debug: false,
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading DOCX:', err);
        setError(
          err instanceof Error 
            ? err.message 
            : 'Failed to load document. Please try downloading the file instead.'
        );
        setLoading(false);
      }
    };

    loadDocument();
  }, [documentId]);

  return (
    <div className="docx-viewer">
      {loading && (
        <div className="docx-loading">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading document...</p>
        </div>
      )}

      {error && (
        <Alert variant="danger" className="m-3">
          {error}
        </Alert>
      )}

      <div 
        ref={containerRef} 
        className="docx-content"
        style={{ display: loading ? 'none' : 'block' }}
      />
    </div>
  );
}

