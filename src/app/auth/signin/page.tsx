'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Button, Container, Alert } from 'react-bootstrap';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { startAssertion, startAttestation } from '@simplewebauthn/browser';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  // Check if WebAuthn is available
  useEffect(() => {
    setPasskeyAvailable(
      typeof window !== 'undefined' &&
      typeof window.PublicKeyCredential !== 'undefined'
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    console.log('Login attempt:', { email, hasTotpCode: !!totpCode, requiresTOTP });

    try {
      // Only send totpCode if it has a value (avoid sending empty strings)
      const credentials: any = {
        redirect: false,
        email,
        password,
      };
      
      // Only include totpCode if user actually entered one
      if (totpCode && totpCode.trim().length > 0) {
        credentials.totpCode = totpCode;
      }
      
      console.log('Sending credentials:', { ...credentials, password: '***' });

      const result = await signIn('credentials', credentials);

      console.log('Login result:', result);

      if (result?.error) {
        console.log('Login error:', result.error);
        if (result.error === 'TOTP_REQUIRED') {
          console.log('✅ 2FA required - showing 6-digit input');
          setRequiresTOTP(true);
          setError('');
        } else {
          setError(result.error === 'Invalid TOTP code' ? 'Invalid 6-digit code. Please try again.' : 'Invalid email or password');
        }
      } else {
        console.log('✅ Login successful');
        
        // Track login with IP and user agent for email notifications
        fetch('/api/auth/track-login', {
          method: 'POST',
        }).catch(err => {
          console.error('Failed to track login:', err);
        });
        
        // Check if user must change password
        const passwordCheckRes = await fetch('/api/employees/must-change-password');
        if (passwordCheckRes.ok) {
          const passwordCheck = await passwordCheckRes.json();
          if (passwordCheck.mustChange) {
            router.push('/auth/change-password');
            return;
          }
        }
        
        // Check if 2FA is required and user doesn't have it
        const check2FA = await fetch('/api/auth/check-2fa-requirement');
        if (check2FA.ok) {
          const needs2FA = await check2FA.json();
          if (needs2FA.required && !needs2FA.has2FA) {
            // Redirect to account page to set up 2FA
            router.push('/dashboard/account?require2fa=true');
            return;
          }
        }
        router.push(callbackUrl);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    // Validate email is not empty
    if (!email || email.trim() === '') {
      setError('Please enter your email address first');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsPasskeyLoading(true);
    setError('');

    try {
      // Step 1: Try to get authentication options (check if user has passkeys)
      const optionsRes = await fetch('/api/passkey/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      // If user has no passkeys, register a new one and sign in
      if (optionsRes.status === 400) {
        const errorData = await optionsRes.json();
        if (errorData.error === 'No passkeys registered for this user') {
          // User doesn't have a passkey yet - check if they provided password
          if (!password || password.trim() === '') {
            setError('You don\'t have a passkey yet. Please enter your password above to create one, then click "Sign In with Passkey" again.');
            setIsPasskeyLoading(false);
            return;
          }
          // User has password - register passkey and sign in
          await registerAndSignIn();
          return;
        }
        throw new Error(errorData.error || 'Failed to start passkey authentication');
      }

      if (!optionsRes.ok) {
        const errorData = await optionsRes.json();
        throw new Error(errorData.error || 'Failed to start passkey authentication');
      }

      const { options, challenge, userId } = await optionsRes.json();

      // Step 2: Start authentication with browser
      const authenticationResponse = await startAssertion(options);

      // Step 3: Verify authentication
      const verifyRes = await fetch('/api/passkey/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: authenticationResponse,
          challenge,
          userId,
        }),
      });

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json();
        throw new Error(errorData.error || 'Passkey authentication failed');
      }

      const { email: userEmail } = await verifyRes.json();

      // Step 4: Sign in with NextAuth using passkey authentication
      const result = await signIn('credentials', {
        redirect: false,
        email: userEmail,
        password: '__passkey__', // Special marker for passkey auth
        passkey: 'true',
        totpCode: totpCode || undefined,
      });

      if (result?.error) {
        if (result.error === 'TOTP_REQUIRED') {
          setRequiresTOTP(true);
          setError('');
        } else {
          setError(result.error === 'Invalid TOTP code' ? 'Invalid 6-digit code. Please try again.' : 'Authentication failed. Please try again.');
        }
      } else {
        // Track login with IP and user agent for email notifications
        fetch('/api/auth/track-login', {
          method: 'POST',
        }).catch(err => {
          console.error('Failed to track login:', err);
        });

        // Check if 2FA is required and user doesn't have it (passkeys count as 2FA, so this check is mainly for TOTP)
        // If user just logged in with passkey, they already have 2FA, so we can skip this check
        router.push(callbackUrl);
      }
    } catch (error: any) {
      setError(error.message || 'Passkey authentication failed. Please try again.');
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const registerAndSignIn = async () => {
    try {
      // User doesn't have a passkey yet - we need to verify their password first
      // Password should already be validated before this function is called, but double-check
      if (!password || password.trim() === '') {
        setError('Password is required to create your first passkey.');
        setIsPasskeyLoading(false);
        return;
      }

      // Validate email is not empty (should already be validated, but double-check)
      if (!email || email.trim() === '') {
        setError('Please enter your email address');
        setIsPasskeyLoading(false);
        return;
      }

      // Step 1: Verify password (the endpoint will verify it)
      // Password verification happens in the registration endpoint

      // Step 2: Get registration options (we'll need to modify the endpoint to accept email)
      // For now, let's create a temporary endpoint or modify existing one
      const regOptionsRes = await fetch('/api/passkey/register/options/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!regOptionsRes.ok) {
        const errorData = await regOptionsRes.json();
        throw new Error(errorData.error || 'Failed to start passkey registration');
      }

      const { options, challenge } = await regOptionsRes.json();

      // Step 3: Start registration with browser
      const registrationResponse = await startAttestation(options);

      // Step 4: Verify and save passkey
      const verifyRegRes = await fetch('/api/passkey/register/verify/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: registrationResponse,
          challenge,
          email,
          password,
          deviceName: 'Login Device',
        }),
      });

      if (!verifyRegRes.ok) {
        const errorData = await verifyRegRes.json();
        throw new Error(errorData.error || 'Passkey registration failed');
      }

      // Step 5: Now sign in with the newly registered passkey
      const { email: userEmail } = await verifyRegRes.json();
      
      const result = await signIn('credentials', {
        redirect: false,
        email: userEmail,
        password: '__passkey__',
        passkey: 'true',
        totpCode: totpCode || undefined,
      });

      if (result?.error) {
        if (result.error === 'TOTP_REQUIRED') {
          setRequiresTOTP(true);
          setError('');
        } else {
          setError(result.error === 'Invalid TOTP code' ? 'Invalid 6-digit code. Please try again.' : 'Authentication failed. Please try again.');
        }
      } else {
        // User just registered a passkey, which counts as 2FA, so no need to check requirement
        router.push(callbackUrl);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to register passkey. Please try again.');
      setIsPasskeyLoading(false);
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
              priority
              unoptimized
            />
          </div>
          <h1>Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your ClovaLink account</p>
        </div>

        {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
        
        {requiresTOTP && (
          <Alert variant="info" className="mb-4">
            <strong>Two-Factor Authentication Required</strong>
            <p className="mb-0 mt-2">Please enter the 6-digit code from your authenticator app below.</p>
          </Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="form-label">Email Address</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || requiresTOTP}
              required
              className="auth-input"
              placeholder="Enter your email"
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="form-label">Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || requiresTOTP}
              required
              className="auth-input"
              placeholder="Enter your password"
            />
          </Form.Group>

          {requiresTOTP && (
            <div style={{ 
              border: '3px solid #667eea', 
              borderRadius: '16px', 
              padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
              marginBottom: '1.5rem'
            }}>
              <Form.Group className="mb-0">
                <Form.Label className="form-label" style={{ fontWeight: 700, fontSize: '1.1rem', color: '#667eea' }}>
                  6-Digit Authentication Code
                </Form.Label>
                <Form.Control
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={isLoading}
                  required
                  autoFocus
                  className="auth-input text-center"
                  placeholder="000000"
                  maxLength={6}
                  style={{ 
                    fontSize: '2rem', 
                    letterSpacing: '1rem', 
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    border: '2px solid #667eea'
                  }}
                />
                <Form.Text className="text-muted d-block mt-2" style={{ textAlign: 'center' }}>
                  📱 Open your authenticator app and enter the 6-digit code
                </Form.Text>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setRequiresTOTP(false);
                    setTotpCode('');
                    setError('');
                  }}
                  className="mt-2 d-block w-100"
                  style={{ color: '#666' }}
                >
                  ← Back to login
                </Button>
              </Form.Group>
            </div>
          )}

          <Button 
            variant="primary" 
            type="submit" 
            className="w-100 auth-button"
            disabled={isLoading || isPasskeyLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In with Password'}
          </Button>
        </Form>

        {passkeyAvailable && (
          <div className="passkey-section">
            <div className="divider">
              <span>or</span>
            </div>
            <Button
              variant="outline-primary"
              onClick={handlePasskeySignIn}
              disabled={isLoading || isPasskeyLoading || !email || email.trim() === ''}
              className="w-100 auth-button passkey-button"
            >
              {isPasskeyLoading ? (
                <>Signing in with Passkey...</>
              ) : (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="me-2"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Sign In with Passkey
                </>
              )}
            </Button>
            <p className="passkey-hint">
              Enter your email above, then use Face ID, Touch ID, or your device's security key to sign in.
              <br />
              <small className="text-muted">If you don't have a passkey yet, also enter your password above to create one.</small>
            </p>
          </div>
        )}
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
          color: #000000 !important;
          margin-bottom: 0.5rem;
        }

        .auth-subtitle {
          color: #666;
          font-size: 1rem;
          margin: 0;
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
        }

        :global(.auth-button) {
          padding: 1rem;
          font-size: 1.0625rem;
          font-weight: 600;
          border-radius: 12px;
          margin-top: 1rem;
        }

        .passkey-section {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #ecf0f1;
        }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 0.375rem 0;
          color: #999;
          font-size: 0.875rem;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #ecf0f1;
        }

        .divider span {
          padding: 0 1rem;
        }

        :global(.passkey-button) {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #667eea;
          color: #667eea;
          background: transparent;
          margin-top: 0.375rem !important;
        }

        :global(.passkey-button:hover:not(:disabled)) {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .passkey-hint {
          text-align: center;
          color: #666;
          font-size: 0.8125rem;
          margin-top: 0.75rem;
          margin-bottom: 0;
        }

        @media (max-width: 576px) {
          .auth-card {
            padding: 2rem 1.5rem;
          }

          .auth-header h1 {
            font-size: 1.75rem;
            color: #000000 !important;
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