# Database Migration for Settings

## Overview

Settings have been migrated from in-memory storage to PostgreSQL database for persistence and better management.

## Changes Made

### 1. Database Infrastructure
- **File**: `backend/src/services/database.ts`
- Created PostgreSQL connection pool
- Auto-creates `system_settings` table on startup
- Stores settings as JSONB for flexibility

### 2. Settings Service
- **File**: `backend/src/services/settingsService.ts`
- CRUD operations for settings
- Handles password masking
- Deep merge for partial updates
- Tracks who updated settings and when

### 3. Email Implementation
- **File**: `backend/src/services/notificationService.ts`
- Implemented real SMTP email sending using nodemailer
- Reads settings from database
- Supports TLS/SSL connections
- Works with Mailpit (development) and production SMTP servers

### 4. API Updates
- **File**: `backend/src/routes/admin.ts`
- All settings endpoints now use database
- Test email endpoint sends real emails

### 5. Server Initialization
- **File**: `backend/src/server.ts`
- Database initialization on startup
- Creates schema if it doesn't exist

## Database Schema

```sql
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255)
);
```

## Environment Variables

The database connection uses these environment variables (with defaults):

- `POSTGRES_HOST` (default: 'postgres')
- `POSTGRES_PORT` (default: 5432)
- `POSTGRES_USER` (default: 'travel')
- `POSTGRES_PASSWORD` (default: 'travel')
- `POSTGRES_DB` (default: 'travel')

These match the docker-compose.yml configuration.

## Email Configuration

### For Development (Mailpit)
If using Mailpit (included in docker-compose.yml):
- SMTP Host: `mailpit`
- SMTP Port: `1025`
- Username: (not required)
- Password: (not required)
- Secure: `false`

You can view emails at: http://localhost:58025

### For Production (Zoho SMTP)
Configure in Admin Panel → System Settings → Email:
- SMTP Host: `smtp.zoho.com` (or your SMTP server)
- SMTP Port: `587` (or `465` for SSL)
- Username: Your SMTP username
- Password: Your SMTP password
- Secure: `true` for port 465, `false` for port 587
- From: Your sender email
- Reply-To: Your reply-to email

## Testing Email

1. Go to Admin Panel → System Settings → Email tab
2. Configure your SMTP settings
3. Enter a test email address
4. Click "Send Test Email"
5. Check your inbox (or Mailpit if in development)

## Migration Notes

- Settings are automatically migrated on first startup
- Default settings are created if none exist
- All existing functionality preserved
- Settings persist across server restarts
- Password is masked in API responses

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL container is running: `docker compose ps`
- Check connection logs in backend container
- Verify environment variables match docker-compose.yml

### Email Not Sending
1. Check SMTP configuration in Admin Panel
2. Verify SMTP credentials are correct
3. Check backend logs for error messages
4. For Mailpit: Ensure mailpit container is running
5. For production: Check firewall/network settings
6. Test with "Send Test Email" button

### Settings Not Saving
- Check database connection
- Verify admin role permissions
- Check backend logs for errors
- Ensure PostgreSQL is accessible

