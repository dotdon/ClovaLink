'use client';

import React, { useState, useEffect } from 'react';
import { Container, Card, Alert } from 'react-bootstrap';
import DocumentUpload from '@/components/DocumentUpload';
import { usePathname } from 'next/navigation';

export default function UploadPage() {
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  const pathname = usePathname();
  const token = pathname.split('/').pop() || '';

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/upload-links/validate/${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        setIsValid(false);
        return;
      }

      setIsValid(true);
      setError(null);
    } catch (error) {
      console.error('Error validating token:', error);
      setError('An error occurred while validating the upload link');
      setIsValid(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = (documentId: string) => {
    setUploadSuccess(true);
  };

  const handleUploadError = (error: Error) => {
    setError(error.message);
  };

  if (isLoading) {
    return (
      <Container className="py-5">
        <Card>
          <Card.Body className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Validating upload link...</p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Card>
          <Card.Body>
            <Alert variant="danger">
              <Alert.Heading>Upload Link Error</Alert.Heading>
              <p>{error}</p>
            </Alert>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (uploadSuccess) {
    return (
      <Container className="py-5">
        <Card>
          <Card.Body>
            <Alert variant="success">
              <Alert.Heading>Upload Successful!</Alert.Heading>
              <p>Your document has been uploaded successfully. You can now close this page.</p>
            </Alert>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Card>
        <Card.Header>
          <h4 className="mb-0">Secure Document Upload</h4>
        </Card.Header>
        <Card.Body>
          <p className="mb-4">
            Use the form below to securely upload your document. The upload link will be deactivated after successful upload.
          </p>
          <DocumentUpload
            uploadUrl={`/api/upload/${token}`}
            onSuccess={handleUploadSuccess}
            onError={handleUploadError}
          />
        </Card.Body>
      </Card>
    </Container>
  );
} 