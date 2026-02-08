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
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your local development settings:

```env
# Database (if using Docker)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=travel_app_dev
DB_USER=postgres
DB_PASSWORD=postgres

# Backend
BACKEND_PORT=5000
NODE_ENV=development

# Frontend
FRONTEND_PORT=3000

# LDAP (if available locally)
LDAP_ENABLED=false

# Email (optional for dev)
SMTP_ENABLED=false
```

### 4. Database Setup

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL container
docker run -d \
  --name travel-app-db \
  -e POSTGRES_DB=travel_app_dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15-alpine

# Verify connection
psql -h localhost -U postgres -d travel_app_dev -c "SELECT 1;"
```

To stop the database:
```bash
docker stop travel-app-db
docker rm travel-app-db
```

#### Option B: Using Homebrew

```bash
# Install PostgreSQL
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Create database
createdb travel_app_dev

# Verify connection
psql -d travel_app_dev -c "SELECT 1;"
```

### 5. Run Database Migrations

```bash
cd backend
npm run migrate  # or appropriate migration command
cd ..
```

## Running the Application

### Development Mode (Separate Terminals)

#### Terminal 1: Start Backend

```bash
cd backend
npm run dev
# Backend should start on http://localhost:5000
```

#### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
# Frontend should start on http://localhost:5173 (Vite default)
# Check console output for exact port
```

#### Terminal 3 (Optional): Watch Mode

```bash
# If separate build/watch process is needed
cd backend
npm run watch
```

### Using Docker Compose (All Services)

```bash
# Start all services (backend, frontend, database)
docker-compose up

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up --build
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

# Frontend tests
cd frontend
npm test
```

## Troubleshooting

### Port Already in Use

See which process is using the port:
```bash
# macOS
lsof -i :5000  # for backend
lsof -i :3000  # for frontend
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

## Common Commands

```bash
# Start everything
npm run dev  # from project root (if configured)

# Run specific services
cd backend && npm run dev
cd frontend && npm run dev

# Format code
npm run format

# Lint
npm run lint

# Build for production
npm run build

# Create git branch
git checkout -b feature/branch-name

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
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
psql -d travel_app_dev

# Using Docker
docker exec -it travel-app-db psql -U postgres -d travel_app_dev
```

### Run SQL Scripts

```bash
# From bash
psql -d travel_app_dev -f scripts/your-script.sql

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
