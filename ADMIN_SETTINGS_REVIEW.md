# Admin Settings Exposure Review

## Executive Summary

Yes, it is **absolutely possible and recommended** to expose backend settings to the admin module. This will provide the flexibility needed for third-party management without requiring code changes or deployments. This document reviews current settings and recommends additional ones to expose.

---

## Current Backend Settings Analysis

### Settings Currently in `config.ts`

1. **SMTP Configuration** (Currently in environment variables)
   - `SMTP_HOST` - Email server hostname
   - `SMTP_PORT` - Email server port (default: 587)
   - `SMTP_USERNAME` - SMTP authentication username
   - `SMTP_PASSWORD` - SMTP authentication password (sensitive)
   - `SMTP_FROM` - Default sender email address (e.g., "Travel Desk <no-reply@example.com>")

2. **Application Configuration**
   - `CLIENT_URL` - Frontend application URL
   - `UPLOADS_DIR` - File storage directory path
   - `API_PORT` - Backend server port (should NOT be exposed - infrastructure setting)

3. **Security Settings** (Should NOT be exposed - security risk)
   - `JWT_SECRET` - Token signing secret
   - `REFRESH_SECRET` - Refresh token secret

---

## Recommended Settings to Expose in Admin Panel

### 1. Email/Notification Settings ⭐ HIGH PRIORITY
**Why:** These change frequently and admins need to update SMTP credentials, reply-to addresses, and notification templates without developer intervention.

- **SMTP Configuration**
  - SMTP Host
  - SMTP Port
  - SMTP Username
  - SMTP Password (masked input with "show/hide" toggle)
  - From Email Address
  - From Display Name
  - Reply-To Email Address (currently missing - should be added)
  - Enable/Disable TLS/SSL
  - Test Email Button (send test email to verify configuration)

- **Email Templates**
  - Application Submitted Notification Template
  - Application Approved Template
  - Application Rejected Template
  - Reviewer Assignment Template
  - Password Reset Template
  - Signup Request Notification Template

- **Notification Preferences**
  - Enable/Disable email notifications globally
  - Notification recipients for different events
  - CC/BCC addresses for system notifications

### 2. Application Workflow Settings ⭐ HIGH PRIORITY
**Why:** Business rules change over time. Admins should control approval workflows, deadlines, and thresholds.

- **Review Workflow**
  - Default review deadline (days)
  - Auto-escalation settings (if no action taken)
  - Required approval levels (single vs. multi-level)
  - Minimum cost threshold requiring additional approvals
  - Enable/Disable auto-approval for low-cost requests

- **Application Rules**
  - Maximum file upload size (MB)
  - Allowed file types/extensions
  - Required fields validation rules
  - Maximum number of travellers per application
  - Maximum travel duration (days)

### 3. Department & Organizational Settings ⭐ MEDIUM PRIORITY
**Why:** Organizational structure changes. Admins should manage departments, department heads, and hierarchies.

- **Department Management**
  - List of departments/divisions
  - Default department head per department
  - Department head email addresses
  - Department codes
  - Department secretaries and their emails

- **Default Values**
  - Default cost center codes
  - Default approval workflows per department

### 4. User & Security Settings ⭐ MEDIUM PRIORITY
**Why:** Password policies, session management, and user defaults need periodic updates.

- **Password Policy**
  - Minimum password length
  - Password complexity requirements
  - Password expiration (days)
  - Password reset token expiration (hours)

- **Session Management**
  - Session timeout (minutes)
  - Remember me duration (days)
  - Maximum concurrent sessions per user

- **User Defaults**
  - Default role for new users
  - Auto-approve signup requests from specific domains
  - Require email verification

### 5. System Configuration ⭐ LOW PRIORITY
**Why:** System-level settings that may need occasional adjustment.

- **File Storage**
  - Storage location (if multiple options available)
  - File retention policy (days)
  - Auto-cleanup of old attachments

- **Audit & Logging**
  - Audit log retention period (days)
  - Enable/Disable detailed logging
  - Log level (DEBUG, INFO, WARN, ERROR)

- **System Maintenance**
  - Maintenance mode toggle
  - Maintenance message
  - Graceful shutdown notice

### 6. Integration Settings ⭐ MEDIUM PRIORITY
**Why:** External service integrations may need configuration updates.

- **External Services**
  - Cloudflare Tunnel configuration (if applicable)
  - Third-party API keys (if any)
  - Webhook endpoints for external notifications

---

## Implementation Recommendations

### 1. Data Storage Strategy

**Option A: Database Table (Recommended)**
- Create a `system_settings` table in your database
- Store settings as key-value pairs or JSON
- Allows versioning, audit trails, and easy backup/restore

**Option B: Environment Variables + Database Override**
- Keep critical settings in environment variables (fallback)
- Allow admin panel to override via database
- Best of both worlds: secure defaults + flexibility

**Option C: Configuration File (Not Recommended)**
- File-based storage is harder to manage in containerized environments
- Requires file system access and restarts

### 2. Security Considerations

**Sensitive Settings (Mask in UI, Encrypt at Rest)**
- SMTP passwords
- API keys
- JWT secrets (should NOT be exposed)

**Access Control**
- Only users with `ADMIN` role can view/edit settings
- Log all setting changes in audit trail
- Require confirmation for critical changes (e.g., disabling email notifications)

**Validation**
- Validate SMTP settings before saving (test connection)
- Validate email addresses, URLs, numeric ranges
- Prevent invalid configurations that could break the system

### 3. API Endpoints Needed

```
GET  /api/admin/settings              - Get all settings
GET  /api/admin/settings/:category    - Get settings by category
PUT  /api/admin/settings/:key         - Update a single setting
PUT  /api/admin/settings              - Bulk update settings
POST /api/admin/settings/test-email   - Test SMTP configuration
GET  /api/admin/settings/audit        - Get settings change history
```

### 4. Frontend Components Needed

- **Settings Dashboard** - Main settings page with categorized sections
- **SMTP Configuration Form** - With test email functionality
- **Email Template Editor** - Rich text editor for email templates
- **Workflow Configuration** - Visual workflow builder or form-based config
- **Department Management** - CRUD interface for departments
- **Settings Audit Log** - View history of setting changes

---

## Priority Implementation Plan

### Phase 1: Critical Settings (Week 1-2)
1. SMTP configuration (host, port, username, password, from, reply-to)
2. Email notification enable/disable toggle
3. Test email functionality

### Phase 2: Workflow Settings (Week 3-4)
1. Review deadlines and escalation rules
2. File upload limits and allowed types
3. Application validation rules

### Phase 3: Organizational Settings (Week 5-6)
1. Department management
2. Default department heads and secretaries
3. Default cost centers

### Phase 4: Advanced Settings (Week 7-8)
1. Email templates editor
2. Password policy configuration
3. Audit log retention settings

---

## Example Settings Schema

```typescript
interface SystemSettings {
  // Email Settings
  email: {
    smtp: {
      host: string;
      port: number;
      username: string;
      password: string; // encrypted
      from: string;
      fromName: string;
      replyTo: string;
      secure: boolean; // TLS/SSL
    };
    notifications: {
      enabled: boolean;
      applicationSubmitted: boolean;
      applicationApproved: boolean;
      applicationRejected: boolean;
    };
    templates: {
      applicationSubmitted: string;
      applicationApproved: string;
      applicationRejected: string;
    };
  };
  
  // Workflow Settings
  workflow: {
    defaultReviewDeadlineDays: number;
    autoEscalationEnabled: boolean;
    minCostForAdditionalApproval: number;
    maxTravellersPerApplication: number;
    maxTravelDurationDays: number;
  };
  
  // File Upload Settings
  uploads: {
    maxFileSizeMB: number;
    allowedFileTypes: string[];
    retentionDays: number;
  };
  
  // Security Settings
  security: {
    minPasswordLength: number;
    passwordExpirationDays: number;
    sessionTimeoutMinutes: number;
  };
  
  // System Settings
  system: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    auditLogRetentionDays: number;
  };
}
```

---

## Benefits of Exposing Settings

1. **Reduced Developer Dependency** - Admins can update configurations without code changes
2. **Faster Response to Changes** - No deployment needed for configuration updates
3. **Better Security** - Can rotate SMTP credentials without code access
4. **Improved Flexibility** - Easy to adapt to organizational changes
5. **Audit Trail** - Track who changed what and when
6. **Testing Capabilities** - Test email configurations directly from UI

---

## Conclusion

Exposing backend settings to the admin module is not only possible but highly recommended for a system that will be managed by a third party. Start with SMTP/email settings as they are the most frequently changed and critical for system operation. Gradually expand to include workflow, organizational, and system settings based on priority and need.

The implementation should use a database-backed approach with proper encryption for sensitive values, comprehensive validation, and full audit logging.

