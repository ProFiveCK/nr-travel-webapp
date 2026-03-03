# Installation Guide

> **Windows users:** Run all commands inside **WSL2** (Windows Subsystem for Linux). WSL1 is not supported.

---

## Quick Start

### 1. Install Git

Git is the only prerequisite you need to install manually. Node.js, npm, and Docker are installed automatically by the deploy script if they are missing.

| OS | Command |
|---|---|
| Ubuntu / Debian / WSL | `sudo apt-get install -y git` |
| Fedora / RHEL / Rocky | `sudo dnf install -y git` |
| macOS | `xcode-select --install` |

Verify: `git --version`

### 2. Clone the Repository
```bash
git clone https://github.com/ProFiveCK/nr-travel-webapp.git
cd nr-travel-webapp
```

### 3. Make the Deploy Script Executable
```bash
chmod +x deploy-docker.sh
```

### 4. (Optional) Change the Default Port

The app defaults to port `8090`. To use a different port before first run:
```bash
echo "NGINX_PORT=9000" > .env
```

### 5. Run the Deploy Script
```bash
./deploy-docker.sh
```

The script will automatically:
- ✓ Install Node.js, npm, Docker, and Docker Compose if missing
- ✓ Create `.env` from template if missing
- ✓ Install backend + frontend dependencies
- ✓ Auto-generate JWT secrets and database password if missing
- ✓ Build and start all Docker services

### 6. Access the Application

Open `http://localhost:8090` (or your custom port) in your browser.  
See [DEVELOPMENT_CREDENTIALS.md](./DEVELOPMENT_CREDENTIALS.md) for default login credentials.

---

## Updating an Existing Install

```bash
cd nr-travel-webapp
git pull
./deploy-docker.sh
```

## Reset the Database (destructive)

```bash
./deploy-docker-reset-db.sh
```

---

## Configure Environment

Edit `.env` for deployment-specific settings:
```bash
nano .env
```

Key options:
- **Port**: `NGINX_PORT` (default: `8090`)
- **Secrets**: `JWT_SECRET`, `REFRESH_SECRET` — change in production!
- **Database**: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- **URLs**: `CLIENT_URL`, `API_URL`, `PUBLIC_URL`
- **Email**: `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`
- **Storage**: `UPLOADS_DIR`

See [.env.example](./.env.example) for all available options.

---

## Manual Installation (if script fails)

```bash
# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start services
docker compose up -d --build
```

---

## Troubleshooting

### "permission denied" running the script
```bash
chmod +x deploy-docker.sh
```

### Port already in use
Set a different port in `.env`:
```bash
echo "NGINX_PORT=9000" >> .env
```
Then re-run `./deploy-docker.sh`.

### Docker daemon not running (Linux)
```bash
sudo service docker start
```

### Docker not reachable in WSL2
In Docker Desktop → Settings → Resources → WSL Integration, enable your distro.

### "Cannot find module" errors
```bash
npm install   # run inside backend/ and frontend/
```

---

## Next Steps

- **Development**: See [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Production**: See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)
- **Git Workflow**: See [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)
- **All config options**: See [.env.example](./.env.example)
