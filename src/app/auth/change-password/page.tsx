'use client';

import React, { useState, useEffect } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { FaLock, FaShieldAlt } from 'react-icons/fa';

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If user is not authenticated, redirect to login
    if (!session?.user) {
      router.push('/auth/signin');
    }
  }, [session, router]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/employees/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      console.log('✅ Password changed successfully, API response:', data);

      // Verify the response shows mustChangePassword is false
      if (data.mustChangePassword !== false) {
        console.warn('⚠️ API response shows mustChangePassword may not be false:', data);
      }

      // Verify the password change was actually saved by checking the mustChangePassword flag
      // Wait a moment for database to commit
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const verifyResponse = await fetch('/api/employees/must-change-password');
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        console.log('Password change verification:', verifyData);
        
        if (verifyData.mustChange) {
          // Still showing mustChange - wait a bit more and try again
          console.warn('⚠️ Password change flag still true, waiting longer...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const verifyResponse2 = await fetch('/api/employees/must-change-password');
          if (verifyResponse2.ok) {
            const verifyData2 = await verifyResponse2.json();
            console.log('Second verification:', verifyData2);
            if (verifyData2.mustChange) {
              console.error('❌ Password change flag still true after multiple checks');
              throw new Error('Password change may not have been saved. Please refresh the page and try again.');
            }
          }
        } else {
          console.log('✅ Verified: mustChangePassword is now false');
        }
      } else {
        console.warn('⚠️ Could not verify password change status');
      }

      // Password change verified - check if 2FA is required
      const check2FA = await fetch('/api/auth/check-2fa-requirement');
      if (check2FA.ok) {
        const needs2FA = await check2FA.json();
        if (needs2FA.required && !needs2FA.has2FA) {
          // Redirect to account page to set up 2FA - use full page reload
          console.log('Redirecting to account page for 2FA setup');
          window.location.href = '/dashboard/account?require2fa=true';
          return;
        }
      }
      
      // No 2FA required or already has 2FA - go to dashboard with full page reload
      // This ensures middleware checks fresh data from database
      console.log('Redirecting to dashboard');
      window.location.href = '/dashboard';
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user) {
    return null;
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-wrapper">
            <Image
              src="/logo.svg"
              alt="ClovaLink Logo"
              width={80}
              height={80}
              priority
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <h1>Change Password Required</h1>
          <p className="auth-subtitle">Please create a new secure password to continue</p>
        </div>

        <div className="security-notice">
          <FaShieldAlt className="notice-icon" />
          <div className="notice-content">
            <strong>Security Notice:</strong> You must change your temporary password before accessing the system.
          </div>
        </div>

        {error && (
          <Alert variant="danger" className="error-alert">
            {error}
          </Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="form-label">Current Password</Form.Label>
            <Form.Control
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isLoading}
              required
              className="auth-input"
              placeholder="Enter your current password"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="form-label">New Password</Form.Label>
            <Form.Control
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              required
              className="auth-input"
              placeholder="Enter your new password"
            />
            <Form.Text className="password-hint">
              Must be at least 8 characters with uppercase and numbers
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="form-label">Confirm New Password</Form.Label>
            <Form.Control
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
              className="auth-input"
              placeholder="Confirm your new password"
            />
          </Form.Group>

          <Button 
            variant="primary" 
            type="submit" 
            className="w-100 auth-button"
            disabled={isLoading}
          >
            <FaLock className="me-2" />
            {isLoading ? 'Changing Password...' : 'Change Password'}
          </Button>
        </Form>
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
          margin-bottom: 2rem;
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

        .security-notice {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
          border: 2px solid #ffc107;
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        .notice-icon {
          color: #ff9800;
          font-size: 1.25rem;
          margin-top: 0.125rem;
          flex-shrink: 0;
        }

        .notice-content {
          color: #856404;
          font-size: 0.9375rem;
          line-height: 1.5;
        }

        .notice-content strong {
          color: #7d6608;
          font-weight: 700;
        }

        .error-alert {
          border-radius: 12px;
          border: 2px solid #dc3545;
          margin-bottom: 1.5rem;
        }

        :global(.form-label) {
          font-weight: 600;
          color: #1a1a2e;
          font-size: 0.9375rem;
          margin-bottom: 0.5rem;
        }

        :global(.auth-input) {
          border-radius: 12px;
          border: 2px solid #ecf0f1;
          padding: 0.875rem 1.25rem;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        :global(.auth-input:focus) {
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.15);
          outline: none;
        }

        .password-hint {
          display: block;
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #666;
        }

        :global(.auth-button) {
          padding: 1rem;
          font-size: 1.0625rem;
          font-weight: 600;
          border-radius: 12px;
          margin-top: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          transition: all 0.3s ease;
        }

        :global(.auth-button:hover:not(:disabled)) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }

        :global(.auth-button:active:not(:disabled)) {
          transform: translateY(0);
        }

        :global(.auth-button:disabled) {
          opacity: 0.6;
          cursor: not-allowed;
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

          .security-notice {
            padding: 0.875rem 1rem;
          }

          .notice-content {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}

