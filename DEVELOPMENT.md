# NR Travel Webapp - Development Setup (macOS)

This guide will help you set up the NR Travel Webapp for local development on macOS.

## Prerequisites

### Required
- **Node.js**: v18+ (LTS recommended)
  - Recommended: Use [nvm](https://github.com/nvm-sh/nvm) for Node version management
  - Install: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash`
  - Then: `nvm install 18` and `nvm use 18`

- **npm**: v8+
  - Comes with Node.js

- **Docker Desktop for Mac** (optional but recommended)
  - Download: https://www.docker.com/products/docker-desktop
  - Needed for running PostgreSQL and other services in containers

- **PostgreSQL** (one of the following)
  - Option A: Docker (recommended)
  - Option B: Install locally via Homebrew: `brew install postgresql`

- **Git**
  - Usually pre-installed, verify with: `git --version`

## Initial Setup

### 1. Clone & Enter Repository

```bash
# If you haven't already navigated to the project
cd /path/to/NR-travel-webapp
```

### 2. Install Dependencies

```bash
# Recommended: use the deploy script (installs deps, configures .env, starts Docker)
./deploy.sh --env docker --url http://localhost:8090
```

If you prefer manual install:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 3. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Review `.env.example` for all available configuration options, then edit `.env` with your local development settings.

**Recommended for Docker Compose (local)**:
```env
NODE_ENV=development
JWT_SECRET=your_dev_jwt_secret_here
REFRESH_SECRET=your_dev_refresh_secret_here
POSTGRES_USER=travel
POSTGRES_PASSWORD=your_dev_db_password_here
POSTGRES_DB=travel
CLIENT_URL=http://localhost:8090
API_URL=http://localhost:8090
VITE_API_URL=/api
NGINX_PORT=8090
SERVER_NAME=localhost
```

For a complete list of available variables, see `.env.example` in the repository root.

Tip: `./setup-config.sh docker` will generate the Docker-friendly URLs above.

### How `.env` Affects Docker + Nginx

- `.env` controls the backend URLs, database credentials, and frontend API base URL used at build/runtime.
- `nginx.conf` is static. The host port mapping is defined in `docker-compose.yml` (`8090:80`).
- If you want ports/server_name to be fully `.env`-driven, we should update `docker-compose.yml` to use variables and optionally template `nginx.conf`. I can wire this up if you want.

### 4. Database Setup

#### Option A: Docker Compose (Recommended)

```bash
docker compose up -d
```

This starts Postgres with the credentials from `.env` and the app containers.

#### Option B: Using Homebrew

```bash
# Install PostgreSQL
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Create database (match POSTGRES_DB in .env)
createdb travel

# Verify connection
psql -d travel -c "SELECT 1;"
```

If you use local Postgres, set `POSTGRES_HOST=localhost` in `.env`.

### 5. Run Database Migrations

The backend initializes its schema automatically on startup. No manual migration command is required.

## Running the Application

### Development Mode (Separate Terminals)

#### Terminal 1: Start Backend

```bash
cd backend
npm run dev
# Backend should start on http://localhost:4000
```

#### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
# Frontend should start on http://localhost:5173 (Vite default)
# Check console output for exact port
```

#### Terminal 3 (Optional)

No extra watch process is required; `npm run dev` covers backend hot-reload.

### Using Docker Compose (All Services)

```bash
# Start all services (backend, frontend, database)
docker compose up

# Stop services
docker compose down

# Rebuild after code changes
docker compose up --build
```

For a new machine or server, set `NGINX_PORT` and `SERVER_NAME` in `.env` to control the public port and hostname used by Nginx.

### One-Step Bootstrap (Local or Server)

```bash
./deploy.sh --env docker --url http://localhost:8090
```

## Development Workflow

### Hot Reloading

- **Backend**: Backend will automatically restart on file changes (if using nodemon)
- **Frontend**: Vite enables instant HMR (Hot Module Replacement)

### Making Changes

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test locally
4. Commit: `git commit -m "Add feature: description"`
5. Push: `git push origin feature/your-feature-name`

### Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests (not configured in this project)
# cd frontend && npm test
```

## Troubleshooting

### Port Already in Use

See which process is using the port:
```bash
# macOS
lsof -i :4000  # backend
lsof -i :5173  # frontend (Vite)
lsof -i :8090  # nginx (Docker)
```

Kill the process:
```bash
kill -9 <PID>
```

Or change ports in `.env` if available.

### Database Connection Refused

```bash
# Verify PostgreSQL is running
brew services list  # if using Homebrew
docker ps          # if using Docker

# Try connecting manually
psql -h localhost -U postgres
```

### Node Modules Issues

```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

### Docker Issues on macOS

Docker Desktop might have memory/CPU limits:
1. Open Docker Desktop preferences
2. Go to Resources
3. Increase Memory to at least 4GB
4. Increase CPU cores to at least 2

### 502 Bad Gateway (Docker)

If you rebuilt containers and see 502s, Nginx may still be pointing at old container IPs. Restart it:

```bash
docker compose restart nginx
```

## Common Commands

```bash
# Start backend / frontend
cd backend && npm run dev
cd frontend && npm run dev

# Lint
cd backend && npm run lint

# Build
cd backend && npm run build
cd frontend && npm run build

# Create git branch
git checkout -b feature/branch-name

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

## File Structure

```
.
├── backend/              # Node.js + TypeScript backend
│   ├── src/
│   ├── scripts/
│   └── package.json
├── frontend/             # React + TypeScript frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── docker-compose.yml    # Development services
├── nginx.conf           # Nginx configuration
├── .env.example         # Environment template
└── README.md            # Project documentation
```

## Database Quick Reference

### Access Database Console

```bash
# Using Homebrew
psql -d travel

# Using Docker Compose
docker compose exec postgres psql -U travel -d travel
```

### Run SQL Scripts

```bash
# From bash
psql -d travel -f scripts/your-script.sql

# Or inside psql console
\i scripts/your-script.sql
```

## Performance Tips

1. **Use nvm** to manage Node versions efficiently
2. **Enable Docker caching** by building images with BuildKit: `export DOCKER_BUILDKIT=1`
3. **Increase Docker memory** if running many services
4. **Use .env.local** for personal overrides without committing

## Production Deployment

For production deployment information, see [PRODUCTION.md](PRODUCTION.md) or the main [README.md](README.md).

## Additional Resources

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [Node.js Documentation](https://nodejs.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
