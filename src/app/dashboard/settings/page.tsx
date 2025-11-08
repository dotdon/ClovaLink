'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Tabs, Tab, Spinner, ListGroup, Badge } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import ThemedModal from '@/components/ui/ThemedModal';
import { FaSave, FaSync, FaCog, FaKey, FaTrash, FaPlus, FaShieldAlt, FaQrcode, FaCheck, FaTimes, FaBuilding, FaExclamationTriangle, FaUsers, FaFileAlt, FaHdd } from 'react-icons/fa';
import { startAttestation } from '@simplewebauthn/browser';

interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
  isEncrypted: boolean;
}

interface SettingsGroup {
  [category: string]: Setting[];
}

interface Passkey {
  id: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsGroup>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('smtp');
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
  const [require2FA, setRequire2FA] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedCategory, setSavedCategory] = useState('');

  // Company management state
  const [companies, setCompanies] = useState<any[]>([]);
  const [showDeleteCompanyModal, setShowDeleteCompanyModal] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<any>(null);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');

  // Local form state
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
    fetchPasskeys();
    fetchTOTPStatus();
    check2FARequirement();
    fetchCompanies();
    
    // Check URL params for require2fa flag
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('require2fa') === 'true') {
      setRequire2FA(true);
      setActiveTab('security');
    }
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDeleteCompanyClick = (company: any) => {
    setCompanyToDelete(company);
    setShowDeleteCompanyModal(true);
    setTwoFACode('');
  };

  const handleDeleteCompanyConfirm = async () => {
    if (!companyToDelete) return;

    // Verify 2FA is enabled
    if (!totpEnabled && passkeys.length === 0) {
      setError('You must have 2FA enabled to delete companies');
      return;
    }

    // Verify 2FA code if TOTP is enabled
    if (totpEnabled && (!twoFACode || !/^\d{6}$/.test(twoFACode))) {
      setError('Please enter a valid 6-digit 2FA code');
      return;
    }

    setIsDeletingCompany(true);
    try {
      // Verify 2FA code first
      if (totpEnabled) {
        const verifyResponse = await fetch('/api/totp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: twoFACode }),
        });

        if (!verifyResponse.ok) {
          throw new Error('Invalid 2FA code');
        }
      }

      // Delete company
      const response = await fetch(`/api/companies/${companyToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete company');
      }

      setSuccess('Company deleted successfully');
      setCompanies(companies.filter(c => c.id !== companyToDelete.id));
      setShowDeleteCompanyModal(false);
      setCompanyToDelete(null);
      setTwoFACode('');
    } catch (error: any) {
      setError(error.message || 'Failed to delete company');
    } finally {
      setIsDeletingCompany(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);

      // Initialize form data
      const initialData: Record<string, string> = {};
      Object.values(data).flat().forEach((setting: Setting) => {
        initialData[setting.key] = setting.value;
      });
      setFormData(initialData);
    } catch (err) {
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const fetchPasskeys = async () => {
    try {
      const response = await fetch('/api/passkey/list');
      if (!response.ok) throw new Error('Failed to fetch passkeys');
      const data = await response.json();
      setPasskeys(data.passkeys || []);
    } catch (err) {
      console.error('Error fetching passkeys:', err);
    }
  };

  const handleRegisterPasskey = async () => {
    try {
      setRegisteringPasskey(true);
      setError('');
      setSuccess('');

      // Step 1: Get registration options
      const optionsRes = await fetch('/api/passkey/register/options', {
        method: 'POST',
      });

      if (!optionsRes.ok) {
        const errorData = await optionsRes.json();
        throw new Error(errorData.error || 'Failed to start passkey registration');
      }

      const { options, challenge } = await optionsRes.json();

      // Step 2: Start registration with browser
      const registrationResponse = await startAttestation(options);

      // Step 3: Verify registration
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

      setSuccess('Passkey registered successfully!');
      setDeviceName('');
      fetchPasskeys();
      setHasPasskey(true);
      setRequire2FA(false); // Clear the requirement flag
      check2FARequirement(); // Refresh requirement status
    } catch (error: any) {
      setError(error.message || 'Failed to register passkey. Please try again.');
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
      check2FARequirement(); // Refresh requirement status after deleting passkey
    } catch (error: any) {
      setError(error.message || 'Failed to delete passkey');
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

  const check2FARequirement = async () => {
    try {
      const response = await fetch('/api/auth/check-2fa-requirement');
      if (response.ok) {
        const data = await response.json();
        setTwoFactorRequired(data.required || false);
        setHasPasskey(passkeys.length > 0);
      }
    } catch (err) {
      console.error('Error checking 2FA requirement:', err);
    }
  };

  const handleSetup2FA = async () => {
    try {
      setTotpLoading(true);
      setError('');
      setSuccess('');

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
      setSuccess('');

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
      setRequire2FA(false); // Clear the requirement flag
      check2FARequirement(); // Refresh requirement status
    } catch (error: any) {
      setError(error.message || 'Failed to enable 2FA');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      setError('Please enter your password to disable 2FA');
      return;
    }

    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    try {
      setTotpLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/totp/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: disablePassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disable 2FA');
      }

      setTotpEnabled(false);
      setDisablePassword('');
      setSuccess('2FA has been disabled successfully');
    } catch (error: any) {
      setError(error.message || 'Failed to disable 2FA');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleSaveCategory = async (category: string) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Define default settings for each category
      const defaultSettings: Record<string, Array<{ key: string; description: string; isEncrypted: boolean; defaultValue: string }>> = {
        smtp: [
          { key: 'smtp_host', description: 'SMTP server hostname (e.g., smtp.gmail.com)', isEncrypted: false, defaultValue: '' },
          { key: 'smtp_port', description: 'SMTP server port (587 for TLS, 465 for SSL)', isEncrypted: false, defaultValue: '587' },
          { key: 'smtp_user', description: 'SMTP authentication username', isEncrypted: false, defaultValue: '' },
          { key: 'smtp_password', description: 'SMTP authentication password', isEncrypted: true, defaultValue: '' },
          { key: 'smtp_from', description: 'From email address for outgoing emails', isEncrypted: false, defaultValue: '' },
          { key: 'smtp_from_name', description: 'From name for outgoing emails', isEncrypted: false, defaultValue: 'ClovaLink' },
          { key: 'smtp_secure', description: 'Use SSL/TLS (true/false)', isEncrypted: false, defaultValue: 'false' },
          { key: 'enable_email_notifications', description: 'Enable email notifications (true/false)', isEncrypted: false, defaultValue: 'true' },
        ],
        upload: [
          { key: 'max_upload_size', description: 'Maximum file upload size in bytes (100MB = 104857600)', isEncrypted: false, defaultValue: '104857600' },
          { key: 'allowed_file_types', description: 'Comma-separated list of allowed file extensions', isEncrypted: false, defaultValue: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip' },
          { key: 'upload_dir', description: 'Directory path for uploaded files', isEncrypted: false, defaultValue: './uploads' },
          { key: 'enable_virus_scan', description: 'Enable virus scanning on upload (true/false)', isEncrypted: false, defaultValue: 'false' },
          { key: 'auto_delete_expired', description: 'Auto-delete expired documents (true/false)', isEncrypted: false, defaultValue: 'true' },
          { key: 'storage_limit_gb', description: 'Total storage limit in GB (0 = unlimited)', isEncrypted: false, defaultValue: '0' },
        ],
        security: [
          { key: 'require_two_factor', description: 'Require two-factor authentication for all users (true/false). Passkeys count as 2FA.', isEncrypted: false, defaultValue: 'false' },
          { key: 'session_timeout', description: 'Session timeout in seconds (3600 = 1 hour)', isEncrypted: false, defaultValue: '3600' },
          { key: 'max_login_attempts', description: 'Maximum login attempts before temporary lockout', isEncrypted: false, defaultValue: '5' },
          { key: 'lockout_duration', description: 'Account lockout duration in minutes', isEncrypted: false, defaultValue: '15' },
          { key: 'password_min_length', description: 'Minimum password length', isEncrypted: false, defaultValue: '8' },
          { key: 'require_password_uppercase', description: 'Require uppercase letter in password (true/false)', isEncrypted: false, defaultValue: 'true' },
          { key: 'require_password_numbers', description: 'Require numbers in password (true/false)', isEncrypted: false, defaultValue: 'true' },
          { key: 'require_password_special', description: 'Require special characters in password (true/false)', isEncrypted: false, defaultValue: 'false' },
          { key: 'password_expiry_days', description: 'Password expiry in days (0 = never)', isEncrypted: false, defaultValue: '0' },
          { key: 'enable_two_factor', description: 'Enable two-factor authentication (true/false)', isEncrypted: false, defaultValue: 'false' },
        ],
        general: [
          { key: 'app_name', description: 'Application name displayed in UI', isEncrypted: false, defaultValue: 'ClovaLink' },
          { key: 'default_link_expiry', description: 'Default link expiry in days', isEncrypted: false, defaultValue: '7' },
          { key: 'timezone', description: 'Server timezone (e.g., America/New_York)', isEncrypted: false, defaultValue: 'UTC' },
          { key: 'date_format', description: 'Date format (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY)', isEncrypted: false, defaultValue: 'YYYY-MM-DD' },
          { key: 'enable_activity_logs', description: 'Enable activity logging (true/false)', isEncrypted: false, defaultValue: 'true' },
          { key: 'activity_retention_days', description: 'Activity log retention in days', isEncrypted: false, defaultValue: '90' },
          { key: 'enable_api_access', description: 'Enable REST API access (true/false)', isEncrypted: false, defaultValue: 'false' },
          { key: 'maintenance_mode', description: 'Enable maintenance mode (true/false)', isEncrypted: false, defaultValue: 'false' },
          { key: 'support_email', description: 'Support contact email', isEncrypted: false, defaultValue: '' },
          { key: 'company_logo_url', description: 'URL to company logo image', isEncrypted: false, defaultValue: '' },
        ],
      };

      const categorySettings = settings[category] || [];
      const defaults = defaultSettings[category] || [];

      // Use existing settings or defaults
      const updates = defaults.map(def => {
        const existing = categorySettings.find(s => s.key === def.key);
        return {
          key: def.key,
          value: formData[def.key] || (existing?.value) || def.defaultValue,
          category,
          description: def.description,
          isEncrypted: def.isEncrypted,
        };
      });

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updates }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setSuccess('Settings saved successfully!');
      setSavedCategory(category);
      setShowSuccessModal(true);
      await fetchSettings();
    } catch (err) {
      setError('Failed to save settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Helper to render field based on default definition
  const renderFieldFromDefault = (def: { key: string; description: string; isEncrypted: boolean; defaultValue: string }) => {
    const value = formData[def.key] || def.defaultValue;
    const label = def.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Timezone dropdown
    if (def.key === 'timezone') {
      const timezones = [
        'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 
        'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo',
        'Asia/Shanghai', 'Australia/Sydney'
      ];
      return (
        <Form.Group key={def.key} className="mb-3">
          <Form.Label style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{label}</Form.Label>
          <Form.Text className="d-block mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {def.description}
          </Form.Text>
          <Form.Select
            value={value}
            onChange={(e) => handleInputChange(def.key, e.target.value)}
          >
            {timezones.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </Form.Select>
        </Form.Group>
      );
    }

    // Determine input type
    let inputType = 'text';
    
    if (def.key.includes('email')) {
      inputType = 'email';
    } else if (def.key.includes('url') || def.key.includes('logo')) {
      inputType = 'url';
    } else if (def.description && def.description.includes('true/false')) {
      // Render as select for boolean options
      return (
        <Form.Group key={def.key} className="mb-3">
          <Form.Label style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{label}</Form.Label>
          <Form.Text className="d-block mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {def.description}
          </Form.Text>
          <Form.Select
            value={value}
            onChange={(e) => handleInputChange(def.key, e.target.value)}
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </Form.Select>
        </Form.Group>
      );
    }

    // Password fields - show as text but indicate they're encrypted in DB
    if (def.isEncrypted || def.key.includes('password')) {
      return (
        <Form.Group key={def.key} className="mb-3">
          <Form.Label style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{label} <small style={{ color: 'rgba(255, 255, 255, 0.5)' }}>(encrypted in database)</small></Form.Label>
          <Form.Text className="d-block mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {def.description}
          </Form.Text>
          <Form.Control
            type="password"
            value={value}
            onChange={(e) => handleInputChange(def.key, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        </Form.Group>
      );
    }

    return (
      <Form.Group key={def.key} className="mb-3">
        <Form.Label style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{label}</Form.Label>
        <Form.Text className="d-block mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          {def.description}
        </Form.Text>
        <Form.Control
          type={inputType}
          value={value}
          onChange={(e) => handleInputChange(def.key, e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </Form.Group>
    );
  };

  const renderSettingInput = (setting: Setting) => {
    const value = formData[setting.key] || '';
    const label = setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Timezone dropdown
    if (setting.key === 'timezone') {
      const timezones = [
        'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 
        'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo',
        'Asia/Shanghai', 'Australia/Sydney'
      ];
      return (
        <Form.Group key={setting.key} className="mb-3">
          <Form.Label style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{label}</Form.Label>
          {setting.description && (
            <Form.Text className="d-block mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {setting.description}
            </Form.Text>
          )}
          <Form.Select
            value={value}
            onChange={(e) => handleInputChange(setting.key, e.target.value)}
          >
            {timezones.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </Form.Select>
        </Form.Group>
      );
    }

    // Boolean dropdowns
    if (setting.description && setting.description.includes('true/false')) {
      return (
        <Form.Group key={setting.key} className="mb-3">
          <Form.Label style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{label}</Form.Label>
          {setting.description && (
            <Form.Text className="d-block mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {setting.description}
            </Form.Text>
          )}
          <Form.Select
            value={value}
            onChange={(e) => handleInputChange(setting.key, e.target.value)}
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </Form.Select>
        </Form.Group>
      );
    }

    // Determine input type
    let inputType = 'text';
    
    if (setting.key.includes('email')) {
      inputType = 'email';
    } else if (setting.key.includes('url') || setting.key.includes('logo')) {
      inputType = 'url';
    }

    // Password fields - use password type but allow viewing what you type
    if (setting.isEncrypted || setting.key.includes('password')) {
      return (
        <Form.Group key={setting.key} className="mb-3">
          <Form.Label style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{label} <small style={{ color: 'rgba(255, 255, 255, 0.5)' }}>(encrypted in database)</small></Form.Label>
          {setting.description && (
            <Form.Text className="d-block mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {setting.description}
            </Form.Text>
          )}
          <Form.Control
            type="password"
            value={value}
            onChange={(e) => handleInputChange(setting.key, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        </Form.Group>
      );
    }

    return (
      <Form.Group key={setting.key} className="mb-3">
        <Form.Label style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{label}</Form.Label>
        {setting.description && (
          <Form.Text className="d-block mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {setting.description}
          </Form.Text>
        )}
        <Form.Control
          type={inputType}
          value={value}
          onChange={(e) => handleInputChange(setting.key, e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </Form.Group>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="settings-container">
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '1rem' }}>Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="settings-container">
        <div className="page-header">
          <div className="header-icon">
            <FaCog />
          </div>
          <div className="header-text">
            <h1 style={{ color: '#ffffff' }}>System Settings</h1>
            <p className="header-subtitle" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>Configure system-wide settings and preferences</p>
          </div>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && !showSuccessModal && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <ThemedModal
          show={showSuccessModal}
          onHide={() => {
            setShowSuccessModal(false);
            setSuccess('');
          }}
          title="Settings Saved Successfully!"
          size="sm"
        >
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              margin: '0 auto 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)'
            }}>
              <FaCheck style={{ fontSize: '2rem', color: '#fff' }} />
            </div>
            <p style={{ 
              fontSize: '1.1rem', 
              color: '#ffffff',
              marginBottom: '0.5rem',
              fontWeight: 600
            }}>
              Your {savedCategory === 'smtp' ? 'Email' : savedCategory === 'upload' ? 'Upload' : savedCategory === 'security' ? 'Security' : 'General'} settings have been saved successfully!
            </p>
            <p style={{ 
              fontSize: '0.9rem', 
              color: 'rgba(255, 255, 255, 0.6)',
              margin: 0
            }}>
              Changes will take effect immediately.
            </p>
          </div>
        </ThemedModal>

        <Card className="settings-card">
          <Card.Body>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k || 'smtp')}
              className="mb-4"
            >
            {/* SMTP Settings */}
            <Tab eventKey="smtp" title="Email">
              <Form>
                <div className="settings-section">
                  <h5 className="section-title" style={{ color: '#ffffff' }}>Server Configuration</h5>
                  {(!settings.smtp || settings.smtp.length === 0) ? (
                    <>
                      {renderFieldFromDefault({ key: 'smtp_host', description: 'SMTP server hostname (e.g., smtp.gmail.com)', isEncrypted: false, defaultValue: '' })}
                      {renderFieldFromDefault({ key: 'smtp_port', description: 'SMTP server port (587 for TLS, 465 for SSL)', isEncrypted: false, defaultValue: '587' })}
                      {renderFieldFromDefault({ key: 'smtp_secure', description: 'Use SSL/TLS (true/false)', isEncrypted: false, defaultValue: 'false' })}
                    </>
                  ) : (
                    settings.smtp.filter(s => ['smtp_host', 'smtp_port', 'smtp_secure'].includes(s.key)).map(renderSettingInput)
                  )}
                </div>

                <div className="settings-section">
                  <h5 className="section-title" style={{ color: '#ffffff' }}>Authentication</h5>
                  {(!settings.smtp || settings.smtp.length === 0) ? (
                    <>
                      {renderFieldFromDefault({ key: 'smtp_user', description: 'SMTP authentication username', isEncrypted: false, defaultValue: '' })}
                      {renderFieldFromDefault({ key: 'smtp_password', description: 'SMTP authentication password', isEncrypted: true, defaultValue: '' })}
                    </>
                  ) : (
                    settings.smtp.filter(s => ['smtp_user', 'smtp_password'].includes(s.key)).map(renderSettingInput)
                  )}
                </div>

                <div className="settings-section">
                  <h5 className="section-title" style={{ color: '#ffffff' }}>Sender Information</h5>
                  {(!settings.smtp || settings.smtp.length === 0) ? (
                    <>
                      {renderFieldFromDefault({ key: 'smtp_from', description: 'From email address for outgoing emails', isEncrypted: false, defaultValue: '' })}
                      {renderFieldFromDefault({ key: 'smtp_from_name', description: 'From name for outgoing emails', isEncrypted: false, defaultValue: 'ClovaLink' })}
                      {renderFieldFromDefault({ key: 'enable_email_notifications', description: 'Enable email notifications (true/false)', isEncrypted: false, defaultValue: 'true' })}
                    </>
                  ) : (
                    settings.smtp.filter(s => ['smtp_from', 'smtp_from_name', 'enable_email_notifications'].includes(s.key)).map(renderSettingInput)
                  )}
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => handleSaveCategory('smtp')}
                    disabled={saving}
                    className="save-settings-btn"
                  >
                    <FaSave className="me-2" />
                    {saving ? 'Saving...' : 'Save SMTP Settings'}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={fetchSettings}
                    disabled={loading}
                  >
                    <FaSync className="me-2" />
                    Reset
                  </Button>
                </div>
              </Form>
            </Tab>

            {/* Upload Settings */}
            <Tab eventKey="upload" title="Upload">
              <Form>
                <div className="settings-section">
                  <h5 className="section-title" style={{ color: '#ffffff' }}>Upload Limits</h5>
                  {(!settings.upload || settings.upload.length === 0) ? (
                    <>
                      {renderFieldFromDefault({ key: 'max_upload_size', description: 'Maximum file upload size in bytes (100MB = 104857600)', isEncrypted: false, defaultValue: '104857600' })}
                      {renderFieldFromDefault({ key: 'allowed_file_types', description: 'Comma-separated list of allowed file extensions', isEncrypted: false, defaultValue: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip' })}
                    </>
                  ) : (
                    settings.upload.filter(s => ['max_upload_size', 'allowed_file_types'].includes(s.key)).map(renderSettingInput)
                  )}
                </div>

                <div className="settings-section">
                  <h5 className="section-title" style={{ color: '#ffffff' }}>Storage & Cleanup</h5>
                  {(!settings.upload || settings.upload.length === 0) ? (
                    <>
                      {renderFieldFromDefault({ key: 'upload_dir', description: 'Directory path for uploaded files', isEncrypted: false, defaultValue: './uploads' })}
                      {renderFieldFromDefault({ key: 'storage_limit_gb', description: 'Total storage limit in GB (0 = unlimited)', isEncrypted: false, defaultValue: '0' })}
                      {renderFieldFromDefault({ key: 'auto_delete_expired', description: 'Auto-delete expired documents (true/false)', isEncrypted: false, defaultValue: 'true' })}
                    </>
                  ) : (
                    settings.upload.filter(s => ['upload_dir', 'storage_limit_gb', 'auto_delete_expired'].includes(s.key)).map(renderSettingInput)
                  )}
                </div>

                <div className="settings-section">
                  <h5 className="section-title" style={{ color: '#ffffff' }}>Security Scanning</h5>
                  {(!settings.upload || settings.upload.length === 0) ? (
                    <>
                      {renderFieldFromDefault({ key: 'enable_virus_scan', description: 'Enable virus scanning on upload (true/false)', isEncrypted: false, defaultValue: 'false' })}
                    </>
                  ) : (
                    settings.upload.filter(s => ['enable_virus_scan'].includes(s.key)).map(renderSettingInput)
                  )}
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => handleSaveCategory('upload')}
                    disabled={saving}
                    className="save-settings-btn"
                  >
                    <FaSave className="me-2" />
                    {saving ? 'Saving...' : 'Save Upload Settings'}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={fetchSettings}
                    disabled={loading}
                  >
                    <FaSync className="me-2" />
                    Reset
                  </Button>
                </div>
              </Form>
            </Tab>

            {/* Security Settings */}
            <Tab eventKey="security" title="Security">
              <Form>
                <div className="settings-section">
                  <h5 className="section-title" style={{ color: '#ffffff' }}>
                    <FaShieldAlt className="me-2" style={{ color: '#667eea' }} />
                    Organization 2FA Policy (Admin Only)
                  </h5>
                  {twoFactorRequired ? (
                    <Alert variant="success" className="mb-3">
                      <strong>✓ 2FA is REQUIRED for all users</strong>
                      <p className="mb-0 mt-2">
                        All users in your organization must set up two-factor authentication before they can access the dashboard. New users will be prompted to enable 2FA immediately after their first login.
                      </p>
                    </Alert>
                  ) : (
                    <Alert variant="warning" className="mb-3">
                      <strong>⚠️ 2FA is NOT required for users</strong>
                      <p className="mb-0 mt-2">
                        Set <code>require_two_factor</code> to <code>true</code> below to force all users to enable 2FA.
                      </p>
                    </Alert>
                  )}
                  <Alert variant="info" className="mb-3">
                    <strong>Organization-Wide Setting</strong>
                    <p className="mb-0 mt-2">
                      When enabled, ALL users (including new users) must have two-factor authentication enabled.
                      Users can satisfy this requirement by setting up either:
                      <br />• A 6-digit authenticator app (TOTP), OR
                      <br />• A passkey (Face ID, Touch ID, or security key)
                    </p>
                    <p className="mb-0 mt-2">
                      <strong>Note:</strong> This is different from enabling 2FA on your own account. This setting enforces 2FA for the entire organization.
                    </p>
                  </Alert>
                  {(!settings.security || settings.security.length === 0) ? (
                    <>
                      {renderFieldFromDefault({ key: 'require_two_factor', description: 'Require two-factor authentication for all users (true/false). Passkeys count as 2FA. Set to "true" to enforce.', isEncrypted: false, defaultValue: 'false' })}
                    </>
                  ) : (
                    settings.security.filter(s => s.key === 'require_two_factor').map(renderSettingInput)
                  )}
                </div>

                <div className="settings-section">
                  <h5 className="section-title" style={{ color: '#ffffff' }}>Session Management</h5>
                  {(!settings.security || settings.security.length === 0) ? (
                    <>
                      {renderFieldFromDefault({ key: 'session_timeout', description: 'Session timeout in seconds (3600 = 1 hour)', isEncrypted: false, defaultValue: '3600' })}
                      {renderFieldFromDefault({ key: 'max_login_attempts', description: 'Maximum login attempts before temporary lockout', isEncrypted: false, defaultValue: '5' })}
                      {renderFieldFromDefault({ key: 'lockout_duration', description: 'Account lockout duration in minutes', isEncrypted: false, defaultValue: '15' })}
                    </>
                  ) : (
                    settings.security.filter(s => ['session_timeout', 'max_login_attempts', 'lockout_duration'].includes(s.key)).map(renderSettingInput)
                  )}
                </div>

                <div className="settings-section">
                  <h5 className="section-title" style={{ color: '#ffffff' }}>Password Policy</h5>
                  {(!settings.security || settings.security.length === 0) ? (
                    <>
                      {renderFieldFromDefault({ key: 'password_min_length', description: 'Minimum password length', isEncrypted: false, defaultValue: '8' })}
                      {renderFieldFromDefault({ key: 'require_password_uppercase', description: 'Require uppercase letter in password (true/false)', isEncrypted: false, defaultValue: 'true' })}
                      {renderFieldFromDefault({ key: 'require_password_numbers', description: 'Require numbers in password (true/false)', isEncrypted: false, defaultValue: 'true' })}
                      {renderFieldFromDefault({ key: 'require_password_special', description: 'Require special characters in password (true/false)', isEncrypted: false, defaultValue: 'false' })}
                      {renderFieldFromDefault({ key: 'password_expiry_days', description: 'Password expiry in days (0 = never)', isEncrypted: false, defaultValue: '0' })}
                    </>
                  ) : (
                    settings.security.filter(s => ['password_min_length', 'require_password_uppercase', 'require_password_numbers', 'require_password_special', 'password_expiry_days'].includes(s.key)).map(renderSettingInput)
                  )}
                </div>

                <div className="settings-section">
                  <h5 className="section-title" style={{ color: '#ffffff' }}>
                    <FaShieldAlt className="me-2" style={{ color: '#667eea' }} />
                    Your Personal 2FA Settings
                  </h5>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)' }} className="mb-3">
                    Configure two-factor authentication for your personal account. This is separate from the organization-wide 2FA policy above.
                  </p>
                  
                  {twoFactorRequired && !totpEnabled && passkeys.length === 0 && (
                    <Alert variant="danger" className="mb-3">
                      <strong>⚠️ 2FA is Required for Your Account</strong>
                      <p className="mb-0 mt-2">
                        Your organization requires two-factor authentication. Please set up either:
                        <br />• A 6-digit authenticator app (TOTP) below, OR
                        <br />• A passkey in the Passkeys tab above
                      </p>
                    </Alert>
                  )}
                  
                  {(totpEnabled || passkeys.length > 0) && (
                    <Alert variant="success" className="mb-3 d-flex align-items-center">
                      <FaCheck className="me-2" />
                      {totpEnabled && passkeys.length > 0 
                        ? 'You have both TOTP and passkey 2FA enabled'
                        : totpEnabled 
                        ? 'TOTP 2FA is enabled'
                        : 'Passkey 2FA is enabled'}
                    </Alert>
                  )}
                  
                  {totpEnabled ? (
                    <div className="totp-enabled">
                      <Alert variant="success" className="d-flex align-items-center">
                        <FaCheck className="me-2" />
                        2FA is currently enabled on your account
                      </Alert>
                      
                      <div className="mt-3">
                        <Form.Group className="mb-3">
                          <Form.Label style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Enter your password to disable 2FA</Form.Label>
                          <Form.Control
                            type="password"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            placeholder="Enter your password"
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
                    </div>
                  ) : totpSetupMode ? (
                    <div className="totp-setup">
                      <Alert variant="info">
                        <strong>Step 1:</strong> Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                      </Alert>
                      
                      {qrCode && (
                        <div className="text-center my-4">
                          <img src={qrCode} alt="TOTP QR Code" style={{ maxWidth: '250px', border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', background: '#fff' }} />
                        </div>
                      )}
                      
                      <Alert variant="secondary" className="mb-3">
                        <strong>Can't scan?</strong> Enter this code manually: <code>{totpSecret}</code>
                      </Alert>
                      
                      <Alert variant="info">
                        <strong>Step 2:</strong> Enter the 6-digit code from your authenticator app to verify and enable 2FA
                      </Alert>
                      
                      <Form.Group className="mb-3 mt-3">
                        <Form.Label style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Verification Code</Form.Label>
                        <Form.Control
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          disabled={totpLoading}
                          className="text-center"
                          style={{ fontSize: '1.5rem', letterSpacing: '0.5rem', fontFamily: 'monospace' }}
                        />
                        <Form.Text style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          Enter the 6-digit code from your authenticator app
                        </Form.Text>
                      </Form.Group>
                      
                      <div className="d-flex gap-2">
                        <Button
                          variant="primary"
                          onClick={handleVerifyAndEnable2FA}
                          disabled={totpLoading || verificationCode.length !== 6}
                        >
                          <FaCheck className="me-2" />
                          {totpLoading ? 'Verifying...' : 'Verify and Enable 2FA'}
                        </Button>
                        <Button
                          variant="outline-secondary"
                          onClick={() => {
                            setTotpSetupMode(false);
                            setQrCode('');
                            setTotpSecret('');
                            setVerificationCode('');
                          }}
                          disabled={totpLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="totp-disabled">
                      <Alert variant="warning">
                        <FaShieldAlt className="me-2" />
                        2FA is not enabled. Add an extra layer of security to your account.
                      </Alert>
                      
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)' }} className="mt-3">
                        Two-factor authentication adds an extra layer of security by requiring a 6-digit code from your authenticator app in addition to your password.
                      </p>
                      
                      <Button
                        variant="primary"
                        onClick={handleSetup2FA}
                        disabled={totpLoading}
                        className="mt-3"
                      >
                        <FaQrcode className="me-2" />
                        {totpLoading ? 'Setting up...' : 'Enable 2FA'}
                      </Button>
                    </div>
                  )}
                  
                  {showBackupCodes && backupCodes.length > 0 && (
                    <Alert variant="warning" className="mt-4">
                      <strong>⚠️ Save these backup codes!</strong>
                      <p className="mb-2 mt-2">These codes can be used to access your account if you lose your authenticator device. Save them in a safe place - they won't be shown again.</p>
                      <div className="d-flex flex-wrap gap-2">
                        {backupCodes.map((code, index) => (
                          <Badge key={index} bg="secondary" className="p-2" style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                            {code}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="mt-3"
                        onClick={() => setShowBackupCodes(false)}
                      >
                        I've saved these codes
                      </Button>
                    </Alert>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => handleSaveCategory('security')}
                    disabled={saving}
                    className="save-settings-btn"
                  >
                    <FaSave className="me-2" />
                    {saving ? 'Saving...' : 'Save Security Settings'}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={fetchSettings}
                    disabled={loading}
                  >
                    <FaSync className="me-2" />
                    Reset
                  </Button>
                </div>
              </Form>
            </Tab>

            {/* General Settings */}
            <Tab eventKey="general" title="General">
              <Form>
                <div className="settings-section">
                  <h5 className="section-title" style={{ color: '#ffffff' }}>Application Identity</h5>
                  {(!settings.general || settings.general.length === 0) ? (
                    <>
                      {renderFieldFromDefault({ key: 'app_name', description: 'Application name displayed in UI', isEncrypted: false, defaultValue: 'ClovaLink' })}
                      {renderFieldFromDefault({ key: 'company_logo_url', description: 'URL to company logo image', isEncrypted: false, defaultValue: '' })}
                      {renderFieldFromDefault({ key: 'support_email', description: 'Support contact email', isEncrypted: false, defaultValue: '' })}
                    </>
                  ) : (
                    settings.general.filter(s => ['app_name', 'company_logo_url', 'support_email'].includes(s.key)).map(renderSettingInput)
                  )}
                </div>

                <div className="settings-section">
                  <h5 className="section-title" style={{ color: '#ffffff' }}>Regional Settings</h5>
                  {(!settings.general || settings.general.length === 0) ? (
                    <>
                      {renderFieldFromDefault({ key: 'timezone', description: 'Server timezone (e.g., America/New_York)', isEncrypted: false, defaultValue: 'UTC' })}
                      {renderFieldFromDefault({ key: 'date_format', description: 'Date format (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY)', isEncrypted: false, defaultValue: 'YYYY-MM-DD' })}
                    </>
                  ) : (
                    settings.general.filter(s => ['timezone', 'date_format'].includes(s.key)).map(renderSettingInput)
                  )}
                </div>

                <div className="settings-section">
                  <h5 className="section-title" style={{ color: '#ffffff' }}>Activity & Logging</h5>
                  {(!settings.general || settings.general.length === 0) ? (
                    <>
                      {renderFieldFromDefault({ key: 'enable_activity_logs', description: 'Enable activity logging (true/false)', isEncrypted: false, defaultValue: 'true' })}
                      {renderFieldFromDefault({ key: 'activity_retention_days', description: 'Activity log retention in days', isEncrypted: false, defaultValue: '90' })}
                    </>
                  ) : (
                    settings.general.filter(s => ['enable_activity_logs', 'activity_retention_days'].includes(s.key)).map(renderSettingInput)
                  )}
                </div>

                <div className="settings-section">
                  <h5 className="section-title" style={{ color: '#ffffff' }}>Features & Access</h5>
                  {(!settings.general || settings.general.length === 0) ? (
                    <>
                      {renderFieldFromDefault({ key: 'default_link_expiry', description: 'Default link expiry in days', isEncrypted: false, defaultValue: '7' })}
                      {renderFieldFromDefault({ key: 'enable_api_access', description: 'Enable REST API access (true/false)', isEncrypted: false, defaultValue: 'false' })}
                      {renderFieldFromDefault({ key: 'maintenance_mode', description: 'Enable maintenance mode (true/false)', isEncrypted: false, defaultValue: 'false' })}
                    </>
                  ) : (
                    settings.general.filter(s => ['default_link_expiry', 'enable_api_access', 'maintenance_mode'].includes(s.key)).map(renderSettingInput)
                  )}
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => handleSaveCategory('general')}
                    disabled={saving}
                    className="save-settings-btn"
                  >
                    <FaSave className="me-2" />
                    {saving ? 'Saving...' : 'Save General Settings'}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={fetchSettings}
                    disabled={loading}
                  >
                    <FaSync className="me-2" />
                    Reset
                  </Button>
                </div>
              </Form>
            </Tab>

            {/* Passkeys Tab */}
            <Tab eventKey="passkeys" title="Passkeys">
              <div className="settings-section">
                <h5 className="section-title">
                  <FaKey className="me-2" />
                  Register New Passkey
                </h5>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)' }} className="mb-3">
                  Register a new passkey to sign in with Face ID, Touch ID, or your device's security key.
                </p>
                <Form.Group className="mb-3">
                  <Form.Label style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Device Name (optional)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., iPhone, MacBook Pro"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    disabled={registeringPasskey}
                  />
                  <Form.Text style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Give this device a name to help you identify it later.
                  </Form.Text>
                </Form.Group>
                <Button
                  variant="primary"
                  onClick={handleRegisterPasskey}
                  disabled={registeringPasskey}
                >
                  <FaPlus className="me-2" />
                  {registeringPasskey ? 'Registering...' : 'Register New Passkey'}
                </Button>
              </div>

              <div className="settings-section">
                <h5 className="section-title">
                  <FaKey className="me-2" />
                  Registered Passkeys
                </h5>
                {passkeys.length === 0 ? (
                  <Alert variant="info">
                    No passkeys registered yet. Register a passkey above to enable passwordless sign-in.
                  </Alert>
                ) : (
                  <ListGroup>
                    {passkeys.map((passkey) => (
                      <ListGroup.Item
                        key={passkey.id}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <div className="fw-bold">{passkey.deviceName || 'Unknown Device'}</div>
                          <div className="text-muted small">
                            Registered: {new Date(passkey.createdAt).toLocaleDateString()}
                            {passkey.lastUsedAt && (
                              <> • Last used: {new Date(passkey.lastUsedAt).toLocaleDateString()}</>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeletePasskey(passkey.id)}
                        >
                          <FaTrash className="me-1" />
                          Delete
                        </Button>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </div>
            </Tab>

            {/* Companies Tab */}
            <Tab eventKey="companies" title="Companies">
              <div className="settings-section">
                <h5 className="section-title">
                  <FaBuilding className="me-2" />
                  Company Management
                </h5>
                <Alert variant="warning" className="mb-4">
                  <FaExclamationTriangle className="me-2" />
                  <strong>Danger Zone:</strong> Deleting a company requires 2FA verification and cannot be undone.
                </Alert>
                
                {!totpEnabled && passkeys.length === 0 && (
                  <Alert variant="danger" className="mb-4">
                    <FaShieldAlt className="me-2" />
                    <strong>2FA Required:</strong> You must enable 2FA (either TOTP or Passkey) before you can delete companies.
                  </Alert>
                )}

                {companies.length === 0 ? (
                  <Alert variant="info">
                    <FaBuilding className="me-2" />
                    No companies found in the system.
                  </Alert>
                ) : (
                  <div className="companies-danger-list">
                    {companies.map((company) => (
                      <Card key={company.id} className="company-danger-card mb-3">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <h6 className="mb-2" style={{ color: '#ffffff', fontWeight: 600 }}>
                                {company.logo ? (
                                  <img 
                                    src={`/api/companies/logo/${company.logo}`}
                                    alt={company.name}
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '6px',
                                      marginRight: '0.75rem',
                                      objectFit: 'cover',
                                      border: '2px solid #667eea'
                                    }}
                                  />
                                ) : (
                                  <FaBuilding className="me-2" style={{ color: '#667eea' }} />
                                )}
                                {company.name}
                              </h6>
                              <div className="company-stats-inline">
                                <span className="stat-badge">
                                  <FaUsers className="me-1" /> {company._count.employees} employees
                                </span>
                                <span className="stat-badge">
                                  <FaFileAlt className="me-1" /> {company._count.documents} documents
                                </span>
                                <span className="stat-badge">
                                  <FaHdd className="me-1" /> {formatStorageSize(company.storageUsed)}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteCompanyClick(company)}
                              disabled={!totpEnabled && passkeys.length === 0}
                              className="company-delete-btn"
                            >
                              <FaTrash className="me-1" />
                              Delete
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      <Card className="info-card mt-4">
        <Card.Body>
          <h5 className="mb-3" style={{ color: '#ffffff' }}><FaCog className="me-2" />About Settings</h5>
          <p className="mb-0" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            System settings are stored in the database and can be updated through this interface.
            Encrypted settings (like passwords) are masked for security. Changes take effect immediately
            for new operations, but some services may need to be restarted to pick up changes.
          </p>
        </Card.Body>
      </Card>

      {/* Delete Company Modal with 2FA */}
      <ThemedModal
        show={showDeleteCompanyModal}
        onHide={() => {
          setShowDeleteCompanyModal(false);
          setCompanyToDelete(null);
          setTwoFACode('');
        }}
        title="Delete Company - 2FA Required"
        size="md"
      >
        <Alert variant="danger" className="mb-3">
          <FaExclamationTriangle className="me-2" />
          <strong>Warning: This action cannot be undone!</strong>
          <p className="mb-0 mt-2">All company data will be permanently deleted.</p>
        </Alert>

        {companyToDelete && (
          <>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1rem', marginBottom: '1.5rem' }}>
              Are you sure you want to delete <strong style={{ color: '#ffffff' }}>{companyToDelete.name}</strong>?
            </p>

            <div className="impact-box" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h6 style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem', fontWeight: 600 }}>
                This will permanently remove:
              </h6>
              <ul style={{ marginBottom: 0, paddingLeft: '1.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                <li><FaUsers className="me-1" style={{ color: '#667eea' }} />All {companyToDelete._count.employees} employees</li>
                <li><FaFileAlt className="me-1" style={{ color: '#667eea' }} />All {companyToDelete._count.documents} documents</li>
                <li><FaHdd className="me-1" style={{ color: '#667eea' }} />{formatStorageSize(companyToDelete.storageUsed)} of storage</li>
                <li><FaBuilding className="me-1" style={{ color: '#667eea' }} />Company folder and all files</li>
              </ul>
            </div>

            {totpEnabled ? (
              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>
                  <FaShieldAlt className="me-2" style={{ color: '#667eea' }} />
                  Enter your 6-digit 2FA code to confirm
                </Form.Label>
                <Form.Control
                  type="text"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  disabled={isDeletingCompany}
                  className="text-center"
                  style={{ fontSize: '1.5rem', letterSpacing: '0.5rem', fontFamily: 'monospace' }}
                />
                <Form.Text style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Check your authenticator app for the current code
                </Form.Text>
              </Form.Group>
            ) : (
              <Alert variant="info" className="mb-3">
                <FaShieldAlt className="me-2" />
                Passkey authentication will be required on confirmation
              </Alert>
            )}

            <div className="d-flex gap-2 justify-content-end">
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setShowDeleteCompanyModal(false);
                  setCompanyToDelete(null);
                  setTwoFACode('');
                }}
                disabled={isDeletingCompany}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteCompanyConfirm}
                disabled={isDeletingCompany || (totpEnabled && twoFACode.length !== 6)}
              >
                {isDeletingCompany ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FaTrash className="me-2" />
                    Confirm Deletion
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </ThemedModal>
      </div>

      <style jsx>{`
        .settings-container {
          padding: 1rem;
          max-width: 1400px;
          margin: 0 auto;
        }

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

        :global(.settings-card) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          box-shadow: none !important;
        }

        :global(.settings-card .card-body) {
          padding: 1.5rem !important;
        }

        :global(.settings-card .nav-tabs) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          margin-bottom: 2rem;
        }

        :global(.settings-card .nav-tabs .nav-link) {
          color: rgba(255, 255, 255, 0.6) !important;
          border: none !important;
          padding: 0.75rem 1.25rem !important;
          font-weight: 500 !important;
          transition: all 0.2s !important;
          border-bottom: 3px solid transparent !important;
          background: transparent !important;
        }

        :global(.settings-card .nav-tabs .nav-link:hover) {
          color: #667eea !important;
          border-bottom-color: rgba(102, 126, 234, 0.3) !important;
          background: transparent !important;
        }

        :global(.settings-card .nav-tabs .nav-link.active) {
          color: #667eea !important;
          border-bottom-color: #667eea !important;
          background: transparent !important;
          font-weight: 600 !important;
        }

        :global(.form-group) {
          margin-bottom: 1.5rem !important;
        }

        :global(.form-label) {
          font-weight: 600 !important;
          color: rgba(255, 255, 255, 0.9) !important;
          margin-bottom: 0.5rem !important;
          font-size: 0.95rem !important;
        }

        :global(.form-text) {
          font-size: 0.875rem !important;
          color: rgba(255, 255, 255, 0.5) !important;
          margin-bottom: 0.5rem !important;
        }

        :global(.form-control),
        :global(.form-select) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 8px !important;
          color: #ffffff !important;
          padding: 0.75rem 1rem !important;
          font-size: 0.95rem !important;
          transition: all 0.2s !important;
        }

        :global(.form-control:focus),
        :global(.form-select:focus) {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: #667eea !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2) !important;
          color: #ffffff !important;
          outline: none !important;
        }

        :global(.form-control::placeholder) {
          color: rgba(255, 255, 255, 0.4) !important;
        }

        :global(.form-select option) {
          background: #1a1a2e !important;
          color: #ffffff !important;
        }

        :global(.d-flex.gap-2) {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        :global(.btn) {
          padding: 0.75rem 1.5rem !important;
          font-weight: 500 !important;
          border-radius: 8px !important;
          transition: all 0.2s !important;
        }

        :global(.btn-primary) {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          border: none !important;
          color: white !important;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
        }

        :global(.btn-primary:hover) {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6) !important;
        }

        :global(.btn-outline-secondary) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #ffffff !important;
        }

        :global(.btn-outline-secondary:hover) {
          background: rgba(255, 255, 255, 0.1) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          color: #ffffff !important;
          transform: translateY(-1px) !important;
        }

        :global(.btn-danger) {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important;
          border: none !important;
          color: white !important;
          box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4) !important;
        }

        :global(.btn-danger:hover) {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(220, 53, 69, 0.6) !important;
        }

        :global(.btn-outline-danger) {
          background: rgba(220, 53, 69, 0.1) !important;
          border: 1px solid rgba(220, 53, 69, 0.3) !important;
          color: #ff6b6b !important;
        }

        :global(.btn-outline-danger:hover) {
          background: rgba(220, 53, 69, 0.2) !important;
          border-color: #dc3545 !important;
          color: #ff4444 !important;
        }

        :global(.btn-outline-primary) {
          background: rgba(102, 126, 234, 0.1) !important;
          border: 1px solid rgba(102, 126, 234, 0.3) !important;
          color: #667eea !important;
        }

        :global(.btn-outline-primary:hover) {
          background: rgba(102, 126, 234, 0.2) !important;
          border-color: #667eea !important;
        }

        :global(.info-card) {
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3) !important;
        }

        :global(.info-card .card-body) {
          padding: 1.5rem !important;
        }

        :global(.info-card h5) {
          display: flex !important;
          align-items: center !important;
          font-size: 1.1rem !important;
          font-weight: 600 !important;
          color: white !important;
          margin-bottom: 0.75rem !important;
        }

        :global(.info-card p) {
          color: rgba(255, 255, 255, 0.95) !important;
          margin: 0 !important;
        }

        :global(.alert) {
          border-radius: 10px !important;
          padding: 1rem 1.25rem !important;
        }

        :global(.alert-success) {
          background: rgba(82, 196, 26, 0.15) !important;
          border: 1px solid rgba(82, 196, 26, 0.3) !important;
          color: #52c41a !important;
        }

        :global(.alert-danger) {
          background: rgba(220, 53, 69, 0.15) !important;
          border: 1px solid rgba(220, 53, 69, 0.3) !important;
          color: #ff6b6b !important;
        }

        :global(.alert-warning) {
          background: rgba(255, 193, 7, 0.15) !important;
          border: 1px solid rgba(255, 193, 7, 0.3) !important;
          color: #ffc107 !important;
        }

        :global(.alert-info) {
          background: rgba(102, 126, 234, 0.15) !important;
          border: 1px solid rgba(102, 126, 234, 0.3) !important;
          color: #667eea !important;
        }

        :global(.alert strong) {
          color: inherit !important;
        }

        :global(.alert p) {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        :global(.settings-section) {
          margin-bottom: 2.5rem !important;
          padding-bottom: 2rem !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        :global(.settings-section:last-of-type) {
          border-bottom: none !important;
          padding-bottom: 0 !important;
        }

        :global(.section-title) {
          font-size: 1.1rem !important;
          font-weight: 600 !important;
          color: #ffffff !important;
          margin-bottom: 1.25rem !important;
          padding-bottom: 0.75rem !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          display: flex !important;
          align-items: center !important;
        }

        :global(.section-title svg) {
          color: #667eea !important;
        }

        :global(h5.section-title) {
          color: #ffffff !important;
        }

        :global(.settings-section h5) {
          color: #ffffff !important;
        }

        :global(.settings-card h5) {
          color: #ffffff !important;
        }

        :global(.settings-card h6) {
          color: #ffffff !important;
        }

        @media (min-width: 1024px) {
          .settings-container {
            padding: 2rem;
          }

          .page-header h1 {
            font-size: 2rem;
          }
        }

        @media (max-width: 767px) {
          .settings-container {
            padding: 0.5rem !important;
          }

          .page-header {
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem !important;
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

          :global(.settings-card) {
            margin-bottom: 1rem !important;
          }

          :global(.settings-card .card-body) {
            padding: 0.75rem !important;
          }

          :global(.settings-card .nav-tabs) {
            margin-bottom: 0.75rem !important;
            display: flex !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            gap: 0 !important;
          }

          :global(.settings-card .nav-tabs::-webkit-scrollbar) {
            display: none;
          }

          :global(.settings-card .nav-tabs .nav-link) {
            padding: 0.65rem 1rem !important;
            font-size: 0.85rem !important;
            font-weight: 500 !important;
            text-align: center !important;
            white-space: nowrap !important;
            border: none !important;
            border-bottom: 2px solid transparent !important;
            border-radius: 0 !important;
            background: transparent !important;
            color: rgba(255, 255, 255, 0.6) !important;
            transition: all 0.2s ease !important;
            margin: 0 !important;
            display: inline-block !important;
          }

          :global(.settings-card .nav-tabs .nav-link.active) {
            color: #667eea !important;
            border-bottom-color: #667eea !important;
          }

          :global(.settings-card .nav-tabs .nav-link:hover:not(.active)) {
            color: rgba(255, 255, 255, 0.8) !important;
          }

          :global(.settings-card .tab-content) {
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

          :global(.settings-section) {
            margin-bottom: 1.5rem !important;
            padding-bottom: 1.5rem !important;
          }

          :global(.section-title) {
            font-size: 1.1rem !important;
            margin-bottom: 1rem !important;
            font-weight: 600 !important;
          }

          :global(.d-flex.gap-2) {
            flex-direction: column;
            gap: 0.75rem !important;
          }

          :global(.d-flex.gap-2 .btn) {
            width: 100% !important;
            padding: 0.75rem 1rem !important;
          }

          :global(.company-danger-card) {
            margin-bottom: 0.75rem !important;
          }

          :global(.company-danger-card .card-body) {
            padding: 0.875rem !important;
          }

          :global(.company-stats-inline) {
            flex-direction: column;
            gap: 0.35rem !important;
          }

          :global(.info-card) {
            margin-top: 1rem !important;
          }

          :global(.info-card .card-body) {
            padding: 1rem !important;
            font-size: 0.875rem !important;
          }
        }

        :global(.save-settings-btn) {
          color: #fff !important;
        }

        :global(.save-settings-btn:hover),
        :global(.save-settings-btn:focus),
        :global(.save-settings-btn:active) {
          color: #fff !important;
        }

        :global(.save-settings-btn:disabled) {
          color: #fff !important;
          opacity: 0.65;
        }

        :global(.company-danger-card) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          transition: all 0.2s ease !important;
        }

        :global(.company-danger-card:hover) {
          border-color: rgba(220, 53, 69, 0.4) !important;
          box-shadow: 0 2px 8px rgba(220, 53, 69, 0.2) !important;
        }

        :global(.company-danger-card .card-body) {
          padding: 1rem !important;
        }

        :global(.company-danger-card h6) {
          color: #ffffff !important;
          display: flex;
          align-items: center;
        }

        :global(.company-stats-inline) {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 0.5rem !important;
          margin-top: 0.5rem !important;
        }

        :global(.stat-badge) {
          display: inline-flex !important;
          align-items: center !important;
          padding: 0.25rem 0.75rem !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 6px !important;
          font-size: 0.85rem !important;
          color: rgba(255, 255, 255, 0.7) !important;
        }

        :global(.stat-badge svg) {
          font-size: 0.75rem !important;
          color: #667eea !important;
        }

        :global(.company-delete-btn) {
          border-width: 1.5px !important;
          font-weight: 500 !important;
        }

        :global(.company-delete-btn:disabled) {
          opacity: 0.5 !important;
        }

        :global(.list-group-item) {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #ffffff !important;
          margin-bottom: 0.5rem !important;
          border-radius: 8px !important;
        }

        :global(.list-group-item .fw-bold) {
          color: #ffffff !important;
        }

        :global(.list-group-item .text-muted) {
          color: rgba(255, 255, 255, 0.6) !important;
        }

        :global(.badge) {
          background: rgba(102, 126, 234, 0.2) !important;
          color: #667eea !important;
          padding: 0.5rem 0.75rem !important;
          font-weight: 500 !important;
        }

        :global(.text-muted) {
          color: rgba(255, 255, 255, 0.6) !important;
        }

        :global(.small) {
          color: rgba(255, 255, 255, 0.6) !important;
        }

        :global(code) {
          background: rgba(255, 255, 255, 0.1) !important;
          color: #667eea !important;
          padding: 0.2rem 0.4rem !important;
          border-radius: 4px !important;
          font-family: monospace !important;
        }

        :global(.totp-enabled),
        :global(.totp-disabled),
        :global(.totp-setup) {
          color: rgba(255, 255, 255, 0.9);
        }

        :global(.totp-setup img) {
          background: white !important;
          padding: 1rem !important;
        }

        :global(p) {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        :global(.settings-card p) {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        :global(.settings-section p) {
          color: rgba(255, 255, 255, 0.7) !important;
        }
      `}</style>
    </DashboardLayout>
  );
}

