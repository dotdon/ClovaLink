import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { FaDownload } from 'react-icons/fa';
import { FileIcon } from './ui/FileIcon';

interface DocumentPreviewProps {
  documentId: string;
  name: string;
  mimeType: string;
  url: string;
  onDownload?: () => void;
}

export default function DocumentPreview({ documentId, name, mimeType = 'application/octet-stream', onDownload }: DocumentPreviewProps) {
  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FileIcon mimeType={mimeType} className="me-2 fs-4" />
            <h5 className="mb-0">{name}</h5>
          </div>
          {onDownload && (
            <Button
              variant="primary"
              onClick={onDownload}
            >
              <FaDownload className="me-2" /> Download
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
} 