import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import type { SystemSettings } from '../types.js';

export const SettingsManagement = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'application' | 'email' | 'workflow' | 'uploads' | 'security' | 'system' | 'ldap'>('application');
  const [newExpenseType, setNewExpenseType] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [templateViewMode, setTemplateViewMode] = useState<Record<string, 'html' | 'preview'>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/settings');
      const loadedSettings = data.settings;

      // Ensure templates exist (for backward compatibility)
      if (!loadedSettings.email.templates) {
        loadedSettings.email.templates = {
          applicationSubmitted: {
            subject: 'Travel Application Submitted - {{applicationNumber}}',
            body: '<h2>Travel Application Submitted Successfully</h2><p>Dear {{applicantName}},</p><p>Your travel application has been submitted successfully.</p>',
          },
          applicationSubmittedReviewer: {
            subject: 'New Travel Application Submitted: {{eventTitle}}',
            body: '<h2>New Travel Application Submitted</h2><p>A new travel application has been submitted and requires your review.</p>',
          },
          applicationApproved: {
            subject: 'Travel Application Approved: {{eventTitle}}',
            body: '<h2>Travel Application Approved</h2><p>Dear {{applicantName}},</p><p>Your travel application has been approved!</p>',
          },
          applicationRejected: {
            subject: 'Travel Application Rejected: {{eventTitle}}',
            body: '<h2>Travel Application Rejected</h2><p>Dear {{applicantName}},</p><p>Your travel application has been rejected.</p>',
          },
          informationRequested: {
            subject: 'Additional Information Required: {{eventTitle}}',
            body: '<h2>Additional Information Required</h2><p>Dear {{applicantName}},</p><p>The reviewer has requested additional information.</p>',
          },
        };
      }

      // Ensure notifyApplicantOnSubmission exists
      if (loadedSettings.email.notifications.notifyApplicantOnSubmission === undefined) {
        loadedSettings.email.notifications.notifyApplicantOnSubmission = true;
      }

      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      setStatus('Failed to load settings. Please ensure you have admin access.');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      setStatus(null);
      const { data } = await api.put('/admin/settings', settings);
      setSettings(data.settings);
      setStatus('Settings saved successfully!');
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const testEmailConfig = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setStatus('Please enter a valid email address to test.');
      return;
    }
    try {
      setTestingEmail(true);
      setStatus(null);
      const { data } = await api.post('/admin/settings/test-email', { testEmail });
      setStatus(data.success ? `Test email sent successfully to ${testEmail}!` : data.message);
    } catch (error: any) {
      setStatus(error.response?.data?.message || 'Failed to send test email. Check your SMTP configuration.');
    } finally {
      setTestingEmail(false);
    }
  };

  const updateSettings = (path: string[], value: any) => {
    if (!settings) return;
    const newSettings = JSON.parse(JSON.stringify(settings)); // Deep clone
    let current: any = newSettings;

    // Ensure nested objects exist
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }

    current[path[path.length - 1]] = value;
    setSettings(newSettings);
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Loading settings...</div>;
  }

  if (!settings) {
    return <div className="text-center py-8 text-red-600">Failed to load settings.</div>;
  }

  // Ensure templates exist (safety check)
  if (!settings.email.templates) {
    settings.email.templates = {
      applicationSubmitted: { subject: '', body: '' },
      applicationSubmittedReviewer: { subject: '', body: '' },
      applicationApproved: { subject: '', body: '' },
      applicationRejected: { subject: '', body: '' },
      informationRequested: { subject: '', body: '' },
    };
  }

  // Ensure notifyApplicantOnSubmission exists
  if (settings.email.notifications.notifyApplicantOnSubmission === undefined) {
    settings.email.notifications.notifyApplicantOnSubmission = true;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-800">System Settings</h2>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {status && (
        <div className={`p-4 rounded-lg ${status.includes('success') || status.includes('sent') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {status}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-4">
          {(['application', 'email', 'workflow', 'uploads', 'security', 'system', 'ldap'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Email Settings Tab */}
      {activeTab === 'email' && settings && settings.email && (
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">SMTP Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={settings.email.smtp.host}
                  onChange={(e) => updateSettings(['email', 'smtp', 'host'], e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="smtp.zoho.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Port</label>
                <input
                  type="number"
                  value={settings.email.smtp.port}
                  onChange={(e) => updateSettings(['email', 'smtp', 'port'], parseInt(e.target.value) || 587)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Username</label>
                <input
                  type="text"
                  value={settings.email.smtp.username}
                  onChange={(e) => updateSettings(['email', 'smtp', 'username'], e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Password</label>
                <input
                  type="password"
                  value={settings.email.smtp.password === '***MASKED***' ? '' : settings.email.smtp.password}
                  onChange={(e) => updateSettings(['email', 'smtp', 'password'], e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={settings.email.smtp.password === '***MASKED***' ? 'Password is set (enter new to change)' : ''}
                />
                {settings.email.smtp.password === '***MASKED***' && (
                  <p className="text-xs text-slate-500 mt-1">Leave blank to keep current password</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Email Address</label>
                <input
                  type="email"
                  value={settings.email.smtp.from}
                  onChange={(e) => updateSettings(['email', 'smtp', 'from'], e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="no-reply@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Display Name</label>
                <input
                  type="text"
                  value={settings.email.smtp.fromName}
                  onChange={(e) => updateSettings(['email', 'smtp', 'fromName'], e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Travel Desk"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reply-To Email</label>
                <input
                  type="email"
                  value={settings.email.smtp.replyTo}
                  onChange={(e) => updateSettings(['email', 'smtp', 'replyTo'], e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="support@example.com"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.email.smtp.secure}
                    onChange={(e) => updateSettings(['email', 'smtp', 'secure'], e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Use TLS/SSL</span>
                </label>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Test Email Configuration</h4>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter email address to test"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={testEmailConfig}
                  disabled={testingEmail || !testEmail}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testingEmail ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Email Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.email.notifications.enabled}
                  onChange={(e) => updateSettings(['email', 'notifications', 'enabled'], e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Enable Email Notifications</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.email.notifications.applicationSubmitted}
                  onChange={(e) => updateSettings(['email', 'notifications', 'applicationSubmitted'], e.target.checked)}
                  disabled={!settings.email.notifications.enabled}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm font-medium text-slate-700">Notify on Application Submission</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.email.notifications.applicationApproved}
                  onChange={(e) => updateSettings(['email', 'notifications', 'applicationApproved'], e.target.checked)}
                  disabled={!settings.email.notifications.enabled}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm font-medium text-slate-700">Notify on Application Approval</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.email.notifications.applicationRejected}
                  onChange={(e) => updateSettings(['email', 'notifications', 'applicationRejected'], e.target.checked)}
                  disabled={!settings.email.notifications.enabled}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm font-medium text-slate-700">Notify on Application Rejection</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.email.notifications.notifyApplicantOnSubmission ?? true}
                  onChange={(e) => updateSettings(['email', 'notifications', 'notifyApplicantOnSubmission'], e.target.checked)}
                  disabled={!settings.email.notifications.enabled}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-sm font-medium text-slate-700">Notify Applicant When They Submit Application</span>
              </label>
            </div>
          </section>

          {settings.email.templates && (
            <section className="bg-white p-6 rounded-lg border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Email Templates</h3>
              <p className="text-sm text-slate-600 mb-4">
                Customize email templates using variables like <code className="bg-slate-100 px-1 rounded">{'{{applicationNumber}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{applicantName}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{eventTitle}}'}</code>, etc.
              </p>

              <div className="space-y-6">
                {/* Application Submitted - Applicant */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-700">Application Submitted (Applicant)</h4>
                    <button
                      type="button"
                      onClick={() => setTemplateViewMode(prev => ({
                        ...prev,
                        applicationSubmitted: prev.applicationSubmitted === 'preview' ? 'html' : 'preview'
                      }))}
                      className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                    >
                      {templateViewMode.applicationSubmitted === 'preview' ? 'Edit HTML' : 'Preview'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={settings.email.templates.applicationSubmitted?.subject || ''}
                        onChange={(e) => updateSettings(['email', 'templates', 'applicationSubmitted', 'subject'], e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Travel Application Submitted - {{applicationNumber}}"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email Body</label>
                      {templateViewMode.applicationSubmitted === 'preview' ? (
                        <div
                          className="w-full border border-slate-300 rounded-lg p-4 bg-white min-h-[300px] overflow-auto"
                          dangerouslySetInnerHTML={{
                            __html: settings.email.templates.applicationSubmitted?.body
                              ?.replace(/\{\{applicationNumber\}\}/g, '16-2025-001')
                              ?.replace(/\{\{applicantName\}\}/g, 'John Doe')
                              ?.replace(/\{\{eventTitle\}\}/g, 'Sample Event')
                              ?.replace(/\{\{department\}\}/g, 'Finance')
                              ?.replace(/\{\{startDate\}\}/g, '10/12/2025')
                              ?.replace(/\{\{endDate\}\}/g, '18/12/2025')
                              ?.replace(/\{\{durationDays\}\}/g, '9')
                              ?.replace(/\{\{numberOfTravellers\}\}/g, '1')
                              ?.replace(/\{\{totalCost\}\}/g, '$13,500')
                              ?.replace(/\{\{applicationLink\}\}/g, '#')
                              ?.replace(/\{\{statusLink\}\}/g, '#')
                              || ''
                          }}
                        />
                      ) : (
                        <textarea
                          value={settings.email.templates.applicationSubmitted?.body || ''}
                          onChange={(e) => updateSettings(['email', 'templates', 'applicationSubmitted', 'body'], e.target.value)}
                          rows={15}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                          placeholder="HTML email template..."
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Application Submitted - Reviewer */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-700">Application Submitted (Reviewer)</h4>
                    <button
                      type="button"
                      onClick={() => setTemplateViewMode(prev => ({
                        ...prev,
                        applicationSubmittedReviewer: prev.applicationSubmittedReviewer === 'preview' ? 'html' : 'preview'
                      }))}
                      className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                    >
                      {templateViewMode.applicationSubmittedReviewer === 'preview' ? 'Edit HTML' : 'Preview'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={settings.email.templates.applicationSubmittedReviewer?.subject || ''}
                        onChange={(e) => updateSettings(['email', 'templates', 'applicationSubmittedReviewer', 'subject'], e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email Body</label>
                      {templateViewMode.applicationSubmittedReviewer === 'preview' ? (
                        <div
                          className="w-full border border-slate-300 rounded-lg p-4 bg-white min-h-[300px] overflow-auto"
                          dangerouslySetInnerHTML={{
                            __html: settings.email.templates.applicationSubmittedReviewer?.body
                              ?.replace(/\{\{applicationNumber\}\}/g, '16-2025-001')
                              ?.replace(/\{\{applicantName\}\}/g, 'John Doe')
                              ?.replace(/\{\{applicantEmail\}\}/g, 'john@example.com')
                              ?.replace(/\{\{eventTitle\}\}/g, 'Sample Event')
                              ?.replace(/\{\{department\}\}/g, 'Finance')
                              ?.replace(/\{\{startDate\}\}/g, '10/12/2025')
                              ?.replace(/\{\{endDate\}\}/g, '18/12/2025')
                              ?.replace(/\{\{durationDays\}\}/g, '9')
                              ?.replace(/\{\{numberOfTravellers\}\}/g, '1')
                              ?.replace(/\{\{totalCost\}\}/g, '$13,500')
                              ?.replace(/\{\{reasonForParticipation\}\}/g, 'Sample reason')
                              ?.replace(/\{\{applicationLink\}\}/g, '#')
                              || ''
                          }}
                        />
                      ) : (
                        <textarea
                          value={settings.email.templates.applicationSubmittedReviewer?.body || ''}
                          onChange={(e) => updateSettings(['email', 'templates', 'applicationSubmittedReviewer', 'body'], e.target.value)}
                          rows={15}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Application Approved */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-700">Application Approved</h4>
                    <button
                      type="button"
                      onClick={() => setTemplateViewMode(prev => ({
                        ...prev,
                        applicationApproved: prev.applicationApproved === 'preview' ? 'html' : 'preview'
                      }))}
                      className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                    >
                      {templateViewMode.applicationApproved === 'preview' ? 'Edit HTML' : 'Preview'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={settings.email.templates.applicationApproved?.subject || ''}
                        onChange={(e) => updateSettings(['email', 'templates', 'applicationApproved', 'subject'], e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email Body</label>
                      {templateViewMode.applicationApproved === 'preview' ? (
                        <div
                          className="w-full border border-slate-300 rounded-lg p-4 bg-white min-h-[300px] overflow-auto"
                          dangerouslySetInnerHTML={{
                            __html: settings.email.templates.applicationApproved?.body
                              ?.replace(/\{\{applicationNumber\}\}/g, '16-2025-001')
                              ?.replace(/\{\{applicantName\}\}/g, 'John Doe')
                              ?.replace(/\{\{eventTitle\}\}/g, 'Sample Event')
                              ?.replace(/\{\{startDate\}\}/g, '10/12/2025')
                              ?.replace(/\{\{endDate\}\}/g, '18/12/2025')
                              ?.replace(/\{\{durationDays\}\}/g, '9')
                              ?.replace(/\{\{numberOfTravellers\}\}/g, '1')
                              ?.replace(/\{\{totalCost\}\}/g, '$13,500')
                              ?.replace(/\{\{note\}\}/g, 'Sample reviewer note')
                              ?.replace(/\{\{reviewerName\}\}/g, 'Ada Admin')
                              ?.replace(/\{\{applicationLink\}\}/g, '#')
                              ?.replace(/\{\{statusLink\}\}/g, '#')
                              ?.replace(/\{\{#if note\}\}(.*?)\{\{\/if\}\}/gs, '$1')
                              ?.replace(/\{\{#if reviewerName\}\}(.*?)\{\{\/if\}\}/gs, '$1')
                              || ''
                          }}
                        />
                      ) : (
                        <textarea
                          value={settings.email.templates.applicationApproved?.body || ''}
                          onChange={(e) => updateSettings(['email', 'templates', 'applicationApproved', 'body'], e.target.value)}
                          rows={15}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Application Rejected */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-700">Application Rejected</h4>
                    <button
                      type="button"
                      onClick={() => setTemplateViewMode(prev => ({
                        ...prev,
                        applicationRejected: prev.applicationRejected === 'preview' ? 'html' : 'preview'
                      }))}
                      className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                    >
                      {templateViewMode.applicationRejected === 'preview' ? 'Edit HTML' : 'Preview'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={settings.email.templates.applicationRejected?.subject || ''}
                        onChange={(e) => updateSettings(['email', 'templates', 'applicationRejected', 'subject'], e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email Body</label>
                      {templateViewMode.applicationRejected === 'preview' ? (
                        <div
                          className="w-full border border-slate-300 rounded-lg p-4 bg-white min-h-[300px] overflow-auto"
                          dangerouslySetInnerHTML={{
                            __html: settings.email.templates.applicationRejected?.body
                              ?.replace(/\{\{applicationNumber\}\}/g, '16-2025-001')
                              ?.replace(/\{\{applicantName\}\}/g, 'Teu Teulilo')
                              ?.replace(/\{\{eventTitle\}\}/g, 'TechOne Showcase')
                              ?.replace(/\{\{startDate\}\}/g, '10/12/2025')
                              ?.replace(/\{\{endDate\}\}/g, '18/12/2025')
                              ?.replace(/\{\{durationDays\}\}/g, '9')
                              ?.replace(/\{\{numberOfTravellers\}\}/g, '1')
                              ?.replace(/\{\{totalCost\}\}/g, '$13,500')
                              ?.replace(/\{\{reason\}\}/g, 'test')
                              ?.replace(/\{\{note\}\}/g, 'test')
                              ?.replace(/\{\{reviewerName\}\}/g, 'Ada Admin')
                              ?.replace(/\{\{applicationLink\}\}/g, '#')
                              ?.replace(/\{\{statusLink\}\}/g, '#')
                              ?.replace(/\{\{#if reason\}\}(.*?)\{\{\/if\}\}/gs, '$1')
                              ?.replace(/\{\{#if note\}\}(.*?)\{\{\/if\}\}/gs, '$1')
                              ?.replace(/\{\{#if reviewerName\}\}(.*?)\{\{\/if\}\}/gs, '$1')
                              || ''
                          }}
                        />
                      ) : (
                        <textarea
                          value={settings.email.templates.applicationRejected?.body || ''}
                          onChange={(e) => updateSettings(['email', 'templates', 'applicationRejected', 'body'], e.target.value)}
                          rows={15}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Information Requested */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-700">Information Requested</h4>
                    <button
                      type="button"
                      onClick={() => setTemplateViewMode(prev => ({
                        ...prev,
                        informationRequested: prev.informationRequested === 'preview' ? 'html' : 'preview'
                      }))}
                      className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                    >
                      {templateViewMode.informationRequested === 'preview' ? 'Edit HTML' : 'Preview'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={settings.email.templates.informationRequested?.subject || ''}
                        onChange={(e) => updateSettings(['email', 'templates', 'informationRequested', 'subject'], e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email Body</label>
                      {templateViewMode.informationRequested === 'preview' ? (
                        <div
                          className="w-full border border-slate-300 rounded-lg p-4 bg-white min-h-[300px] overflow-auto"
                          dangerouslySetInnerHTML={{
                            __html: settings.email.templates.informationRequested?.body
                              ?.replace(/\{\{applicationNumber\}\}/g, '16-2025-001')
                              ?.replace(/\{\{applicantName\}\}/g, 'John Doe')
                              ?.replace(/\{\{eventTitle\}\}/g, 'Sample Event')
                              ?.replace(/\{\{startDate\}\}/g, '10/12/2025')
                              ?.replace(/\{\{endDate\}\}/g, '18/12/2025')
                              ?.replace(/\{\{durationDays\}\}/g, '9')
                              ?.replace(/\{\{note\}\}/g, 'Please provide additional documentation')
                              ?.replace(/\{\{reviewerName\}\}/g, 'Ada Admin')
                              ?.replace(/\{\{reviewerEmail\}\}/g, 'ada@example.com')
                              ?.replace(/\{\{applicationLink\}\}/g, '#')
                              ?.replace(/\{\{statusLink\}\}/g, '#')
                              ?.replace(/\{\{#if note\}\}(.*?)\{\{\/if\}\}/gs, '$1')
                              ?.replace(/\{\{#if reviewerName\}\}(.*?)\{\{\/if\}\}/gs, '$1')
                              || ''
                          }}
                        />
                      ) : (
                        <textarea
                          value={settings.email.templates.informationRequested?.body || ''}
                          onChange={(e) => updateSettings(['email', 'templates', 'informationRequested', 'body'], e.target.value)}
                          rows={15}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Workflow Settings Tab */}
      {activeTab === 'workflow' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Workflow Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Default Review Deadline (days)</label>
              <input
                type="number"
                value={settings.workflow.defaultReviewDeadlineDays}
                onChange={(e) => updateSettings(['workflow', 'defaultReviewDeadlineDays'], parseInt(e.target.value) || 7)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Cost for Additional Approval (AUD)</label>
              <input
                type="number"
                value={settings.workflow.minCostForAdditionalApproval}
                onChange={(e) => updateSettings(['workflow', 'minCostForAdditionalApproval'], parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Travellers per Application</label>
              <input
                type="number"
                value={settings.workflow.maxTravellersPerApplication}
                onChange={(e) => updateSettings(['workflow', 'maxTravellersPerApplication'], parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Travel Duration (days)</label>
              <input
                type="number"
                value={settings.workflow.maxTravelDurationDays}
                onChange={(e) => updateSettings(['workflow', 'maxTravelDurationDays'], parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.workflow.autoEscalationEnabled}
                  onChange={(e) => updateSettings(['workflow', 'autoEscalationEnabled'], e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Enable Auto-Escalation</span>
              </label>
            </div>
          </div>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Escalation Logic</h4>
            <p className="text-xs text-blue-800 mb-2">
              When auto-escalation is enabled, applications will be escalated based on the following rules:
            </p>
            <ul className="text-xs text-blue-800 list-disc list-inside space-y-1">
              <li>Applications exceeding the minimum cost threshold ({settings.workflow.minCostForAdditionalApproval.toLocaleString()} AUD) require additional approval</li>
              <li>Applications not reviewed within the deadline ({settings.workflow.defaultReviewDeadlineDays} days) will be escalated to higher-level reviewers</li>
              <li>Escalated applications will notify additional reviewers and administrators</li>
            </ul>
          </div>
        </div>
      )}

      {/* Uploads Settings Tab */}
      {activeTab === 'uploads' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">File Upload Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max File Size (MB)</label>
              <input
                type="number"
                value={settings.uploads.maxFileSizeMB}
                onChange={(e) => updateSettings(['uploads', 'maxFileSizeMB'], parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Allowed File Types (comma-separated)</label>
              <input
                type="text"
                value={settings.uploads.allowedFileTypes.join(', ')}
                onChange={(e) => updateSettings(['uploads', 'allowedFileTypes'], e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="pdf, doc, docx, jpg, png"
              />
              <p className="text-xs text-slate-500 mt-1">Enter file extensions without dots, separated by commas</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">File Retention Period (days)</label>
              <input
                type="number"
                value={settings.uploads.retentionDays}
                onChange={(e) => updateSettings(['uploads', 'retentionDays'], parseInt(e.target.value) || 365)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Security Settings Tab */}
      {activeTab === 'security' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Security Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Password Length</label>
              <input
                type="number"
                value={settings.security.minPasswordLength}
                onChange={(e) => updateSettings(['security', 'minPasswordLength'], parseInt(e.target.value) || 8)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="6"
                max="32"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password Expiration (days)</label>
              <input
                type="number"
                value={settings.security.passwordExpirationDays}
                onChange={(e) => updateSettings(['security', 'passwordExpirationDays'], parseInt(e.target.value) || 90)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
              />
              <p className="text-xs text-slate-500 mt-1">Set to 0 to disable password expiration</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Session Timeout (minutes)</label>
              <input
                type="number"
                value={settings.security.sessionTimeoutMinutes}
                onChange={(e) => updateSettings(['security', 'sessionTimeoutMinutes'], parseInt(e.target.value) || 60)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="15"
              />
            </div>
          </div>
        </div>
      )}

      {/* LDAP Settings Tab */}
      {activeTab === 'ldap' && settings.ldap && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">LDAP Configuration</h3>
          <p className="text-sm text-slate-600 mb-4">
            Configure LDAP integration to allow users to log in with their directory credentials.
          </p>

          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                checked={settings.ldap.enabled}
                onChange={(e) => updateSettings(['ldap', 'enabled'], e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Enable LDAP Authentication</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">LDAP Server URL</label>
                <input
                  type="text"
                  value={settings.ldap.url}
                  onChange={(e) => updateSettings(['ldap', 'url'], e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ldap://ldap.example.com:389"
                />
                <p className="text-xs text-slate-500 mt-1">e.g., ldap://hostname:389 or ldaps://hostname:636</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Search Base DN</label>
                <input
                  type="text"
                  value={settings.ldap.searchBase}
                  onChange={(e) => updateSettings(['ldap', 'searchBase'], e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="dc=example,dc=com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Search Filter</label>
                <input
                  type="text"
                  value={settings.ldap.searchFilter}
                  onChange={(e) => updateSettings(['ldap', 'searchFilter'], e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(uid={{username}})"
                />
                <p className="text-xs text-slate-500 mt-1">Use {'{{username}}'} as placeholder for the login username. Example: (sAMAccountName={'{{username}}'}) for Active Directory.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bind DN (Optional)</label>
                <input
                  type="text"
                  value={settings.ldap.bindDN}
                  onChange={(e) => updateSettings(['ldap', 'bindDN'], e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="cn=admin,dc=example,dc=com"
                />
                <p className="text-xs text-slate-500 mt-1">Leave blank for anonymous bind</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bind Password (Optional)</label>
                <input
                  type="password"
                  value={settings.ldap.bindCredentials}
                  onChange={(e) => updateSettings(['ldap', 'bindCredentials'], e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}



      {/* System Settings Tab */}
      {
        activeTab === 'system' && (
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">System Configuration</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.system.maintenanceMode}
                  onChange={(e) => updateSettings(['system', 'maintenanceMode'], e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Enable Maintenance Mode</span>
              </div>
              {settings.system.maintenanceMode && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Maintenance Message</label>
                  <textarea
                    value={settings.system.maintenanceMessage}
                    onChange={(e) => updateSettings(['system', 'maintenanceMessage'], e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Audit Log Retention (days)</label>
                <input
                  type="number"
                  value={settings.system.auditLogRetentionDays}
                  onChange={(e) => updateSettings(['system', 'auditLogRetentionDays'], parseInt(e.target.value) || 730)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>
            </div>
          </div>
        )
      }

      {/* Application Settings Tab */}
      {
        activeTab === 'application' && (
          <div className="space-y-6">
            <section className="bg-white p-6 rounded-lg border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Expense Types</h3>
              <p className="text-sm text-slate-600 mb-4">
                Manage the list of expense types available in the travel application form dropdown.
              </p>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newExpenseType}
                    onChange={(e) => setNewExpenseType(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newExpenseType.trim()) {
                        e.preventDefault();
                        const currentTypes = (settings.application?.expenseTypes || []);
                        if (!currentTypes.includes(newExpenseType.trim())) {
                          // Ensure application object exists
                          if (!settings.application) {
                            updateSettings(['application'], { expenseTypes: [] });
                          }
                          updateSettings(['application', 'expenseTypes'], [...currentTypes, newExpenseType.trim()]);
                          setNewExpenseType('');
                        }
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter new expense type (e.g., Airfare, Accommodation)"
                  />
                  <button
                    onClick={() => {
                      if (newExpenseType.trim()) {
                        const currentTypes = (settings.application?.expenseTypes || []);
                        if (!currentTypes.includes(newExpenseType.trim())) {
                          // Ensure application object exists
                          if (!settings.application) {
                            updateSettings(['application'], { expenseTypes: [] });
                          }
                          updateSettings(['application', 'expenseTypes'], [...currentTypes, newExpenseType.trim()]);
                          setNewExpenseType('');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(settings.application?.expenseTypes || []).map((type, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <span className="text-sm text-slate-700">{type}</span>
                        <button
                          onClick={() => {
                            const currentTypes = settings.application?.expenseTypes || [];
                            updateSettings(['application', 'expenseTypes'], currentTypes.filter((_, i) => i !== index));
                          }}
                          className="text-red-600 hover:text-red-800 text-sm font-bold text-lg leading-none"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {(!settings.application?.expenseTypes || settings.application.expenseTypes.length === 0) && (
                    <p className="text-sm text-slate-500 text-center py-4">No expense types configured. Add one above.</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        )
      }
    </div >
  );
};

