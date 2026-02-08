# Installation Guide

Quick setup for NR Travel Webapp using the automated deploy script.

## Quick Start (Recommended)

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/nr-travel-webapp.git
cd nr-travel-webapp
```

### 2. Run the Deploy Script
```bash
./deploy.sh --env docker --url http://localhost:8090
```

The script will:
- ✓ Verify Node.js and npm are installed
- ✓ Create `.env` file (if missing)
- ✓ Install backend + frontend dependencies
- ✓ Verify all lock files are in place
- ✓ Configure `.env` based on environment
- ✓ Auto-generate JWT secrets if missing
- ✓ Auto-generate `POSTGRES_PASSWORD` if missing (shown once)
- ✓ Default `POSTGRES_USER`/`POSTGRES_DB` to `travel` if placeholders
- ✓ Build and start Docker services

### 3. Configure Environment
Edit the `.env` file with your deployment-specific settings:
```bash
nano .env
# or your preferred editor
```

Key configuration areas:
- **Secrets**: `JWT_SECRET`, `REFRESH_SECRET` (change these!)
- **Database**: PostgreSQL connection details
- **URLs**: `CLIENT_URL`, `API_URL`, `PUBLIC_URL`
- **Email**: SMTP configuration for notifications
- **Storage**: `UPLOADS_DIR` path

### 4. Start the Application

For production:

```bash
./deploy.sh --env production --url https://yourdomain.com
```

#### Option B: Local Development
See [DEVELOPMENT.md](./DEVELOPMENT.md) for running locally

## Manual Installation (if script fails)

If the deploy script encounters issues:

```bash
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Troubleshooting

### "Node.js is not installed"
- Install Node.js v18+: https://nodejs.org/
- Verify installation: `node --version`

### "npm ci" fails in Docker
- Lock files are required. The deploy script creates them.
- Check that `backend/package-lock.json` and `frontend/package-lock.json` exist

### "Cannot find module" errors
- Run the deploy script again: `./deploy.sh --env docker --url http://localhost:8090`
- Or manually run `npm install` in each directory

## Requirements Met

✓ **Single command setup**: `./deploy.sh`  
✓ **Automatic .env creation**: Creates from template if missing  
✓ **Reproducible builds**: Lock files ensure consistent dependencies  
✓ **Long-term sustainability**: Easy for new team members  
✓ **Error checking**: Validates prerequisites and installation  

## Next Steps

- **Development**: See [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Production**: See [PRODUCTION.md](./PRODUCTION.md)
- **Docker**: See [docker-compose.yml](./docker-compose.yml)
- **Git Workflow**: See [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)

## Support

If you encounter any issues:
1. Check the error message from the deploy script
2. Review the relevant documentation file
3. Ensure all prerequisites are installed
4. Try running `./deploy.sh --env docker --url http://localhost:8090` again
