# Installation Guide

Quick setup for NR Travel Webapp using the automated install script.

## Quick Start (Recommended)

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/nr-travel-webapp.git
cd nr-travel-webapp
```

### 2. Run the Install Script
```bash
./install.sh
```

The script will:
- ✓ Verify Node.js and npm are installed
- ✓ Create `.env` file (if missing)
- ✓ Install backend dependencies
- ✓ Install frontend dependencies
- ✓ Verify all lock files are in place

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

#### Option A: Docker (Recommended for Production)
```bash
docker compose up -d
```

#### Option B: Local Development
See [DEVELOPMENT.md](./DEVELOPMENT.md) for running locally

## Manual Installation (if script fails)

If the install script encounters issues:

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
- Lock files are required. The install script creates them.
- Check that `backend/package-lock.json` and `frontend/package-lock.json` exist

### "Cannot find module" errors
- Run the install script again: `./install.sh`
- Or manually run `npm install` in each directory

## Requirements Met

✓ **Single command setup**: `./install.sh`  
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
1. Check the error message from the install script
2. Review the relevant documentation file
3. Ensure all prerequisites are installed
4. Try running `./install.sh` again
