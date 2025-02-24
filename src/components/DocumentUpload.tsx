'use client';

import React, { useState, useRef } from 'react';
import { Button, ProgressBar, Alert, Form } from 'react-bootstrap';
import { FaUpload } from 'react-icons/fa';

interface DocumentUploadProps {
  uploadUrl: string;
  onSuccess: (documentId: string) => void;
  onError: (error: Error) => void;
}

export default function DocumentUpload({ uploadUrl, onSuccess, onError }: DocumentUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaderName, setUploaderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setError('Please select files to upload');
      return;
    }

    if (!uploaderName.trim()) {
      setError('Please enter your name before uploading');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('uploaderName', uploaderName.trim());

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();
        onSuccess(data.documentId);
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      setSelectedFiles(null);
      setUploaderName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      onError(err instanceof Error ? err : new Error('Upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Form.Group className="mb-3">
        <Form.Label>Your Name</Form.Label>
        <Form.Control
          type="text"
          value={uploaderName}
          onChange={(e) => setUploaderName(e.target.value)}
          placeholder="Enter your name"
          disabled={isUploading}
          required
        />
      </Form.Group>

      <div className="mb-3">
        <input
          ref={fileInputRef}
          type="file"
          className="form-control"
          onChange={handleFileSelect}
          disabled={isUploading}
          multiple
        />
      </div>

      {selectedFiles && (
        <div className="mb-3">
          <strong>Selected files:</strong>
          <ul className="list-unstyled">
            {Array.from(selectedFiles).map((file, index) => (
              <li key={index}>
                {file.name} ({Math.round(file.size / 1024)} KB)
              </li>
            ))}
          </ul>
        </div>
      )}

      {isUploading && (
        <div className="mb-3">
          <ProgressBar now={uploadProgress} label={`${Math.round(uploadProgress)}%`} />
        </div>
      )}

      <Button
        variant="primary"
        onClick={handleUpload}
        disabled={!selectedFiles || isUploading || !uploaderName.trim()}
      >
        <FaUpload className="me-2" />
        {isUploading ? 'Uploading...' : 'Upload'}
      </Button>
    </div>
  );
} 