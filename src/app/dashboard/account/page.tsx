'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, ListGroup, Badge, Tabs, Tab } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaKey, FaTrash, FaPlus, FaShieldAlt, FaQrcode, FaCheck, FaTimes, FaLock, FaUser, FaCog } from 'react-icons/fa';
import { startAttestation } from '@simplewebauthn/browser';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { formatRoleLabel, getRoleBadgeVariant } from '@/lib/utils/roles';

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
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState('');
  
  // Profile picture state
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  
  // Advanced security state
  const [showAdvancedSecurity, setShowAdvancedSecurity] = useState(false);

  const require2fa = searchParams?.get('require2fa') === 'true';
  const roleLabel = formatRoleLabel(session?.user?.role);
  const roleBadgeVariant = getRoleBadgeVariant(session?.user?.role);

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

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    let feedback = '';

    if (password.length === 0) {
      setPasswordStrength(0);
      setPasswordFeedback('');
      return;
    }

    // Length check
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (password.length >= 16) strength += 1;

    // Character variety checks
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    // Set feedback
    if (strength <= 2) {
      feedback = 'Weak - Add more characters and variety';
    } else if (strength <= 4) {
      feedback = 'Fair - Consider adding special characters';
    } else if (strength <= 5) {
      feedback = 'Good - Your password is reasonably strong';
    } else {
      feedback = 'Excellent - Very strong password!';
    }

    setPasswordStrength(Math.min(strength, 6));
    setPasswordFeedback(feedback);
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

    if (passwordStrength < 3) {
      setError('Please choose a stronger password');
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
      setPasswordStrength(0);
      setPasswordFeedback('');
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
                        <div className="d-flex gap-2 align-items-center">
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
                              size="sm"
                              onClick={handleRemoveProfilePicture}
                              disabled={uploadingPicture}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
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
                        <Badge bg={roleBadgeVariant} className="role-badge">{roleLabel}</Badge>
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

              {/* Security Tab */}
              <Tab eventKey="security" title="Security">
                
                {/* Security Overview */}
                <div className="security-overview-card">
                  <div className="security-status-header">
                    <div className="status-icon">
                      <FaShieldAlt />
                    </div>
                    <div>
                      <h5 className="status-title">Account Security Status</h5>
                      <p className="status-subtitle">
                        {has2FA ? '✓ Your account is protected with 2FA' : '⚠ Two-factor authentication is not enabled'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="security-metrics">
                    <div className={`security-metric ${has2FA ? 'metric-success' : 'metric-warning'}`}>
                      <div className="metric-label">Two-Factor Auth</div>
                      <div className="metric-value">{has2FA ? 'Enabled' : 'Disabled'}</div>
                      <div className="metric-detail">
                        {passkeys.length > 0 && totpEnabled && '✓ Passkey + TOTP'}
                        {passkeys.length > 0 && !totpEnabled && '✓ Passkey only'}
                        {!passkeys.length && totpEnabled && '✓ TOTP only'}
                        {!has2FA && '⚠ Not configured'}
                      </div>
                    </div>
                    <div className="security-metric metric-info">
                      <div className="metric-label">Passkeys</div>
                      <div className="metric-value">{passkeys.length}</div>
                      <div className="metric-detail">Registered devices</div>
                    </div>
                    <div className="security-metric metric-info">
                      <div className="metric-label">Authenticator</div>
                      <div className="metric-value">{totpEnabled ? 'Active' : 'Inactive'}</div>
                      <div className="metric-detail">TOTP status</div>
                    </div>
                  </div>

                  {twoFactorRequired && !has2FA && (
                    <Alert variant="danger" className="mt-3 mb-0">
                      <strong>⚠️ Action Required</strong>
                      <p className="mb-0 mt-2">
                        Your organization requires two-factor authentication. Please enable at least one method below.
                      </p>
                    </Alert>
                  )}
                </div>

                {/* Passkeys Section */}
                <div className="profile-section-card">
                  <div className="section-header">
                    <div className="section-icon">
                      <FaKey />
                    </div>
                    <h5 className="section-title">Passkeys (Recommended)</h5>
                    <Badge bg="success" className="ms-auto">Most Secure</Badge>
                  </div>
                  <div className="section-content">
                    <p className="section-description">
                      Sign in using Face ID, Touch ID, Windows Hello, or a hardware security key. Passkeys are phishing-resistant and provide the highest level of security.
                    </p>
                    
                    <div className="feature-benefits mb-3">
                      <div className="benefit-item"><FaCheck className="text-success me-2" />No passwords to remember</div>
                      <div className="benefit-item"><FaCheck className="text-success me-2" />Phishing resistant</div>
                      <div className="benefit-item"><FaCheck className="text-success me-2" />Works across all your devices</div>
                    </div>

                    {passkeys.length > 0 && (
                      <div className="passkeys-list mb-4">
                        <h6 style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>Your Passkeys</h6>
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
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Device Name (optional)</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="e.g., MacBook Pro, iPhone 15"
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        disabled={registeringPasskey}
                        className="modern-input"
                      />
                      <Form.Text>
                        Give your device a name to identify it later
                      </Form.Text>
                    </Form.Group>
                    
                    <Button
                      onClick={handleRegisterPasskey}
                      disabled={registeringPasskey}
                      className="gradient-btn"
                    >
                      <FaPlus className="me-2" />
                      {registeringPasskey ? 'Setting up passkey...' : 'Add New Passkey'}
                    </Button>
                  </div>
                </div>

                {/* TOTP Section */}
                <div className="profile-section-card">
                  <div className="section-header">
                    <div className="section-icon">
                      <FaShieldAlt />
                    </div>
                    <h5 className="section-title">Authenticator App (TOTP)</h5>
                    {totpEnabled && <Badge bg="success" className="ms-auto">Enabled</Badge>}
                  </div>
                  <div className="section-content">
                    <p className="section-description">
                      Use Google Authenticator, Authy, or similar apps to generate 6-digit time-based codes for signing in. More compatible but slightly less secure than passkeys.
                    </p>
                    
                    <div className="feature-benefits mb-3">
                      <div className="benefit-item"><FaCheck className="text-info me-2" />Works on all devices</div>
                      <div className="benefit-item"><FaCheck className="text-info me-2" />No hardware required</div>
                      <div className="benefit-item"><FaCheck className="text-info me-2" />Widely supported</div>
                    </div>

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

                {/* Password Management */}
                <div className="profile-section-card">
                  <div className="section-header">
                    <div className="section-icon">
                      <FaLock />
                    </div>
                    <h5 className="section-title">Password Management</h5>
                  </div>
                  <div className="section-content">
                    <p className="section-description">
                      Change your password regularly to keep your account secure. Use a strong, unique password.
                    </p>

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
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            checkPasswordStrength(e.target.value);
                          }}
                          disabled={changingPassword}
                          required
                          className="modern-input"
                        />
                        {newPassword && (
                          <div className="password-strength-container mt-2">
                            <div className="strength-bars">
                              {[1, 2, 3, 4, 5, 6].map((level) => (
                                <div
                                  key={level}
                                  className={`strength-bar ${
                                    passwordStrength >= level
                                      ? passwordStrength <= 2
                                        ? 'weak'
                                        : passwordStrength <= 4
                                        ? 'fair'
                                        : passwordStrength <= 5
                                        ? 'good'
                                        : 'excellent'
                                      : ''
                                  }`}
                                />
                              ))}
                            </div>
                            <div className="strength-feedback">{passwordFeedback}</div>
                          </div>
                        )}
                        <Form.Text>
                          At least 8 characters with uppercase, lowercase, and numbers
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

                      <div className="password-requirements">
                        <div className="requirement-title">Password Requirements:</div>
                        <div className={`requirement-item ${newPassword.length >= 8 ? 'met' : ''}`}>
                          <FaCheck className="me-2" />
                          At least 8 characters
                        </div>
                        <div className={`requirement-item ${/[A-Z]/.test(newPassword) ? 'met' : ''}`}>
                          <FaCheck className="me-2" />
                          One uppercase letter
                        </div>
                        <div className={`requirement-item ${/[a-z]/.test(newPassword) ? 'met' : ''}`}>
                          <FaCheck className="me-2" />
                          One lowercase letter
                        </div>
                        <div className={`requirement-item ${/[0-9]/.test(newPassword) ? 'met' : ''}`}>
                          <FaCheck className="me-2" />
                          One number
                        </div>
                        <div className={`requirement-item ${/[^A-Za-z0-9]/.test(newPassword) ? 'met' : ''}`}>
                          <FaCheck className="me-2" />
                          One special character (recommended)
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={changingPassword || passwordStrength < 3}
                        className="gradient-btn mt-3"
                      >
                        <FaLock className="me-2" />
                        {changingPassword ? 'Changing Password...' : 'Change Password'}
                      </Button>
                    </Form>
                  </div>
                </div>

                {/* Advanced Security Options */}
                <div className="profile-section-card">
                  <div className="section-header">
                    <div className="section-icon">
                      <FaCog />
                    </div>
                    <h5 className="section-title">Advanced Security</h5>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowAdvancedSecurity(!showAdvancedSecurity)}
                      className="ms-auto"
                      style={{ color: '#667eea', textDecoration: 'none' }}
                    >
                      {showAdvancedSecurity ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  {showAdvancedSecurity && (
                    <div className="section-content">
                      <Alert variant="info" className="modern-alert">
                        <strong>Security Recommendations</strong>
                        <ul className="mb-0 mt-2" style={{ paddingLeft: '1.2rem' }}>
                          <li>Enable both passkey and authenticator app for maximum security</li>
                          <li>Use unique passwords for each service</li>
                          <li>Never share your backup codes with anyone</li>
                          <li>Review your active passkeys regularly</li>
                          <li>Change your password if you suspect it has been compromised</li>
                        </ul>
                      </Alert>

                      <div className="security-info-grid">
                        <div className="security-info-item">
                          <div className="info-icon">🔒</div>
                          <div className="info-content">
                            <div className="info-title">Account Recovery</div>
                            <div className="info-text">
                              Your backup codes can be used to access your account if you lose access to your 2FA devices.
                              Keep them safe!
                            </div>
                          </div>
                        </div>

                        <div className="security-info-item">
                          <div className="info-icon">📱</div>
                          <div className="info-content">
                            <div className="info-title">Device Management</div>
                            <div className="info-text">
                              You have {passkeys.length} registered passkey{passkeys.length !== 1 ? 's' : ''}. 
                              {passkeys.length === 0 && ' Consider adding one for enhanced security.'}
                            </div>
                          </div>
                        </div>

                        <div className="security-info-item">
                          <div className="info-icon">⚡</div>
                          <div className="info-content">
                            <div className="info-title">Session Security</div>
                            <div className="info-text">
                              Your session will automatically expire after a period of inactivity to protect your account.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
            background: #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: white;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            position: relative;
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
            background: #667eea;
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
            background: rgba(102, 126, 234, 0.2);
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
            background: #667eea !important;
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

          

          

          :global(.gradient-btn:hover) {
            transform: translateY(-1px) !important;
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

          :global(.btn-outline-danger.btn-sm) {
            padding: 0.4rem 0.85rem !important;
            font-size: 0.85rem !important;
          }

          :global(.btn-outline-danger:hover) {
            background: rgba(220, 53, 69, 0.2) !important;
            border-color: rgba(220, 53, 69, 0.6) !important;
            transform: translateY(-1px) !important;
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

          /* Security Overview */
          .security-overview-card {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 14px;
            padding: 1.5rem;
            margin-bottom: 1.25rem;
          }

          .security-status-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.25rem;
          }

          .status-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: white;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }

          .status-title {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 700;
            color: #ffffff !important;
          }

          .status-subtitle {
            margin: 0.25rem 0 0 0;
            color: rgba(255, 255, 255, 0.75);
            font-size: 0.9rem;
          }

          .security-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 0.75rem;
          }

          .security-metric {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 1rem;
            text-align: center;
          }

          .metric-success {
            border-color: rgba(82, 196, 26, 0.4);
            background: rgba(82, 196, 26, 0.1);
          }

          .metric-warning {
            border-color: rgba(255, 193, 7, 0.4);
            background: rgba(255, 193, 7, 0.1);
          }

          .metric-info {
            border-color: rgba(102, 126, 234, 0.3);
          }

          .metric-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 0.5rem;
          }

          .metric-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 0.25rem;
          }

          .metric-detail {
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.7);
          }

          /* Feature Benefits */
          .feature-benefits {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .benefit-item {
            display: flex;
            align-items: center;
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
          }

          .benefit-item svg {
            font-size: 0.85rem;
          }

          :global(.text-success) {
            color: #52c41a !important;
          }

          :global(.text-info) {
            color: #667eea !important;
          }

          /* Password Strength Indicator */
          .password-strength-container {
            margin-top: 0.75rem;
          }

          .strength-bars {
            display: flex;
            gap: 0.3rem;
            margin-bottom: 0.5rem;
          }

          .strength-bar {
            flex: 1;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            transition: all 0.3s ease;
          }

          .strength-bar.weak {
            background: #ff4d4f;
          }

          .strength-bar.fair {
            background: #faad14;
          }

          .strength-bar.good {
            background: #52c41a;
          }

          .strength-bar.excellent {
            background: #1890ff;
          }

          .strength-feedback {
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
          }

          /* Password Requirements */
          .password-requirements {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 10px;
            padding: 1rem;
            margin-top: 1rem;
          }

          .requirement-title {
            font-size: 0.9rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 0.75rem;
          }

          .requirement-item {
            display: flex;
            align-items: center;
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.85rem;
            margin-bottom: 0.5rem;
            transition: all 0.3s ease;
          }

          .requirement-item:last-child {
            margin-bottom: 0;
          }

          .requirement-item.met {
            color: #52c41a;
          }

          .requirement-item svg {
            font-size: 0.75rem;
            opacity: 0.3;
          }

          .requirement-item.met svg {
            opacity: 1;
          }

          /* Security Info Grid */
          .security-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
          }

          .security-info-item {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 10px;
            padding: 1rem;
            display: flex;
            gap: 1rem;
            transition: all 0.3s ease;
          }

          .security-info-item:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(102, 126, 234, 0.4);
          }

          .info-icon {
            font-size: 1.75rem;
            flex-shrink: 0;
          }

          .info-content {
            flex: 1;
            min-width: 0;
          }

          .info-title {
            font-size: 0.95rem;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 0.5rem;
          }

          .info-text {
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.4;
          }

          /* Mobile Responsive for New Components */
          @media (max-width: 767px) {
            .security-metrics {
              grid-template-columns: 1fr;
              gap: 0.5rem;
            }

            .security-info-grid {
              grid-template-columns: 1fr;
              gap: 0.75rem;
            }

            .security-overview-card {
              padding: 1rem;
            }

            .status-icon {
              width: 40px;
              height: 40px;
              font-size: 1.2rem;
            }

            .status-title {
              font-size: 1.1rem;
            }

            .metric-value {
              font-size: 1.25rem;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}

