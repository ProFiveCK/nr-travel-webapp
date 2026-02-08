# 🚀 QUICK DEPLOYMENT CHECKLIST (Generic Version)

Use this checklist to deploy your changes to production safely.  
**This guide works for ANY developer or ops team member** (no hardcoded paths).

---

## ✅ STEP-BY-STEP FOR DEVELOPMENT MACHINE

### Step 1: Verify Latest Code

```bash
# Navigate to your project
cd your-project-directory

# Get latest changes
git pull origin develop
```

Expected: `Already up to date.` or shows new files

---

### Step 2: Test Locally (CRITICAL!)

```bash
# Stop any running containers
docker compose down

# Configure for Docker
./setup-config.sh docker

# Build and start
docker compose up -d --build
```

Wait for build to complete (green checkmarks)

**Test in browser:** http://localhost:8090

Try to login with: `admin@example.com` / `Admin123!`

✅ **If login works, continue**  
❌ **If error, STOP and fix it first**

---

### Step 3: Update Version Numbers

Update backend version:
```bash
# Edit backend/package.json
nano backend/package.json
```

Find: `"version": "0.1.0",`  
Change to: `"version": "1.0.0",`  
Save: `Ctrl + X` → `Y` → `Enter`

---

Same for frontend:
```bash
nano frontend/package.json
```

Change version to `1.0.0`

---

### Step 4: Update Changelog

```bash
nano CHANGELOG.md
```

Move this section:
```markdown
## [Unreleased]

Changes that are in development but not yet released.

### Added
- New features in development
```

To this:
```markdown
## [1.0.0] - 2026-02-08

### Added
- Initial production release
- User authentication
- Application workflow

### Fixed
- Initial release bugs

### Security
- JWT implemented
- Password hashing
```

Keep "Unreleased" below for future changes  
Save: `Ctrl + X` → `Y` → `Enter`

---

### Step 5: Final Test

```bash
./install.sh
docker compose down -v
docker compose up -d --build
```

Wait 10 seconds, verify:
```bash
curl http://localhost:8090
```

Should see HTML (not error)

---

### Step 6: Commit Release

```bash
git checkout -b release/1.0.0 develop
git add backend/package.json frontend/package.json CHANGELOG.md
git commit -m "chore: release version 1.0.0"
```

---

### Step 7: Create Version Tag

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
```

---

### Step 8: Push to Main

```bash
git push origin release/1.0.0
git push origin v1.0.0
git checkout main
git pull origin main
git merge --no-ff release/1.0.0
git push origin main
```

---

### Step 9: Merge Back to Develop

```bash
git checkout develop
git merge --no-ff release/1.0.0
git push origin develop
```

---

### Step 10: Clean Up

```bash
git branch -d release/1.0.0
git push origin --delete release/1.0.0
```

---

### ✅ DEVELOPMENT COMPLETE!

Your code is now on the `main` branch, ready for production deployment.

Next: **Give the PRODUCTION SERVER section below to your ops team**

---

---

## ✅ STEP-BY-STEP FOR PRODUCTION SERVER

### Prerequisites

Ask your IT if needed:
- SSH access to production server
- Docker installed
- Git installed

---

### Step 1: Connect to Server

```bash
ssh your-username@your-server-domain.com
```

Or if using IP:
```bash
ssh your-username@1.2.3.4
```

---

### Step 2: Navigate to Application

```bash
cd /app/travel
# (or wherever your application directory is)
```

---

### Step 3: Stop Current Version

```bash
docker compose down
```

Wait for completion (see message confirming)

---

### Step 4: Create Database Backup (Important!)

```bash
docker run --volumes-from nr-travel-webapp-postgres-1 -v $(pwd):/backup postgres:16-alpine \
  pg_dump -U travel -d travel > backup_$(date +%Y%m%d_%H%M%S).sql
```

Verify backup created:
```bash
ls -lh backup_*.sql
```

Should see a file with today's date

---

### Step 5: Pull Latest Code

```bash
git checkout main
git pull origin main
git log --oneline -3
```

Should show new commit "chore: release version 1.0.0" at top

---

### Step 6: Install Dependencies

```bash
./install.sh
```

Wait for completion (2-3 minutes)

---

### Step 7: Verify Configuration

```bash
nano .env
```

Check these critical values:
- `NODE_ENV=production` ✅
- `PUBLIC_URL=https://travel.yourdomain.com` ✅
- `JWT_SECRET` is NOT "change-me" ✅
- `POSTGRES_PASSWORD` is NOT "travel" ✅
- SMTP credentials are set ✅

If anything wrong, fix it  
Save: `Ctrl + X` → `Y` → `Enter`

---

### Step 8: Deploy

```bash
docker compose up -d --build
```

Wait 60 seconds for build to complete

---

### Step 9: Verify Services Running

```bash
docker compose ps
```

Should see 6+ containers with status "Up"

---

### Step 10: Check Logs

```bash
docker compose logs --tail=20
```

Look for:
- ✅ "API listening on port 4000"
- ✅ "nginx: ready for start up"
- ❌ If you see errors, check logs further

---

### Step 11: Test in Browser

```
https://travel.yourdomain.com
```

Try:
- ✅ See login page?
- ✅ Can login with production account?
- ✅ No error messages?

---

### 🎉 LIVE IN PRODUCTION!

If you got through all steps without errors, your v1.0.0 is now live!

---

---

## 🚨 IF SOMETHING BREAKS

### Immediate Rollback

```bash
docker compose down
git checkout tags/v0.1.0  # Previous version
docker run --volumes-from nr-travel-webapp-postgres-1 -v $(pwd):/backup postgres:16-alpine \
  psql -U travel -d travel < backup_20260208_123456.sql
docker compose up -d --build
```

Test: https://travel.yourdomain.com

---

### Check Error Details

```bash
docker compose logs backend | tail -50
docker compose logs frontend | tail -20
docker compose logs postgres | tail -20
```

Share these with development team

---

---

## 📋 QUICK CHECKLIST

### Development Machine:
- [ ] Latest code pulled
- [ ] Local tests pass
- [ ] Version numbers updated
- [ ] CHANGELOG updated
- [ ] Committed and tagged
- [ ] Pushed to main branch

### Production Server:
- [ ] SSH'd to server
- [ ] Docker stopped
- [ ] Database backed up
- [ ] Code pulled
- [ ] Dependencies installed
- [ ] .env verified
- [ ] Docker started
- [ ] Services running
- [ ] Tested in browser
- [ ] ✅ Live!

---

## 🎯 Key Points

✅ **Always test locally first**  
✅ **Always backup database before deploying**  
✅ **Always verify .env configuration**  
✅ **Always check logs after deploy**  
✅ **Keep backups for 7+ days**  

❌ **Never deploy untested code**  
❌ **Never commit .env file**  
❌ **Never skip the backup step**  
❌ **Never use default passwords in production**

---

## 📞 Getting Help

- See [SIMPLE_DEPLOYMENT_GUIDE.md](./SIMPLE_DEPLOYMENT_GUIDE.md) for detailed explanations
- See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for troubleshooting
- See [WHAT_TO_COMMIT.md](./WHAT_TO_COMMIT.md) for which files to commit
- See [START_HERE.md](./START_HERE.md) for guide navigation

---

**Good luck! You've got this! 🚀**
