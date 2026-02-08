import { dbPool } from './database.js';
import type { SystemSettings } from '../types.js';
import { config } from '../config.js';
import { emailTemplateService } from './emailTemplateService.js';

const SETTINGS_KEY = 'system_settings';

// Default settings
const defaultSettings: SystemSettings = {
  email: {
    smtp: {
      host: config.smtp.host || '',
      port: config.smtp.port || 587,
      username: config.smtp.username || '',
      password: config.smtp.password || '',
      from: config.smtp.from || 'Travel Desk <no-reply@example.com>',
      fromName: 'Travel Desk',
      replyTo: config.smtp.from || 'no-reply@example.com',
      secure: true,
    },
    notifications: {
      enabled: true,
      applicationSubmitted: true,
      applicationApproved: true,
      applicationRejected: true,
      notifyApplicantOnSubmission: true,
    },
    templates: emailTemplateService.getDefaultTemplates(),
  },
  workflow: {
    defaultReviewDeadlineDays: 7,
    autoEscalationEnabled: true,
    minCostForAdditionalApproval: 5000,
    maxTravellersPerApplication: 10,
    maxTravelDurationDays: 30,
  },
  uploads: {
    maxFileSizeMB: 10,
    allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'],
    retentionDays: 365,
  },
  security: {
    minPasswordLength: 8,
    passwordExpirationDays: 90,
    sessionTimeoutMinutes: 60,
  },
  system: {
    maintenanceMode: false,
    maintenanceMessage: 'The system is currently under maintenance. Please try again later.',
    auditLogRetentionDays: 730,
  },
  application: {
    expenseTypes: ['Airfare', 'Accommodation', 'Meals', 'Transportation', 'Registration Fee', 'Visa', 'Insurance', 'Other'],
  },
  ldap: {
    enabled: false,
    url: 'ldap://localhost:389',
    bindDN: '',
    bindCredentials: '',
    searchBase: 'dc=example,dc=com',
    searchFilter: '(uid={{username}})',
  },
};

export const settingsService = {
  async getSettings(): Promise<SystemSettings> {
    try {
      const result = await dbPool.query(
        'SELECT value FROM system_settings WHERE key = $1',
        [SETTINGS_KEY]
      );

      if (result.rows.length === 0) {
        // Initialize with defaults if no settings exist
        await this.saveSettings(defaultSettings);
        return defaultSettings;
      }

      const settings = result.rows[0].value as SystemSettings;

      // Ensure templates exist (backward compatibility)
      if (!settings.email.templates) {
        settings.email.templates = emailTemplateService.getDefaultTemplates();
        // Save updated settings with templates
        await this.saveSettings(settings);
      }

      // Ensure notifyApplicantOnSubmission exists
      if (settings.email.notifications.notifyApplicantOnSubmission === undefined) {
        settings.email.notifications.notifyApplicantOnSubmission = true;
        await this.saveSettings(settings);
      }

      // Ensure application.expenseTypes exists
      if (!settings.application) {
        settings.application = defaultSettings.application;
        await this.saveSettings(settings);
      } else if (!settings.application.expenseTypes || !Array.isArray(settings.application.expenseTypes) || settings.application.expenseTypes.length === 0) {
        settings.application.expenseTypes = defaultSettings.application.expenseTypes;
        await this.saveSettings(settings);
      }

      // Ensure LDAP settings exist
      if (!settings.ldap) {
        settings.ldap = defaultSettings.ldap;
        await this.saveSettings(settings);
      }

      return settings;
    } catch (error) {
      console.error('Error getting settings:', error);
      // Return defaults on error
      return defaultSettings;
    }
  },

  async saveSettings(settings: SystemSettings, updatedBy?: string): Promise<SystemSettings> {
    try {
      await dbPool.query(
        `INSERT INTO system_settings (key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (key) 
         DO UPDATE SET value = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP`,
        [SETTINGS_KEY, JSON.stringify(settings), updatedBy || 'system']
      );
      return settings;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  },

  async updateSettings(updates: Partial<SystemSettings>, updatedBy?: string): Promise<SystemSettings> {
    const current = await this.getSettings();

    // Ensure templates exist in current settings
    if (!current.email.templates) {
      current.email.templates = emailTemplateService.getDefaultTemplates();
    }

    // Ensure notifyApplicantOnSubmission exists
    if (current.email.notifications.notifyApplicantOnSubmission === undefined) {
      current.email.notifications.notifyApplicantOnSubmission = true;
    }

    // Deep merge updates
    const updated: SystemSettings = {
      ...current,
      email: {
        ...current.email,
        ...(updates.email && {
          smtp: {
            ...current.email.smtp,
            ...updates.email.smtp,
            // Only update password if provided and not masked
            password: updates.email.smtp?.password && updates.email.smtp.password !== '***MASKED***'
              ? updates.email.smtp.password
              : current.email.smtp.password,
          },
          notifications: {
            ...current.email.notifications,
            ...updates.email.notifications,
          },
          templates: {
            ...current.email.templates,
            ...(updates.email.templates || {}),
          },
        }),
      },
      workflow: {
        ...current.workflow,
        ...updates.workflow,
      },
      uploads: {
        ...current.uploads,
        ...updates.uploads,
      },
      security: {
        ...current.security,
        ...updates.security,
      },
      system: {
        ...current.system,
        ...updates.system,
      },
      application: {
        ...current.application,
        ...updates.application,
      },
      ldap: {
        enabled: updates.ldap?.enabled ?? current.ldap?.enabled ?? false,
        url: updates.ldap?.url ?? current.ldap?.url ?? '',
        bindDN: updates.ldap?.bindDN ?? current.ldap?.bindDN ?? '',
        bindCredentials: updates.ldap?.bindCredentials ?? current.ldap?.bindCredentials ?? '',
        searchBase: updates.ldap?.searchBase ?? current.ldap?.searchBase ?? '',
        searchFilter: updates.ldap?.searchFilter ?? current.ldap?.searchFilter ?? '',
      },
    };

    return await this.saveSettings(updated, updatedBy);
  },
};

