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
  
  // Profile picture state
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const require2fa = searchParams?.get('require2fa') === 'true';

  useEffect(() => {
    fetchPasskeys();
    fetchTOTPStatus();
    check2FARequirement();
    fetchProfilePicture();
    
    if (require2fa) {
      setActiveTab('security');
    }
  }, []);

  const fetchProfilePicture = async () => {
    if (session?.user?.id) {
      try {
        const response = await fetch(`/api/employees/${session.user.id}`);
        if (response.ok) {
          const data = await response.json();
          setProfilePicture(data.profilePicture);
        }
      } catch (err) {
        console.error('Error fetching profile picture:', err);
      }
    }
  };

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

    // Check on mount and less frequently - every 15 seconds instead of 2
    checkAndBlock();
    const interval = setInterval(checkAndBlock, 15000);
    
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

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    try {
      setUploadingPicture(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/employees/profile-picture', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload profile picture');
      }

      const data = await response.json();
      
      // Update state with new profile picture
      setProfilePicture(data.profilePicture);
      setSuccess('Profile picture updated successfully!');
      setUploadingPicture(false);
      
      // Delay reload slightly to show success message
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error: any) {
      console.error('Profile upload error:', error);
      setError(error.message || 'Failed to upload profile picture');
      setUploadingPicture(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) {
      return;
    }

    try {
      setUploadingPicture(true);
      setError('');

      const response = await fetch('/api/employees/profile-picture', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove profile picture');
      }

      setSuccess('Profile picture removed successfully!');
      setProfilePicture(null);
      setUploadingPicture(false);
      
      // Reload page to update UI everywhere
      window.location.reload();
    } catch (error: any) {
      setError(error.message || 'Failed to remove profile picture');
      setUploadingPicture(false);
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
          <div className="header-icon">
            <FaUser />
          </div>
          <div className="header-text">
            <h1>My Account</h1>
            <p className="header-subtitle">Manage your personal account settings and security</p>
          </div>
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

        <Card className="modern-card">
          <Card.Body>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k || 'profile')}
              className="mb-4"
            >
              {/* Profile Tab */}
              <Tab eventKey="profile" title="Profile">
                {/* Profile Picture Card */}
                <div className="profile-section-card">
                  <div className="section-header">
                    <div className="section-icon">
                      <FaUser />
                    </div>
                    <h5 className="section-title">Profile Picture</h5>
                  </div>
                  <div className="section-content">
                    <div className="profile-picture-wrapper">
                      <div className="profile-avatar-large">
                        {profilePicture ? (
                          <img 
                            src={`/api/employees/profile-picture/${profilePicture}`}
                            alt="Profile"
                            loading="eager"
                          />
                        ) : (
                          <FaUser className="avatar-icon" />
                        )}
                      </div>
                      <div className="profile-actions">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureUpload}
                          disabled={uploadingPicture}
                          id="profile-picture-upload"
                          style={{ display: 'none' }}
                        />
                        <label htmlFor="profile-picture-upload" className="mb-0">
                          <Button
                            as="span"
                            className="gradient-btn"
                            disabled={uploadingPicture}
                          >
                            {uploadingPicture ? 'Uploading...' : profilePicture ? 'Change Picture' : 'Upload Picture'}
                          </Button>
                        </label>
                        {profilePicture && (
                          <Button
                            variant="outline-danger"
                            onClick={handleRemoveProfilePicture}
                            disabled={uploadingPicture}
                          >
                            Remove
                          </Button>
                        )}
                        <Form.Text className="d-block mt-2">
                          Max size: 5MB. Formats: JPEG, PNG, GIF, WebP
                        </Form.Text>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Information Card */}
                <div className="profile-section-card">
                  <div className="section-header">
                    <div className="section-icon">
                      <FaUser />
                    </div>
                    <h5 className="section-title">Your Information</h5>
                  </div>
                  <div className="section-content">
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Name</span>
                        <span className="info-value">{session?.user?.name}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Email</span>
                        <span className="info-value">{session?.user?.email}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Role</span>
                        <Badge bg="primary" className="role-badge">{session?.user?.role}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Change Password Card */}
                <div className="profile-section-card">
                  <div className="section-header">
                    <div className="section-icon">
                      <FaLock />
                    </div>
                    <h5 className="section-title">Change Password</h5>
                  </div>
                  <div className="section-content">
                    <Form onSubmit={handleChangePassword}>
                      <Form.Group className="mb-3">
                        <Form.Label>Current Password</Form.Label>
                        <Form.Control
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          disabled={changingPassword}
                          required
                          className="modern-input"
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
                          className="modern-input"
                        />
                        <Form.Text>
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
                          className="modern-input"
                        />
                      </Form.Group>

                      <Button
                        type="submit"
                        disabled={changingPassword}
                        className="gradient-btn"
                      >
                        <FaLock className="me-2" />
                        {changingPassword ? 'Changing...' : 'Change Password'}
                      </Button>
                    </Form>
                  </div>
                </div>
              </Tab>

              {/* Passkeys Tab */}
              <Tab eventKey="passkeys" title="Passkeys">
                <div className="profile-section-card">
                  <div className="section-header">
                    <div className="section-icon">
                      <FaKey />
                    </div>
                    <h5 className="section-title">Your Passkeys</h5>
                  </div>
                  <div className="section-content">
                    <p className="section-description">
                      Passkeys let you sign in using Face ID, Touch ID, or a security key. They're more secure than passwords and count as two-factor authentication.
                    </p>
                    
                    {has2FA && (
                      <Alert variant="success" className="modern-alert">
                        <FaCheck className="me-2" />
                        You have 2FA enabled {passkeys.length > 0 && totpEnabled ? '(Passkey + TOTP)' : passkeys.length > 0 ? '(Passkey)' : '(TOTP)'}
                      </Alert>
                    )}

                    {passkeys.length > 0 && (
                      <div className="passkeys-list">
                        {passkeys.map((passkey) => (
                          <div key={passkey.id} className="passkey-item">
                            <div className="passkey-icon">
                              <FaKey />
                            </div>
                            <div className="passkey-info">
                              <div className="passkey-name">{passkey.deviceName || 'Unnamed Device'}</div>
                              <div className="passkey-meta">
                                Created: {new Date(passkey.createdAt).toLocaleDateString()}
                                {' • '}
                                Last used: {new Date(passkey.lastUsedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeletePasskey(passkey.id)}
                              className="passkey-delete"
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <Form.Group className="mb-3 mt-4">
                      <Form.Label>Device Name (optional)</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g., MacBook Pro, iPhone"
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        disabled={registeringPasskey}
                        className="modern-input"
                      />
                    </Form.Group>
                    
                    <Button
                      onClick={handleRegisterPasskey}
                      disabled={registeringPasskey}
                      className="gradient-btn"
                    >
                      <FaPlus className="me-2" />
                      {registeringPasskey ? 'Setting up...' : 'Add New Passkey'}
                    </Button>
                  </div>
                </div>
              </Tab>

              {/* Security (TOTP) Tab */}
              <Tab eventKey="security" title="Authenticator App">
                <div className="profile-section-card">
                  <div className="section-header">
                    <div className="section-icon">
                      <FaShieldAlt />
                    </div>
                    <h5 className="section-title">Two-Factor Authentication (TOTP)</h5>
                  </div>
                  <div className="section-content">
                    <p className="section-description">
                      Use an authenticator app like Google Authenticator or Authy to generate 6-digit codes for signing in.
                    </p>

                    {twoFactorRequired && !totpEnabled && passkeys.length === 0 && (
                      <Alert variant="danger" className="modern-alert">
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
                      <Alert variant="warning" className="mt-4 modern-alert">
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
                  </div>
                </div>
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>

        <style jsx>{`
          .settings-container {
            padding: 1rem;
            max-width: 1400px;
            margin: 0 auto;
          }

          /* Page Header */
          .page-header {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            margin-bottom: 2rem;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 16px;
            padding: 1.75rem 2rem;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(102, 126, 234, 0.2);
          }

          .page-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
            background-size: 200% 100%;
            animation: shimmer 3s linear infinite;
          }

          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }

          .header-icon {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: white;
            flex-shrink: 0;
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
            position: relative;
          }

          .header-icon::after {
            content: '';
            position: absolute;
            inset: -2px;
            border-radius: 16px;
            padding: 2px;
            background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1));
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
          }

          .header-text {
            flex: 1;
            min-width: 0;
          }

          .page-header h1 {
            margin: 0;
            font-size: 1.75rem;
            font-weight: 700;
            color: #ffffff !important;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          }

          .header-subtitle {
            margin: 0.35rem 0 0 0;
            color: rgba(255, 255, 255, 0.75) !important;
            font-size: 0.95rem;
            font-weight: 400;
          }

          /* Desktop Nav Tabs */
          :global(.nav-tabs .nav-link) {
            color: rgba(255, 255, 255, 0.7) !important;
            border: none !important;
            border-bottom: 2px solid transparent !important;
            background: transparent !important;
            transition: all 0.2s ease !important;
          }

          :global(.nav-tabs .nav-link.active) {
            color: #ffffff !important;
            background: transparent !important;
            border-bottom-color: #667eea !important;
          }

          :global(.nav-tabs .nav-link:hover:not(.active)) {
            color: rgba(255, 255, 255, 0.9) !important;
          }

          @media (min-width: 1024px) {
            .settings-container {
              padding: 2rem;
            }
          }

          @media (max-width: 767px) {
            .settings-container {
              padding: 0.5rem;
            }

            .page-header {
              flex-direction: column;
              align-items: center;
              gap: 0.75rem;
              padding: 1rem;
              margin-bottom: 1rem !important;
            }

            .header-icon {
              width: 42px !important;
              height: 42px !important;
              font-size: 1.1rem !important;
            }

            .header-text {
              text-align: center;
              width: 100%;
            }

            .page-header h1 {
              font-size: 1.35rem !important;
            }

            .header-subtitle {
              font-size: 0.8rem !important;
            }

            :global(.card) {
              margin-bottom: 1rem !important;
            }

            :global(.card .card-body) {
              padding: 0.875rem !important;
            }

            :global(.nav-tabs) {
              display: flex !important;
              overflow-x: auto !important;
              white-space: nowrap !important;
              -webkit-overflow-scrolling: touch !important;
              scrollbar-width: none !important;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
              margin-bottom: 0.75rem !important;
              gap: 0 !important;
            }

            :global(.nav-tabs::-webkit-scrollbar) {
              display: none;
            }

            :global(.nav-tabs .nav-link) {
              padding: 0.65rem 1rem !important;
              font-size: 0.85rem !important;
              font-weight: 500 !important;
              text-align: center !important;
              white-space: nowrap !important;
              border: none !important;
              border-bottom: 2px solid transparent !important;
              border-radius: 0 !important;
              background: transparent !important;
              color: rgba(255, 255, 255, 0.7) !important;
              transition: all 0.2s ease !important;
              margin: 0 !important;
              display: inline-block !important;
            }

            :global(.nav-tabs .nav-link.active) {
              color: #ffffff !important;
              border-bottom-color: #667eea !important;
            }

            :global(.nav-tabs .nav-link:hover:not(.active)) {
              color: rgba(255, 255, 255, 0.9) !important;
            }

            :global(.tab-content) {
              padding-top: 0.75rem !important;
            }

            :global(.form-group) {
              margin-bottom: 1rem !important;
            }

            :global(.form-label) {
              font-size: 0.9rem !important;
              font-weight: 500 !important;
            }

            :global(.form-control),
            :global(.form-select) {
              font-size: 0.9rem !important;
              padding: 0.75rem 1rem !important;
            }

            :global(.form-text) {
              font-size: 0.85rem !important;
            }

            :global(.btn) {
              font-size: 0.875rem !important;
              padding: 0.65rem 1rem !important;
            }

            :global(.list-group-item) {
              padding: 0.75rem !important;
              font-size: 0.875rem !important;
            }

            :global(.alert) {
              padding: 0.75rem !important;
              font-size: 0.875rem !important;
              margin-bottom: 1rem !important;
            }

            :global(h5) {
              font-size: 1.1rem !important;
              margin-bottom: 0.75rem !important;
            }

            :global(p) {
              font-size: 0.9rem !important;
            }

            :global(.text-muted) {
              font-size: 0.85rem !important;
            }
          }

          /* Modern Card Styling */
          :global(.modern-card) {
            background: rgba(255, 255, 255, 0.03) !important;
            border: 1px solid rgba(102, 126, 234, 0.2) !important;
            border-radius: 16px !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
            backdrop-filter: blur(10px) !important;
            margin-bottom: 2rem !important;
          }

          :global(.modern-card .card-body) {
            padding: 2rem !important;
          }

          /* Profile Section Cards */
          .profile-section-card {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 14px;
            padding: 1.25rem;
            margin-bottom: 1.25rem;
            transition: all 0.3s ease;
          }

          .profile-section-card:hover {
            border-color: rgba(102, 126, 234, 0.4);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.12);
            transform: translateY(-1px);
          }

          .section-header {
            display: flex;
            align-items: center;
            gap: 0.85rem;
            margin-bottom: 1rem;
            padding-bottom: 0.85rem;
            border-bottom: 1px solid rgba(102, 126, 234, 0.2);
          }

          .section-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1rem;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }

          .section-title {
            margin: 0 !important;
            font-size: 1.1rem !important;
            font-weight: 600 !important;
            color: #ffffff !important;
          }

          .section-content {
            padding-top: 0.25rem;
          }

          .section-description {
            color: rgba(255, 255, 255, 0.75) !important;
            margin-bottom: 1rem;
            line-height: 1.5;
            font-size: 0.9rem;
          }

          /* Profile Picture Styling */
          .profile-picture-wrapper {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            flex-wrap: wrap;
          }

          .profile-avatar-large {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            overflow: hidden;
            border: 3px solid #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.05);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            position: relative;
            flex-shrink: 0;
          }

          .profile-avatar-large img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .profile-avatar-large .avatar-icon {
            font-size: 2.5rem;
            color: #ffffff;
          }

          .profile-actions {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .profile-actions .d-flex {
            gap: 0.5rem;
          }

          .profile-actions :global(.form-text) {
            color: rgba(255, 255, 255, 0.6) !important;
            font-size: 0.85rem !important;
            margin-top: 0.25rem !important;
          }

          /* Info Grid */
          .info-grid {
            display: grid;
            gap: 0.75rem;
          }

          .info-item {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(102, 126, 234, 0.15);
            border-radius: 10px;
            padding: 0.85rem 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
            transition: all 0.3s ease;
          }

          .info-item:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(102, 126, 234, 0.3);
          }

          .info-label {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .info-value {
            color: #ffffff !important;
            font-size: 1rem;
            font-weight: 600;
          }

          :global(.role-badge) {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            padding: 0.4rem 0.85rem !important;
            font-size: 0.85rem !important;
            font-weight: 600 !important;
            border-radius: 8px !important;
            display: inline-block !important;
            width: fit-content !important;
          }

          /* Passkeys List */
          .passkeys-list {
            display: flex;
            flex-direction: column;
            gap: 0.65rem;
            margin-bottom: 1.25rem;
          }

          .passkey-item {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 10px;
            padding: 0.85rem;
            display: flex;
            align-items: center;
            gap: 0.85rem;
            transition: all 0.3s ease;
          }

          .passkey-item:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(102, 126, 234, 0.4);
            transform: translateX(3px);
          }

          .passkey-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #667eea;
            font-size: 0.9rem;
            flex-shrink: 0;
          }

          .passkey-info {
            flex: 1;
            min-width: 0;
          }

          .passkey-name {
            color: #ffffff !important;
            font-weight: 600;
            margin-bottom: 0.2rem;
            font-size: 0.95rem;
          }

          .passkey-meta {
            color: rgba(255, 255, 255, 0.6) !important;
            font-size: 0.8rem;
          }

          .passkey-delete {
            flex-shrink: 0;
          }

          :global(.passkey-delete) {
            padding: 0.4rem 0.65rem !important;
            font-size: 0.85rem !important;
          }

          /* Modern Inputs */
          :global(.modern-input) {
            background: rgba(255, 255, 255, 0.05) !important;
            border: 1px solid rgba(102, 126, 234, 0.3) !important;
            border-radius: 8px !important;
            color: #ffffff !important;
            padding: 0.65rem 0.9rem !important;
            transition: all 0.3s ease !important;
            font-size: 0.95rem !important;
          }

          :global(.modern-input:focus) {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: #667eea !important;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2) !important;
            color: #ffffff !important;
          }

          :global(.modern-input::placeholder) {
            color: rgba(255, 255, 255, 0.4) !important;
          }

          :global(.form-label) {
            color: rgba(255, 255, 255, 0.85) !important;
            font-weight: 500 !important;
            font-size: 0.9rem !important;
            margin-bottom: 0.5rem !important;
          }

          :global(.form-text) {
            color: rgba(255, 255, 255, 0.6) !important;
            font-size: 0.85rem !important;
          }

          /* Gradient Button */
          :global(.gradient-btn) {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border: none !important;
            padding: 0.65rem 1.25rem !important;
            border-radius: 8px !important;
            font-weight: 600 !important;
            font-size: 0.95rem !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
            color: white !important;
            position: relative;
            overflow: hidden;
          }

          :global(.gradient-btn::before) {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
          }

          :global(.gradient-btn:hover::before) {
            width: 300px;
            height: 300px;
          }

          :global(.gradient-btn:hover) {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 18px rgba(102, 126, 234, 0.6) !important;
          }

          :global(.gradient-btn:active) {
            transform: translateY(0) !important;
          }

          :global(.gradient-btn:disabled) {
            opacity: 0.6 !important;
            cursor: not-allowed !important;
            transform: none !important;
          }

          :global(.btn-outline-danger) {
            background: rgba(220, 53, 69, 0.1) !important;
            border: 1px solid rgba(220, 53, 69, 0.4) !important;
            color: #dc3545 !important;
            padding: 0.65rem 1.25rem !important;
            border-radius: 8px !important;
            font-weight: 600 !important;
            font-size: 0.95rem !important;
            transition: all 0.3s ease !important;
          }

          :global(.btn-outline-danger:hover) {
            background: rgba(220, 53, 69, 0.2) !important;
            border-color: rgba(220, 53, 69, 0.6) !important;
            transform: translateY(-2px) !important;
          }

          /* Modern Alert */
          :global(.modern-alert) {
            border-radius: 12px !important;
            border-width: 1px !important;
            backdrop-filter: blur(10px) !important;
          }

          /* Mobile Adjustments for New Styles */
          @media (max-width: 767px) {
            .profile-section-card {
              padding: 1rem;
            }

            .section-icon {
              width: 36px;
              height: 36px;
              font-size: 1rem;
            }

            .section-header h5 {
              font-size: 1.1rem;
            }

            .profile-picture-wrapper {
              flex-direction: column;
              align-items: flex-start;
              gap: 1rem;
            }

            .profile-avatar-large {
              width: 100px;
              height: 100px;
            }

            .profile-avatar-large .avatar-icon {
              font-size: 2.5rem;
            }

            .profile-actions {
              width: 100%;
            }

            .info-item {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;
            }

            .passkey-item {
              flex-wrap: wrap;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}

