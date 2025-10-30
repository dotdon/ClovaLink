'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Tabs, Tab, Spinner } from 'react-bootstrap';
import DashboardLayout from '@/components/ui/DashboardLayout';
import { FaSave, FaSync, FaCog } from 'react-icons/fa';

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

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsGroup>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('smtp');

  // Local form state
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

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
      await fetchSettings();
      setTimeout(() => setSuccess(''), 3000);
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
          <Form.Label>{label}</Form.Label>
          <Form.Text className="d-block mb-2 text-muted">
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
          <Form.Label>{label}</Form.Label>
          <Form.Text className="d-block mb-2 text-muted">
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
          <Form.Label>{label} <small className="text-muted">(encrypted in database)</small></Form.Label>
          <Form.Text className="d-block mb-2 text-muted">
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
        <Form.Label>{label}</Form.Label>
        <Form.Text className="d-block mb-2 text-muted">
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
          <Form.Label>{label}</Form.Label>
          {setting.description && (
            <Form.Text className="d-block mb-2 text-muted">
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
          <Form.Label>{label}</Form.Label>
          {setting.description && (
            <Form.Text className="d-block mb-2 text-muted">
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
          <Form.Label>{label} <small className="text-muted">(encrypted in database)</small></Form.Label>
          {setting.description && (
            <Form.Text className="d-block mb-2 text-muted">
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
        <Form.Label>{label}</Form.Label>
        {setting.description && (
          <Form.Text className="d-block mb-2 text-muted">
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
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="settings-container">
        <div className="page-header">
          <h1 className="h3">System Settings</h1>
          <p className="text-muted">Configure system-wide settings and preferences</p>
        </div>

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
                  <h5 className="section-title">Server Configuration</h5>
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
                  <h5 className="section-title">Authentication</h5>
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
                  <h5 className="section-title">Sender Information</h5>
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
                  <h5 className="section-title">Upload Limits</h5>
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
                  <h5 className="section-title">Storage & Cleanup</h5>
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
                  <h5 className="section-title">Security Scanning</h5>
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
                  <h5 className="section-title">Session Management</h5>
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
                  <h5 className="section-title">Password Policy</h5>
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
                  <h5 className="section-title">Two-Factor Authentication</h5>
                  {(!settings.security || settings.security.length === 0) ? (
                    <>
                      {renderFieldFromDefault({ key: 'enable_two_factor', description: 'Enable two-factor authentication (true/false)', isEncrypted: false, defaultValue: 'false' })}
                    </>
                  ) : (
                    settings.security.filter(s => ['enable_two_factor'].includes(s.key)).map(renderSettingInput)
                  )}
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => handleSaveCategory('security')}
                    disabled={saving}
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
                  <h5 className="section-title">Application Identity</h5>
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
                  <h5 className="section-title">Regional Settings</h5>
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
                  <h5 className="section-title">Activity & Logging</h5>
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
                  <h5 className="section-title">Features & Access</h5>
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
          </Tabs>
        </Card.Body>
      </Card>

      <Card className="info-card mt-4">
        <Card.Body>
          <h5 className="mb-3"><FaCog className="me-2" />About Settings</h5>
          <p className="text-muted mb-0">
            System settings are stored in the database and can be updated through this interface.
            Encrypted settings (like passwords) are masked for security. Changes take effect immediately
            for new operations, but some services may need to be restarted to pick up changes.
          </p>
        </Card.Body>
      </Card>
      </div>

      <style jsx>{`
        .settings-container {
          padding: 1rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          margin-bottom: 0.5rem;
          font-size: 1.75rem;
          font-weight: 600;
          color: #1a1d21;
        }

        .page-header p {
          font-size: 0.95rem;
        }

        :global(.settings-card) {
          border: none;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          overflow: hidden;
        }

        :global(.settings-card .card-body) {
          padding: 2rem;
        }

        :global(.settings-card .nav-tabs) {
          border-bottom: 2px solid #e9ecef;
          margin-bottom: 2rem;
        }

        :global(.settings-card .nav-tabs .nav-link) {
          color: #6c757d;
          border: none;
          padding: 1rem 1.5rem;
          font-weight: 500;
          transition: all 0.2s;
          border-bottom: 3px solid transparent;
        }

        :global(.settings-card .nav-tabs .nav-link:hover) {
          color: #0d6efd;
          border-bottom-color: rgba(13, 110, 253, 0.3);
          background: transparent;
        }

        :global(.settings-card .nav-tabs .nav-link.active) {
          color: #0d6efd;
          border-bottom-color: #0d6efd;
          background: transparent;
          font-weight: 600;
        }

        :global(.form-group) {
          margin-bottom: 1.5rem;
        }

        :global(.form-label) {
          font-weight: 600;
          color: #1a1d21;
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
        }

        :global(.form-text) {
          font-size: 0.875rem;
          color: #6c757d;
          margin-bottom: 0.5rem;
        }

        :global(.form-control),
        :global(.form-select) {
          border-radius: 8px;
          border: 1.5px solid #dee2e6;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        :global(.form-control:focus),
        :global(.form-select:focus) {
          border-color: #0d6efd;
          box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.15);
        }

        :global(.d-flex.gap-2) {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e9ecef;
        }

        :global(.btn) {
          padding: 0.75rem 1.5rem;
          font-weight: 500;
          border-radius: 8px;
          transition: all 0.2s;
        }

        :global(.btn-primary) {
          background: #0d6efd;
          border-color: #0d6efd;
          box-shadow: 0 2px 4px rgba(13, 110, 253, 0.2);
        }

        :global(.btn-primary:hover) {
          background: #0b5ed7;
          border-color: #0b5ed7;
          box-shadow: 0 4px 8px rgba(13, 110, 253, 0.3);
          transform: translateY(-1px);
        }

        :global(.btn-outline-secondary) {
          border: 1.5px solid #dee2e6;
          color: #6c757d;
        }

        :global(.btn-outline-secondary:hover) {
          background: #f8f9fa;
          border-color: #dee2e6;
          color: #495057;
        }

        :global(.info-card) {
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        :global(.info-card h5) {
          display: flex;
          align-items: center;
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          margin-bottom: 0.75rem;
        }

        :global(.info-card p) {
          color: rgba(255, 255, 255, 0.95);
          margin: 0;
        }

        :global(.alert) {
          border-radius: 12px;
          border: none;
          padding: 1rem 1.25rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        :global(.settings-section) {
          margin-bottom: 2.5rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #e9ecef;
        }

        :global(.settings-section:last-of-type) {
          border-bottom: none;
          padding-bottom: 0;
        }

        :global(.section-title) {
          font-size: 1.1rem;
          font-weight: 600;
          color: #495057;
          margin-bottom: 1.25rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #e9ecef;
          display: flex;
          align-items: center;
        }

        :global(.section-title::before) {
          content: '';
          width: 4px;
          height: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 2px;
          margin-right: 0.75rem;
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
          :global(.settings-card .card-body) {
            padding: 1rem;
          }

          :global(.settings-card .nav-tabs .nav-link) {
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
          }

          :global(.d-flex.gap-2) {
            flex-direction: column;
          }

          :global(.d-flex.gap-2 .btn) {
            width: 100%;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}

