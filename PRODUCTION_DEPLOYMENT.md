# Production Deployment & Safety Guide

This guide outlines the safe procedure for pushing code from development to the PROD main branch.

---

## Overview

The application uses **Git Flow** branching strategy with the following deployment path:

```
feature/* → develop → release/* → main (PROD)
```

---

## Pre-Deployment Checklist

### 1️⃣ Development & Testing

- [ ] All features are complete and tested locally
- [ ] Run linting and type checks:
  ```bash
  # Backend
  cd backend && npm run build
  
  # Frontend
  cd frontend && npm run build
  ```
- [ ] All tests pass (if applicable)
- [ ] No console errors or warnings
- [ ] Code review completed and approved
- [ ] ENV variables are properly configured

### 2️⃣ Security Review

**Before deploying, verify:**

- [ ] No hardcoded secrets in code
- [ ] All API endpoints have proper authentication
- [ ] Database queries use parameterized statements (SQL injection protection)
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] User input validation is in place
- [ ] Test users/credentials have been removed
- [ ] `.env` file is in `.gitignore` (never committed)

Check for secrets:
```bash
git log --all -p | grep -i "secret\|password\|api_key"
```

### 3️⃣ Database & Data

- [ ] Database migrations tested on development database
- [ ] Backup plan documented
- [ ] Rollback procedures tested
- [ ] No data loss risks
- [ ] Test data has been cleaned up

### 4️⃣ Configuration

- [ ] `.env` production values are set correctly
- [ ] `PUBLIC_URL` is set to production domain
- [ ] API endpoints point to production servers
- [ ] SMTP email credentials are production values
- [ ] Database credentials are production values
- [ ] SSL/HTTPS is configured

### 5️⃣ Documentation

- [ ] CHANGELOG.md is updated
- [ ] README.md reflects current state
- [ ] DEPLOYMENT.md is up to date
- [ ] API documentation is current (if applicable)

---

## Safe Deployment Process to PROD Main

### Step 1: Create Release Branch

```bash
# Ensure you have latest develop
git checkout develop
git pull origin develop

# Create release branch with version
git checkout -b release/1.0.0 develop
```

**Version numbering** (Semantic Versioning):
- `MAJOR.MINOR.PATCH` (e.g., 1.2.3)
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

### Step 2: Update Version Numbers

```bash
# Update backend version
nano backend/package.json
# Change "version": "1.0.0"

# Update frontend version
nano frontend/package.json
# Change "version": "1.0.0"
```

### Step 3: Update CHANGELOG

Create [CHANGELOG.md](./CHANGELOG.md) entry:

```markdown
## [1.0.0] - 2026-02-08

### Added
- New feature description
- Another feature

### Fixed
- Bug fix description
- Another fix

### Changed
- Breaking change description (if any)

### Security
- Security update description (if any)

### Deprecated
- Deprecated feature (if any)
```

### Step 4: Final Testing

```bash
# Rebuild everything
./deploy.sh --env production --url https://yourdomain.com

# Test in Docker (production mode)
./setup-config.sh production https://yourdomain.com
docker compose down
docker compose up -d --build

# Test critical flows:
# - User login
# - Application submission
# - Admin functions
# - Email notifications
# - Database operations

# View logs for errors
docker compose logs -f
```

### Step 5: Commit Release Changes

```bash
git add backend/package.json frontend/package.json CHANGELOG.md
git commit -m "chore: bump version to 1.0.0"
git push origin release/1.0.0
```

### Step 6: Create Pull Request

**On GitHub:**
1. Create PR from `release/1.0.0` → `main`
2. Title: `Release: v1.0.0`
3. Description:
   ```markdown
   ## Release v1.0.0
   
   ### Changes
   - [List key changes]
   
   ### Testing Completed
   - [x] Unit tests pass
   - [x] Docker deployment works
   - [x] Critical user flows tested
   - [x] Security review done
   
   ### Deployment Steps
   1. Merge this PR
   2. Pull latest main branch
3. Run: `./deploy.sh --env production --url https://yourdomain.com`
   4. Verify at: https://travel.yourdomain.com
   ```

### Step 7: Get Approval

- [ ] All checks pass (CI/CD, linting, tests)
- [ ] At least 2 code owners approve
- [ ] No merge conflicts
- [ ] All comments resolved

### Step 8: Merge to Main

**On GitHub, click "Merge Pull Request"** with these settings:
- Merge type: **"Create a merge commit"** (not squash or rebase)
- Delete branch after merge: **YES**

Or via CLI:
```bash
# Switch to main
git checkout main
git pull origin main

# Merge release branch
git merge --no-ff release/1.0.0

# Create version tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push to main
git push origin main --tags

# Delete release branch locally
git branch -d release/1.0.0
```

### Step 9: Update Develop

```bash
# Merge back to develop
git checkout develop
git pull origin develop
git merge --no-ff release/1.0.0
git push origin develop

# Delete release branch from remote
git push origin --delete release/1.0.0
```

### Step 10: Deploy to Production

```bash
# SSH into production server
ssh your-server.com

# Navigate to deployment directory
cd /app/travel

# Pull latest main branch
git checkout main
git pull origin main

# Install + configure + deploy
./deploy.sh --env production --url https://travel.yourdomain.com

# Review production settings if needed
nano .env

# Verify deployment
curl https://travel.yourdomain.com
docker compose logs -f
```

---

## Post-Deployment Verification

### 1️⃣ Health Checks

```bash
# Check application is running
curl https://travel.yourdomain.com/health

# Check API is responsive
curl https://travel.yourdomain.com/api/health

# View logs for errors
docker compose logs -f backend
docker compose logs -f frontend
```

### 2️⃣ Functionality Testing

- [ ] User login works
- [ ] Application submission works
- [ ] Admin functions work
- [ ] Email notifications send
- [ ] Database operations work
- [ ] No error messages in browser console

### 3️⃣ Performance Monitoring

- [ ] Check response times
- [ ] Monitor server CPU/Memory
- [ ] Check database performance
- [ ] Review error logs

### 4️⃣ Documentation

- [ ] Update deployment date
- [ ] Document any issues encountered
- [ ] Record production URL/credentials in secure location
- [ ] Notify stakeholders of successful deployment

---

## Rollback Procedure (If Needed)

If something goes wrong in production:

### Quick Rollback

```bash
# SSH into server
ssh your-server.com
cd /app/travel

# Revert to previous tag
git checkout tags/v1.0.0  # Previous version
docker compose down
docker compose up -d --build

# Test immediately
curl https://travel.yourdomain.com
```

### Database Rollback

If database schema changes caused issues:

```bash
# Restore from backup
docker exec nr-travel-webapp-postgres-1 psql -U travel -d travel < backup.sql

# Restart backend
docker compose restart backend
```

### Full Rollback

```bash
# Return to previous release tag
git checkout tags/v1.0.0
git checkout -b rollback-1.0.0
git push origin rollback-1.0.0

# Create PR and merge
# Then follow normal deployment process
```

---

## Emergency Hotfixes (Critical Issues in PROD)

For critical bugs in production that can't wait for next release:

```bash
# Create hotfix branch from main
git checkout -b hotfix/critical-issue main

# Fix the bug
# Test thoroughly

git checkout main
git merge --no-ff hotfix/critical-issue
git tag -a v1.0.1 -m "Hotfix version 1.0.1"
git push origin main --tags

# Merge back to develop
git checkout develop
git merge --no-ff hotfix/critical-issue
git push origin develop

# Deploy same as regular release
git push origin --delete hotfix/critical-issue
```

---

## Quick Reference

### Check Current Branch & Status

```bash
git status
git branch -v
git log --oneline -5
```

### View Tags

```bash
# List all tags
git tag

# Show specific tag
git show v1.0.0
```

### Common Mistakes to Avoid

❌ **DON'T:**
- Merge feature branches directly to main
- Commit `.env` files
- Force push (--force) to main branch
- Deploy without testing
- Skip the checklist
- Merge without approval
- Deploy with uncommitted changes

✅ **DO:**
- Follow the release branch process
- Always run tests before deploying
- Use pull requests
- Get code review approval
- Document changes in CHANGELOG
- Verify deployment worked
- Keep backups
- Communicate with team

---

## Support & Questions

For deployment issues:
1. Check [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Review [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)
3. Check application logs: `docker compose logs -f`
4. Contact DevOps team

**Deployment Contact:** DevOps Team  
**On-Call:** Check team Slack channel
