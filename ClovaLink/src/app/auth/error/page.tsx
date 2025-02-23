'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Container, Alert } from 'react-bootstrap';
import Link from 'next/link';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Invalid email or password';
      case 'AccessDenied':
        return 'You do not have permission to access this resource';
      case 'Verification':
        return 'The verification link is invalid or has expired';
      default:
        return 'An error occurred during authentication';
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100">
      <Card className="p-4 shadow-sm" style={{ maxWidth: '400px', width: '100%' }}>
        <Card.Body>
          <h2 className="text-center mb-4">Authentication Error</h2>
          <Alert variant="danger">
            {getErrorMessage(error)}
          </Alert>
          <div className="text-center mt-4">
            <Link href="/auth/signin" className="btn btn-primary">
              Back to Sign In
            </Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
} 