'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Container, Alert, Button } from 'react-bootstrap';
import Link from 'next/link';
import Image from 'next/image';

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
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-wrapper">
            <Image
              src="/logo.svg"
              alt="ClovaLink"
              width={80}
              height={80}
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <h1>Authentication Error</h1>
          <p className="auth-subtitle">Something went wrong</p>
        </div>

        <Alert variant="danger" className="mb-4">
          {getErrorMessage(error)}
        </Alert>
        
        <Link href="/auth/signin" className="d-block">
          <Button variant="primary" className="w-100 auth-button">
            Back to Sign In
          </Button>
        </Link>
      </div>

      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0015 0%, #1a0033 50%, #2d1b4e 100%);
          background-size: 200% 200%;
          animation: gradientShift 20s ease infinite;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .auth-card {
          max-width: 480px;
          width: 100%;
          background: rgba(255, 255, 255, 0.98);
          border-radius: 28px;
          padding: 3rem 2.5rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        
        .logo-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100px;
          height: 100px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 24px;
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
        }

        .auth-header h1 {
          font-size: 2rem;
          font-weight: 800;
          color: #1a1a2e;
          margin-bottom: 0.5rem;
        }

        .auth-subtitle {
          color: #666;
          font-size: 1rem;
          margin: 0;
        }

        :global(.auth-button) {
          padding: 1rem;
          font-size: 1.0625rem;
          font-weight: 600;
          border-radius: 12px;
        }

        @media (max-width: 576px) {
          .auth-card {
            padding: 2rem 1.5rem;
          }

          .auth-header h1 {
            font-size: 1.75rem;
          }
          
          .logo-wrapper {
            width: 80px;
            height: 80px;
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
} 