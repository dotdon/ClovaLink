'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, ListGroup, Badge, Tabs, Tab } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaKey, FaTrash, FaPlus, FaShieldAlt, FaQrcode, FaCheck, FaTimes, FaLock, FaUser } from 'react-icons/fa';
import { startAttestation } from '@simplewebauthn/browser';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface Passkey {
  id: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string;
}

export default function AccountPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  
  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpSetupMode, setTotpSetupMode] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [totpSecret, setTotpSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const require2fa = searchParams?.get('require2fa') === 'true';

  useEffect(() => {
    fetchPasskeys();
    fetchTOTPStatus();
    check2FARequirement();
    
    if (require2fa) {
      setActiveTab('security');
    }
  }, []);

  // Client-side protection: Block navigation if 2FA is required and user doesn't have it
  useEffect(() => {
    if (!needs2FA) return; // User doesn't need 2FA, allow navigation
    
    // User needs 2FA - check periodically and redirect if they navigate away
    const checkAndBlock = async () => {
      // Re-check 2FA status from server
      const response = await fetch('/api/auth/check-2fa-requirement');
      if (response.ok) {
        const data = await response.json();
        if (data.needs2FA && pathname && !pathname.startsWith('/dashboard/account') && pathname !== '/auth/change-password') {
          console.log('[AccountPage] 🚫 User needs 2FA - blocking navigation to', pathname);
          router.replace('/dashboard/account?require2fa=true');
        }
      }
    };

    // Check on mount and periodically
    checkAndBlock();
    const interval = setInterval(checkAndBlock, 2000);
    
    return () => clearInterval(interval);
  }, [pathname, needs2FA, router]);

  const check2FARequirement = async () => {
    try {
      const response = await fetch('/api/auth/check-2fa-requirement');
      if (response.ok) {
        const data = await response.json();
        setTwoFactorRequired(data.required || false);
        setNeeds2FA(data.needs2FA || false);
        console.log('[AccountPage] 2FA check:', { required: data.required, has2FA: data.has2FA, needs2FA: data.needs2FA });
      }
    } catch (err) {
      console.error('Error checking 2FA requirement:', err);
    }
  };

  const fetchPasskeys = async () => {
    try {
      const response = await fetch('/api/passkey/list');
      if (response.ok) {
        const data = await response.json();
        setPasskeys(data.passkeys || []);
      }
    } catch (err) {
      console.error('Error fetching passkeys:', err);
    }
  };

  const fetchTOTPStatus = async () => {
    try {
      const response = await fetch('/api/totp/status');
      if (response.ok) {
        const data = await response.json();
        setTotpEnabled(data.enabled || false);
      }
    } catch (err) {
      console.error('Error fetching TOTP status:', err);
    }
  };

  const handleRegisterPasskey = async () => {
    try {
      setRegisteringPasskey(true);
      setError('');
      setSuccess('');

      const optionsRes = await fetch('/api/passkey/register/options', {
        method: 'POST',
      });

      if (!optionsRes.ok) {
        const errorData = await optionsRes.json();
        throw new Error(errorData.error || 'Failed to start passkey registration');
      }

      const { options, challenge } = await optionsRes.json();
      const registrationResponse = await startAttestation(options);

      const verifyRes = await fetch('/api/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: registrationResponse,
          challenge,
          deviceName: deviceName || 'My Device',
        }),
      });

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json();
        throw new Error(errorData.error || 'Passkey registration failed');
      }

      setSuccess('Passkey registered successfully! You can now use it to sign in.');
      setDeviceName('');
      fetchPasskeys();
      check2FARequirement();
      
      if (require2fa) {
        setTimeout(() => window.location.href = '/dashboard', 2000);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to register passkey');
    } finally {
      setRegisteringPasskey(false);
    }
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    if (!confirm('Are you sure you want to delete this passkey?')) {
      return;
    }

    try {
      const response = await fetch(`/api/passkey/delete?id=${passkeyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete passkey');
      }

      setSuccess('Passkey deleted successfully');
      fetchPasskeys();
      check2FARequirement();
    } catch (error: any) {
      setError(error.message || 'Failed to delete passkey');
    }
  };

  const handleSetup2FA = async () => {
    try {
      setTotpLoading(true);
      setError('');

      const response = await fetch('/api/totp/setup', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to setup 2FA');
      }

      const data = await response.json();
      setQrCode(data.qrCode);
      setTotpSecret(data.manualEntryKey);
      setTotpSetupMode(true);
    } catch (error: any) {
      setError(error.message || 'Failed to setup 2FA');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleVerifyAndEnable2FA = async () => {
    if (!verificationCode || !/^\d{6}$/.test(verificationCode)) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setTotpLoading(true);
      setError('');

      const response = await fetch('/api/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: verificationCode,
          secret: totpSecret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify code');
      }

      const data = await response.json();
      setBackupCodes(data.backupCodes);
      setShowBackupCodes(true);
      setTotpEnabled(true);
      setTotpSetupMode(false);
      setVerificationCode('');
      setQrCode('');
      setTotpSecret('');
      setSuccess('2FA has been enabled successfully!');
      check2FARequirement();
      
      if (require2fa) {
        setTimeout(() => {
          if (!showBackupCodes) {
            window.location.href = '/dashboard';
          }
        }, 3000);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to enable 2FA');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      setError('Please enter your password');
      return;
    }

    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    try {
      setTotpLoading(true);
      const response = await fetch('/api/totp/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disable 2FA');
      }

      setTotpEnabled(false);
      setDisablePassword('');
      setSuccess('2FA has been disabled');
      check2FARequirement();
    } catch (error: any) {
      setError(error.message || 'Failed to disable 2FA');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setChangingPassword(true);
      setError('');

      const response = await fetch('/api/employees/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }

      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setError(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const has2FA = totpEnabled || passkeys.length > 0;

  return (
    <DashboardLayout>
      <div className="settings-container">
        <div className="page-header">
          <h1 className="h3">
            <FaUser className="me-2" />
            My Account
          </h1>
          <p className="text-muted">Manage your personal account settings and security</p>
        </div>

        {require2fa && !has2FA && (
          <Alert variant="danger" className="mb-4">
            <strong>⚠️ Action Required - Two-Factor Authentication</strong>
            <p className="mb-0 mt-2">
              Your organization requires two-factor authentication. Please enable one of the following:
              <br />• <strong>Passkey</strong> (recommended) - Use Face ID, Touch ID, or security key
              <br />• <strong>Authenticator App</strong> - Use Google Authenticator, Authy, etc.
            </p>
          </Alert>
        )}

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Card>
          <Card.Body>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k || 'profile')}
              className="mb-4"
            >
              {/* Profile Tab */}
              <Tab eventKey="profile" title="Profile">
                <div className="mb-4">
                  <h5>Your Information</h5>
                  <ListGroup variant="flush">
                    <ListGroup.Item>
                      <strong>Name:</strong> {session?.user?.name}
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <strong>Email:</strong> {session?.user?.email}
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <strong>Role:</strong> <Badge bg="primary">{session?.user?.role}</Badge>
                    </ListGroup.Item>
                  </ListGroup>
                </div>

                <h5 className="mt-4">Change Password</h5>
                <Form onSubmit={handleChangePassword}>
                  <Form.Group className="mb-3">
                    <Form.Label>Current Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={changingPassword}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>New Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={changingPassword}
                      required
                    />
                    <Form.Text className="text-muted">
                      At least 8 characters with uppercase and numbers
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Confirm New Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={changingPassword}
                      required
                    />
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    disabled={changingPassword}
                  >
                    <FaLock className="me-2" />
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </Button>
                </Form>
              </Tab>

              {/* Passkeys Tab */}
              <Tab eventKey="passkeys" title="Passkeys">
                <div className="mb-4">
                  <h5>
                    <FaKey className="me-2" />
                    Your Passkeys
                  </h5>
                  <p className="text-muted">
                    Passkeys let you sign in using Face ID, Touch ID, or a security key. They're more secure than passwords and count as two-factor authentication.
                  </p>
                  
                  {has2FA && (
                    <Alert variant="success">
                      <FaCheck className="me-2" />
                      You have 2FA enabled {passkeys.length > 0 && totpEnabled ? '(Passkey + TOTP)' : passkeys.length > 0 ? '(Passkey)' : '(TOTP)'}
                    </Alert>
                  )}
                </div>

                {passkeys.length > 0 && (
                  <ListGroup className="mb-4">
                    {passkeys.map((passkey) => (
                      <ListGroup.Item
                        key={passkey.id}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <strong>{passkey.deviceName || 'Unnamed Device'}</strong>
                          <div className="text-muted small">
                            Created: {new Date(passkey.createdAt).toLocaleDateString()}
                            {' • '}
                            Last used: {new Date(passkey.lastUsedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeletePasskey(passkey.id)}
                        >
                          <FaTrash />
                        </Button>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
                
                <Form.Group className="mb-3">
                  <Form.Label>Device Name (optional)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., MacBook Pro, iPhone"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    disabled={registeringPasskey}
                  />
                </Form.Group>
                
                <Button
                  variant="primary"
                  onClick={handleRegisterPasskey}
                  disabled={registeringPasskey}
                >
                  <FaPlus className="me-2" />
                  {registeringPasskey ? 'Setting up...' : 'Add New Passkey'}
                </Button>
              </Tab>

              {/* Security (TOTP) Tab */}
              <Tab eventKey="security" title="Authenticator App">
                <div className="mb-4">
                  <h5>
                    <FaShieldAlt className="me-2" />
                    Two-Factor Authentication (TOTP)
                  </h5>
                  <p className="text-muted">
                    Use an authenticator app like Google Authenticator or Authy to generate 6-digit codes for signing in.
                  </p>
                </div>

                {twoFactorRequired && !totpEnabled && passkeys.length === 0 && (
                  <Alert variant="danger" className="mb-3">
                    <strong>⚠️ 2FA is Required</strong>
                    <p className="mb-0 mt-2">
                      Your organization requires two-factor authentication. Please set up TOTP below or add a Passkey in the Passkeys tab.
                    </p>
                  </Alert>
                )}

                {totpEnabled ? (
                  <div>
                    <Alert variant="success">
                      <FaCheck className="me-2" />
                      TOTP 2FA is currently enabled on your account
                    </Alert>
                    
                    <Form.Group className="mb-3 mt-4">
                      <Form.Label>Enter your password to disable 2FA</Form.Label>
                      <Form.Control
                        type="password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        placeholder="Your password"
                        disabled={totpLoading}
                      />
                    </Form.Group>
                    <Button
                      variant="danger"
                      onClick={handleDisable2FA}
                      disabled={totpLoading || !disablePassword}
                    >
                      <FaTimes className="me-2" />
                      {totpLoading ? 'Disabling...' : 'Disable 2FA'}
                    </Button>
                  </div>
                ) : totpSetupMode ? (
                  <div className="border p-4 rounded">
                    <Alert variant="success" className="mb-3">
                      <strong>✓ Setup Started!</strong>
                    </Alert>
                    
                    <Alert variant="info" className="mb-3">
                      <strong>Step 1:</strong> Scan this QR code with your authenticator app
                    </Alert>
                    
                    {qrCode && (
                      <div className="text-center my-4">
                        <img 
                          src={qrCode} 
                          alt="TOTP QR Code" 
                          style={{ maxWidth: '250px', border: '2px solid #667eea', borderRadius: '12px', padding: '1rem' }} 
                        />
                      </div>
                    )}
                    
                    <Alert variant="secondary" className="mb-3">
                      <strong>Can't scan?</strong> Manual entry code:
                      <div className="mt-2">
                        <code style={{ fontSize: '1.1rem' }}>{totpSecret}</code>
                      </div>
                    </Alert>
                    
                    <Alert variant="info" className="mb-3">
                      <strong>Step 2:</strong> Enter the 6-digit code from your app
                    </Alert>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Verification Code</Form.Label>
                      <Form.Control
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="text-center"
                        style={{ fontSize: '1.5rem', letterSpacing: '0.5rem', fontFamily: 'monospace' }}
                      />
                    </Form.Group>
                    
                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        onClick={handleVerifyAndEnable2FA}
                        disabled={totpLoading || verificationCode.length !== 6}
                      >
                        <FaCheck className="me-2" />
                        {totpLoading ? 'Verifying...' : 'Verify and Enable'}
                      </Button>
                      <Button
                        variant="outline-secondary"
                        onClick={() => {
                          setTotpSetupMode(false);
                          setQrCode('');
                          setTotpSecret('');
                          setVerificationCode('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Alert variant="warning">
                      <FaShieldAlt className="me-2" />
                      TOTP 2FA is not enabled
                    </Alert>
                    
                    <Button
                      variant="primary"
                      onClick={handleSetup2FA}
                      disabled={totpLoading}
                      className="mt-3"
                    >
                      <FaQrcode className="me-2" />
                      {totpLoading ? 'Setting up...' : 'Enable TOTP 2FA'}
                    </Button>
                  </div>
                )}

                {showBackupCodes && backupCodes.length > 0 && (
                  <Alert variant="warning" className="mt-4">
                    <strong>⚠️ Save these backup codes!</strong>
                    <p className="mb-2 mt-2">Save them in a safe place - they won't be shown again.</p>
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {backupCodes.map((code, index) => (
                        <Badge key={index} bg="secondary" className="p-2" style={{ fontFamily: 'monospace' }}>
                          {code}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => {
                        setShowBackupCodes(false);
                        if (require2fa) {
                          setTimeout(() => window.location.href = '/dashboard', 500);
                        }
                      }}
                    >
                      I've saved these codes{require2fa && ' - Continue to Dashboard'}
                    </Button>
                  </Alert>
                )}
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      </div>
    </DashboardLayout>
  );
}

