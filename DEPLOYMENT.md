# Deployment & Configuration Guide

This guide explains how to configure and deploy the NR Travel Webapp for different environments.

## Quick Start: Auto-Configure for Your Environment

We provide a setup script that automatically configures everything:

```bash
# For local development
./setup-config.sh development

# For Docker deployment
./setup-config.sh docker

# For production (manual configuration required)
./setup-config.sh production
```

---

## Deployment Scenarios

### 1️⃣ Local Development

**Use when**: Developing features locally on macOS/Linux

```bash
# Setup configuration
./setup-config.sh development

# Install dependencies
./install.sh

# Start backend (in one terminal)
cd backend && npm run dev

# Start frontend (in another terminal)
cd frontend && npm run dev

# Access at: http://localhost:5173
```

**Configuration**:
- Frontend: `http://localhost:5173` (Vite dev server)
- Backend: `http://localhost:4000` (Node.js dev server)
- Database: PostgreSQL (via Docker or local)

---

### 2️⃣ Docker Container Deployment

**Use when**: Running the full stack with Docker Compose

```bash
# Setup configuration
./setup-config.sh docker

# Build and start all services
docker compose up -d

# Access at: http://localhost:8090
```

**What's included**:
- Nginx reverse proxy (port 8090)
- Frontend (built React app)
- Backend (Node.js)
- PostgreSQL database
- Redis cache
- Mailpit (email testing)

**Configuration in Docker**:
- Frontend uses **relative API path** `/api` (smart proxy through nginx)
- Backend listens on internal port 4000
- Nginx proxies all requests (frontend: `/`, API: `/api`)
- All services communicate via internal Docker network

**Benefits**:
- ✅ Single entry point (port 8090)
- ✅ Production-like architecture
- ✅ All services isolated
- ✅ Easy to replicate in production

---

### 3️⃣ Production Deployment

**Use when**: Deploying to a live server/cloud

#### Step 1: Configure Environment

Edit `.env` manually for production:

```bash
# Copy example to production .env
cp .env.example .env
nano .env  # Edit with production values
```

**Critical settings**:
```env
NODE_ENV=production

# Change these to STRONG values!
JWT_SECRET=use-a-strong-random-secret-min-32-chars
REFRESH_SECRET=use-another-strong-random-secret

# Set your actual domain
CLIENT_URL=https://travel.yourdomain.com
API_URL=https://travel.yourdomain.com
VITE_API_URL=/api
PUBLIC_URL=https://travel.yourdomain.com

# Database - use managed service credentials
POSTGRES_USER=prod_user
POSTGRES_PASSWORD=very-strong-password
POSTGRES_HOST=your-db-host
POSTGRES_DB=travel_prod

# Email - production SMTP server
SMTP_HOST=your-smtp-provider.com
SMTP_PORT=587
SMTP_USERNAME=your-email@yourdomain.com
SMTP_PASSWORD=your-app-password
```

#### Step 2: Generate Secrets

```bash
# Generate strong JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Use these values for JWT_SECRET and REFRESH_SECRET
```

#### Step 3: Deploy

```bash
# Clone repo
git clone <repo> /app/travel
cd /app/travel

# Install & build
./install.sh

# Start with Docker Compose
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or deploy to cloud (AWS, Heroku, DigitalOcean, etc.)
# using provided deployment configurations
```

---

## Configuration Architecture

### How URLs Work Across Environments

```
┌─────────────────────────────────────────────────────────┐
│                  DEVELOPMENT                            │
├──────────────────┬──────────────────┬──────────────────┤
│  Frontend        │   Backend        │  Communication   │
│  :5173           │   :4000          │                  │
│  (Vite)          │   (Node.js)      │  API_URL:4000    │
└──────────────────┴──────────────────┴──────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    DOCKER                               │
├──────────────────┬──────────────────┬──────────────────┤
│  Nginx           │  Frontend        │  Backend         │
│  :8090           │  (static)        │  :4000           │
│  (Reverse Proxy) │                  │  (internal)      │
│                  │                  │                  │
│  Requests:       │                  │                  │
│  /      → frontend                 │
│  /api   → backend:4000             │
└──────────────────┴──────────────────┴──────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 PRODUCTION (HTTPS)                      │
├──────────────────┬──────────────────┬──────────────────┤
│  Nginx/CDN       │  Frontend        │  Backend         │
│  yourdomain.com  │  (static)        │  (internal)      │
│  (Reverse Proxy) │                  │                  │
│  + SSL/TLS       │                  │                  │
└──────────────────┴──────────────────┴──────────────────┘
```

### Frontend API Discovery

The frontend uses smart URL detection:

```typescript
const apiUrl = import.meta.env.VITE_API_URL ?? '/api';

// Development:   VITE_API_URL = "http://localhost:4000"
// Docker:        VITE_API_URL = "/api" (relative)
// Production:    VITE_API_URL = "/api" (relative, via reverse proxy)
```

This means:
- **Development**: Direct calls to backend
- **Docker/Production**: Proxied through reverse proxy
- **No hardcoded domains** in frontend after build

---

## Environment Variables Reference

| Variable | Dev | Docker | Prod | Purpose |
|----------|-----|--------|------|---------|
| `NODE_ENV` | development | production | production | Node environment |
| `CLIENT_URL` | localhost:5173 | localhost:8090 | yourdomain.com | CORS origin |
| `API_URL` | localhost:4000 | localhost:8090 | yourdomain.com | Backend URL |
| `VITE_API_URL` | localhost:4000 | /api | /api | Frontend API endpoint |
| `PUBLIC_URL` | localhost:8090 | localhost:8090 | yourdomain.com | External access URL |
| `JWT_SECRET` | dev-value | prod-value | prod-value | **MUST CHANGE** |
| `POSTGRES_HOST` | localhost | postgres | managed-db.com | DB connection |

---

## Troubleshooting

### "Cannot access frontend at localhost:8090"

```bash
# Check if containers are running
docker ps

# Check logs
docker compose logs nginx

# Verify ports
netstat -an | grep 8090
```

### "API calls return 401/CORS errors"

```bash
# Check CLIENT_URL matches frontend origin
docker compose logs backend | grep "CORS"

# Verify nginx is routing /api correctly
docker compose logs nginx
```

### "Database connection failed"

```bash
# Check PostgreSQL is healthy
docker compose ps postgres

# Verify credentials in .env
docker compose logs postgres | head -20
```

### "Frontend API calls fail after rebuilding"

```bash
# Rebuild with correct env vars
./setup-config.sh docker
docker compose down
docker compose up -d --build
```

---

## Migration Between Environments

### Moving from Development → Docker

```bash
# 1. Create docker configuration
./setup-config.sh docker

# 2. Rebuild docker images with new config
docker compose up -d --build

# 3. Access at http://localhost:8090
```

### Moving from Docker → Production

```bash
# 1. Update .env for production domain
nano .env
# Change: PUBLIC_URL, CLIENT_URL, API_URL, POSTGRES_*, etc.

# 2. Update nginx.conf for production domain
# 3. Set up SSL certificate (Let's Encrypt)
# 4. Deploy using your cloud provider
```

---

## Best Practices

✅ **DO:**
- Use `./setup-config.sh` to initialize environment
- Keep secrets in `.env` (never commit this file)
- Use strong, unique JWT secrets in production
- Run `./install.sh` before deployment
- Version control `.env.example` with comments

❌ **DON'T:**
- Commit `.env` file to Git
- Use default passwords in production
- Hardcode URLs in code
- Expose sensitive logs publicly
- Skip the setup script

---

## Support

For detailed setup instructions:
- **Local Development**: See [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Installation**: See [INSTALL.md](./INSTALL.md)
- **Production**: See [PRODUCTION.md](./PRODUCTION.md)
