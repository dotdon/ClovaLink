'use client';

import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import DocumentUpload from '@/components/DocumentUpload';
import { usePathname } from 'next/navigation';
import { FaUpload, FaCheckCircle, FaExclamationTriangle, FaShieldAlt, FaLock } from 'react-icons/fa';
import Image from 'next/image';

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
      <div className="upload-page-container">
        <Container className="py-5">
          <div className="upload-card loading-card">
            <div className="upload-card-body text-center">
              <div className="spinner"></div>
              <h3 className="mt-4" style={{ color: '#ffffff' }}>Validating Upload Link</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Please wait while we verify your access...</p>
              <div style={{ marginTop: '3rem' }}>
                <Image 
                  src="/logo.svg" 
                  alt="ClovaLink" 
                  width={540} 
                  height={162} 
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
            </div>
          </div>
        </Container>

        <style jsx>{`
          .upload-page-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #1a0033 0%, #2d1b4e 50%, #1a0033 100%);
            padding: 2rem 0;
          }

          .upload-card {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 20px;
            padding: 3rem;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
          }

          .upload-card-body {
            padding: 2rem 0;
          }

          .spinner {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(102, 126, 234, 0.2);
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="upload-page-container">
        <Container className="py-5">
          <div className="upload-card error-card">
            <div className="upload-card-header error-header">
              <FaExclamationTriangle style={{ fontSize: '3rem', color: '#dc3545', marginBottom: '1rem' }} />
              <h2>Upload Link Error</h2>
            </div>
            <div className="upload-card-body">
              <div className="error-message">
                <p>{error}</p>
              </div>
              <div className="error-info">
                <p>Common reasons for this error:</p>
                <ul>
                  <li>The upload link has expired</li>
                  <li>The link has already been used</li>
                  <li>The link is invalid or has been revoked</li>
                </ul>
                <p className="mt-3">Please contact the sender for a new upload link.</p>
              </div>
              <div style={{ textAlign: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Image 
                  src="/logo.svg" 
                  alt="ClovaLink" 
                  width={540} 
                  height={162} 
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
            </div>
          </div>
        </Container>

        <style jsx>{`
          .upload-page-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #1a0033 0%, #2d1b4e 50%, #1a0033 100%);
            padding: 2rem 0;
          }

          .upload-card {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
          }

          .upload-card-header {
            background: #667eea;
            padding: 2.5rem 3rem;
            text-align: center;
            color: white;
          }

          .error-header {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          }

          .upload-card-header h2 {
            margin: 0;
            font-size: 1.75rem;
            font-weight: 600;
          }

          .upload-card-body {
            padding: 3rem;
            color: white;
          }

          .error-message {
            background: rgba(220, 53, 69, 0.1);
            border: 1px solid rgba(220, 53, 69, 0.3);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
          }

          .error-message p {
            margin: 0;
            color: #ff6b6b;
            font-size: 1.1rem;
            font-weight: 500;
          }

          .error-info {
            color: rgba(255, 255, 255, 0.8);
          }

          .error-info ul {
            list-style: none;
            padding-left: 0;
            margin: 1rem 0;
          }

          .error-info li {
            padding: 0.5rem 0 0.5rem 1.5rem;
            position: relative;
          }

          .error-info li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #667eea;
            font-size: 1.5rem;
          }
        `}</style>
      </div>
    );
  }

  if (uploadSuccess) {
    return (
      <div className="upload-page-container">
        <Container className="py-5">
          <div className="upload-card success-card">
            <div className="upload-card-header success-header">
              <FaCheckCircle style={{ fontSize: '3rem', color: '#52c41a', marginBottom: '1rem' }} />
              <h2>Upload Successful!</h2>
            </div>
            <div className="upload-card-body text-center">
              <div className="success-message">
                <p>Your document has been uploaded and encrypted successfully.</p>
              </div>
              <div className="success-info">
                <div className="info-badge">
                  <FaShieldAlt style={{ color: '#52c41a', marginRight: '0.5rem' }} />
                  <span>Encrypted with AES-256</span>
                </div>
                <div className="info-badge">
                  <FaLock style={{ color: '#667eea', marginRight: '0.5rem' }} />
                  <span>Secure Storage</span>
                </div>
              </div>
              <p className="mt-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                You can now safely close this page.
              </p>
              <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Image 
                  src="/logo.svg" 
                  alt="ClovaLink" 
                  width={540} 
                  height={162} 
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
            </div>
          </div>
        </Container>

        <style jsx>{`
          .upload-page-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #1a0033 0%, #2d1b4e 50%, #1a0033 100%);
            padding: 2rem 0;
          }

          .upload-card {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
          }

          .upload-card-header {
            background: #667eea;
            padding: 2.5rem 3rem;
            text-align: center;
            color: white;
          }

          .success-header {
            background: linear-gradient(135deg, #52c41a 0%, #3d9213 100%);
          }

          .upload-card-header h2 {
            margin: 0;
            font-size: 1.75rem;
            font-weight: 600;
          }

          .upload-card-body {
            padding: 3rem;
            color: white;
          }

          .success-message {
            background: rgba(82, 196, 26, 0.1);
            border: 1px solid rgba(82, 196, 26, 0.3);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
          }

          .success-message p {
            margin: 0;
            color: #95de64;
            font-size: 1.1rem;
            font-weight: 500;
          }

          .success-info {
            display: flex;
            gap: 1.5rem;
            justify-content: center;
            flex-wrap: wrap;
            margin: 2rem 0;
          }

          .info-badge {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 0.75rem 1.5rem;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="upload-page-container">
      <Container className="py-5">
        <div className="upload-card main-card">
          <div className="upload-card-header">
            <FaUpload style={{ fontSize: '3rem', marginBottom: '1rem' }} />
            <h2>Secure Document Upload</h2>
          </div>
          <div className="upload-card-body">
            <div className="info-section">
              <p className="description">
                Use the form below to securely upload your document. Your file will be encrypted and stored safely.
              </p>
            </div>
            
            <div className="upload-section">
              <DocumentUpload
                uploadUrl={`/api/upload/${token}`}
                onSuccess={handleUploadSuccess}
                onError={handleUploadError}
              />
            </div>

            <div className="info-footer">
              <Image 
                src="/logo.svg" 
                alt="ClovaLink" 
                width={540} 
                height={162} 
                style={{ marginBottom: '1rem', filter: 'brightness(0) invert(1)' }}
              />
              <p>
                This upload link will be deactivated after successful upload or expiration.
              </p>
            </div>
          </div>
        </div>
      </Container>

      <style jsx>{`
        .upload-page-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #1a0033 0%, #2d1b4e 50%, #1a0033 100%);
        }

        .branding-header {
          padding: 1.5rem 0;
          border-bottom: 1px solid rgba(102, 126, 234, 0.2);
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
        }

        .brand-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .brand-logo {
          width: 50px;
          height: 50px;
          background: #667eea;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .brand-name {
          font-size: 1.75rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .upload-card {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          border: 1px solid rgba(102, 126, 234, 0.3);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          max-width: 800px;
          margin: 0 auto;
        }

        .upload-card-header {
          background: #667eea;
          padding: 2.5rem 3rem;
          text-align: center;
          color: white;
          position: relative;
        }

        .upload-card-header h2 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 600;
        }

        .upload-card-body {
          padding: 3rem;
          color: white;
        }

        .info-section {
          margin-bottom: 2.5rem;
        }

        .description {
          color: rgba(255, 255, 255, 0.85);
          font-size: 1.05rem;
          text-align: center;
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .upload-section {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 2rem;
          margin: 2rem 0;
        }

        .info-footer {
          text-align: center;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .info-footer p {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
          margin: 0;
        }

        @media (max-width: 768px) {
          .upload-card {
            margin: 0 1rem;
          }

          .upload-card-header {
            padding: 2rem 1.5rem;
          }

          .upload-card-header h2 {
            font-size: 1.5rem;
          }

          .upload-card-body {
            padding: 2rem 1.5rem;
          }

          .upload-section {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
} 