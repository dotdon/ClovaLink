'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Form, Button, Alert } from 'react-bootstrap';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
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
          <h1>Welcome to ClovaLink</h1>
          <p className="auth-subtitle">Sign in to access your documents</p>
        </div>

        {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="form-label">Email Address</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="form-label">Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input"
            />
          </Form.Group>

          <Button
            variant="primary"
            type="submit"
            className="w-100 auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In to ClovaLink'}
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