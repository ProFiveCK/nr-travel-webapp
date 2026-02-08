# Development Credentials & Test Accounts

**⚠️ IMPORTANT: These credentials are for LOCAL DEVELOPMENT ONLY**  
**❌ DO NOT use these in production. Delete all test accounts before deploying to PROD.**

---

## Default Test Accounts

When the application first starts, it automatically seeds three test users for development:

### 👤 Admin User
- **Email**: `admin@example.com`
- **Password**: `Admin123!`
- **Roles**: ADMIN, REVIEWER
- **Department**: Operations

### 👤 Reviewer User
- **Email**: `reviewer@example.com`
- **Password**: `Review123!`
- **Roles**: REVIEWER
- **Department**: Finance

### 👤 Regular User
- **Email**: `user@example.com`
- **Password**: `User123!`
- **Roles**: USER
- **Department**: Marketing

---

## Accessing the Application

```
Local Development: http://localhost:5173 (Vite)
Docker Mode:       http://localhost:8090 (Nginx)
```

Select any account above and click "Login" to test the application.

---

## Testing Different Role Permissions

| Feature | Admin | Reviewer | User |
|---------|-------|----------|------|
| View Dashboard | ✅ | ✅ | ✅ |
| Create Application | ✅ | ✅ | ✅ |
| Review Applications | ✅ | ✅ | ❌ |
| Manage Settings | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ❌ |

---

## Pre-Production Checklist

### ❌ BEFORE DEPLOYING TO PRODUCTION:

- [ ] Delete all test users from database
- [ ] Update seed data in `backend/src/data/memoryStore.ts` to remove test accounts
- [ ] Change all default secrets in `.env`:
  - `JWT_SECRET` - use a strong random string
  - `REFRESH_SECRET` - use a strong random string  
  - `POSTGRES_PASSWORD` - use a strong database password
  - `SMTP_PASSWORD` - use production email credentials
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Update `PUBLIC_URL` to your actual production domain
- [ ] Update `SMTP_FROM` email address
- [ ] Run database migrations for production schema
- [ ] Set up regular database backups
- [ ] Enable HTTPS/SSL on production server
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging

### Database Cleanup Script (Run in Production After Deploy)

```sql
-- Delete test users
DELETE FROM users WHERE email IN (
  'admin@example.com',
  'reviewer@example.com', 
  'user@example.com'
);

-- Verify
SELECT COUNT(*) FROM users;
```

---

## Creating Real Users in Production

### Via Admin Panel

1. Login as admin with production credentials
2. Navigate to **Settings → User Management**
3. Click **Add User**
4. Fill in user details and temporary password
5. User will be prompted to change password on first login

### Via Database (Manual)

```sql
-- Create a new user (password: hashedValue)
INSERT INTO users (
  id,
  email,
  firstName,
  lastName,
  department,
  passwordHash,
  roles,
  status,
  createdAt
) VALUES (
  gen_random_uuid(),
  'newuser@yourdomain.com',
  'John',
  'Doe',
  'Finance',
  'argon2_hashed_password_here',
  ARRAY['USER'],
  'ACTIVE',
  NOW()
);
```

---

## Credential Management Best Practices

✅ **DO:**
- Use strong, unique passwords (minimum 12 characters)
- Store production secrets in secure environment variables
- Use a password manager for development credentials
- Rotate secrets regularly
- Use different credentials for each environment

❌ **DON'T:**
- Commit `.env` files to Git
- Share credentials via email or chat
- Use default credentials in production
- Reuse passwords across environments
- Log sensitive information

---

## Resetting Test Data (Development)

To reset all test data and recreate default users:

```bash
# Option 1: Remove database volume and restart
docker compose down -v
docker compose up -d

# Option 2: Direct database reset
docker compose exec postgres psql -U travel -d travel -c "
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
"
docker compose restart backend
```

---

## Troubleshooting Login Issues

### "Invalid credentials"
- Check spelling of email exactly (case-sensitive)
- Verify password is correct
- Ensure user account status is 'ACTIVE'

### "User not found"
- Verify database seeding completed (check logs)
- Run: `docker compose logs backend | grep "Admin user"`

### "Too many login attempts"
- Check rate limiting settings in `backend/src/config.ts`
- Clear session storage in browser
- Wait 15 minutes for rate limit to reset

---

## Support

For issues or questions:
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for configuration help
- See [DEVELOPMENT.md](./DEVELOPMENT.md) for local setup
- Review [GIT_WORKFLOW.md](./GIT_WORKFLOW.md) for branch management
