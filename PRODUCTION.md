# NR Travel Webapp - Production Deployment Guide

This guide covers deploying the NR Travel Webapp to a production environment.

## Pre-Deployment Checklist

- [ ] All tests passing locally and in CI/CD pipeline
- [ ] Environment variables configured for production
- [ ] Database backups configured
- [ ] SSL/TLS certificates obtained and installed
- [ ] Security scan completed
- [ ] Performance testing done
- [ ] Documentation updated
- [ ] Release notes prepared

## Environment Setup

### 1. Production Environment Variables

Create `.env` with production settings:

```env
# Database
DB_HOST=your-prod-db-host
DB_PORT=5432
DB_NAME=travel_app_prod
DB_USER=prod_user
DB_PASSWORD=<secure-password>

# Backend
BACKEND_PORT=5000
NODE_ENV=production

# Frontend
FRONTEND_PORT=3000
FRONTEND_URL=https://travel-app.example.com

# LDAP Configuration
LDAP_ENABLED=true
LDAP_SERVER=ldap://your-ldap-server
LDAP_BASE_DN=dc=example,dc=com

# Email Configuration
SMTP_SERVER=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=<secure-password>

# Security
JWT_SECRET=<secure-random-string>
SESSION_SECRET=<secure-random-string>

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/travel-app/app.log
```

### 2. System Requirements

**Server Specifications:**
- **CPU**: 4+ cores
- **RAM**: 8GB minimum (16GB recommended)
- **Disk**: 100GB+ SSD
- **OS**: Ubuntu 20.04 LTS or later, CentOS 8+, or RHEL 8+

**Required Software:**
- Node.js 18+ LTS
- PostgreSQL 13+
- Docker & Docker Compose (for containerized deployment)
- Nginx (reverse proxy)
- systemd (for service management)

## Deployment Options

### Option 1: Docker Compose (Recommended)

#### Prerequisites
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Deployment Steps

```bash
# Clone repository to production server
git clone https://github.com/your-repo/nr-travel-webapp.git /opt/nr-travel-webapp
cd /opt/nr-travel-webapp

# Copy production environment file
cp .env.example .env
# Edit .env with production values
nano .env

# Build and start services
docker-compose -f docker-compose.yml up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f
```

#### Backup Strategy

```bash
# Backup database daily (add to crontab)
0 2 * * * docker exec travel-app-db pg_dump -U postgres travel_app_prod > /backups/travel_app_db_$(date +\%Y\%m\%d).sql

# Backup uploads directory
0 3 * * * tar -czf /backups/uploads_$(date +\%Y\%m\%d).tar.gz /opt/nr-travel-webapp/uploads/
```

#### Scaling

```bash
# Scale backend services
docker-compose up -d --scale backend=3

# Update load balancer configuration in nginx.conf
```

### Option 2: Systemd Services (Manual)

#### 1. Create System User

```bash
sudo useradd -r -s /bin/false travel-app
```

#### 2. Deploy Application

```bash
sudo mkdir -p /opt/nr-travel-webapp
sudo chown -R travel-app:travel-app /opt/nr-travel-webapp
sudo -u travel-app git clone https://github.com/your-repo/nr-travel-webapp.git /opt/nr-travel-webapp
cd /opt/nr-travel-webapp
sudo -u travel-app npm install --production
```

#### 3. Create Systemd Service Files

**Backend Service** (`/etc/systemd/system/travel-app-backend.service`):
```ini
[Unit]
Description=NR Travel App Backend
After=network.target postgresql.service

[Service]
Type=simple
User=travel-app
WorkingDirectory=/opt/nr-travel-webapp/backend
ExecStart=/usr/bin/node /opt/nr-travel-webapp/backend/dist/server.js
Restart=on-failure
RestartSec=10
Environment="NODE_ENV=production"
EnvironmentFile=/opt/nr-travel-webapp/.env

[Install]
WantedBy=multi-user.target
```

**Frontend Service** (`/etc/systemd/system/travel-app-frontend.service`):
```ini
[Unit]
Description=NR Travel App Frontend
After=network.target

[Service]
Type=simple
User=travel-app
WorkingDirectory=/opt/nr-travel-webapp/frontend
ExecStart=/usr/bin/npm run preview
Restart=on-failure
RestartSec=10
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

#### 4. Start Services

```bash
sudo systemctl daemon-reload
sudo systemctl enable travel-app-backend travel-app-frontend
sudo systemctl start travel-app-backend travel-app-frontend
sudo systemctl status travel-app-backend travel-app-frontend
```

## Nginx Configuration

Use the provided `nginx.conf` as a reverse proxy:

```bash
# Copy Nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/travel-app

# Enable site
sudo ln -s /etc/nginx/sites-available/travel-app /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### SSL/TLS with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx -d travel-app.example.com

# Auto-renew
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Database Management

### Initial Setup

```bash
# Create database
sudo -u postgres createdb travel_app_prod

# Restore from backup or run migrations
psql -h localhost -U postgres -d travel_app_prod -f database/schema.sql
```

### Regular Maintenance

```bash
# Weekly VACUUM
0 3 * * 0 sudo -u postgres vacuumdb travel_app_prod

# Monthly ANALYZE
0 3 1 * * sudo -u postgres analyzedb travel_app_prod

# Backup retention (keep 30 days)
find /backups -name "travel_app_db_*.sql" -mtime +30 -delete
```

### Point-in-Time Recovery

```bash
# Enable WAL archiving in postgresql.conf
# Then restore from base backup and WAL files
pg_basebackup -h localhost -D /backups/recovery -Fp -Xs -P
```

## Monitoring & Logging

### Application Logs

```bash
# View backend logs
sudo journalctl -u travel-app-backend -f

# View frontend logs
sudo journalctl -u travel-app-frontend -f

# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Metrics to Monitor

- CPU usage: `top` or monitoring agent
- Memory usage: `free -h`
- Disk usage: `df -h`
- Database connections: Query `SELECT count(*) FROM pg_stat_activity;`
- Response times: Check Nginx access logs

### Recommended Monitoring Tools

- **Prometheus** + **Grafana** for metrics
- **ELK Stack** (Elasticsearch, Logstash, Kibana) for logs
- **Sentry** for error tracking
- **New Relic** or **DataDog** for APM

## Updates & Rolling Deployments

### Zero-Downtime Updates

```bash
# With Docker Compose
git pull origin main
docker-compose build
docker-compose up -d  # Swaps containers with zero downtime

# Verify new version
curl https://travel-app.example.com/api/health
```

### Database Migrations

```bash
# Test migration on staging first
npm run migrate --env=staging

# Schedule maintenance window for production
npm run migrate --env=production
```

## Security Hardening

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5432/tcp  # PostgreSQL (internal only)
```

### Application Security

- [ ] Enable CORS properly
- [ ] Set security headers (CSP, X-Frame-Options, etc.)
- [ ] Use HTTPS only
- [ ] Implement rate limiting
- [ ] Regular dependency updates: `npm audit fix`
- [ ] Password policies configured
- [ ] Two-factor authentication enabled
- [ ] Regular security scans

### Secrets Management

```bash
# Use environment-specific .env files
# Never commit .env to git
# Use a secrets manager in production

# Example: AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id travel-app/prod
```

## Disaster Recovery

### Backup Rotation Strategy

```
Daily backups: Keep 7 days
Weekly backups: Keep 4 weeks
Monthly backups: Keep 12 months

Total: ~100 backup files
```

### Restore Procedure

```bash
# Stop application
sudo systemctl stop travel-app-backend travel-app-frontend

# Restore database
psql -h localhost -U postgres -d travel_app_prod < /backups/travel_app_db_20240101.sql

# Restore uploads
tar -xzf /backups/uploads_20240101.tar.gz -C /opt/nr-travel-webapp/

# Start application
sudo systemctl start travel-app-backend travel-app-frontend

# Verify
curl https://travel-app.example.com/api/health
```

## Performance Optimization

### Database

- Index frequently queried columns
- Archive old records
- Connection pooling configuration
- Query optimization (see DATABASE_MIGRATION.md)

### Application

- Enable gzip compression in Nginx
- Minify CSS/JS (done in build)
- Implement caching headers
- CDN for static assets

### Infrastructure

- Load balancing across multiple instances
- Database read replicas
- Cache layer (Redis)
- Content Delivery Network (CDN)

## Rollback Procedure

```bash
# If new version has issues
git checkout <previous-tag>
docker-compose build
docker-compose up -d

# Or keep docker images with version tags
docker-compose -f docker-compose.prod.yml up -d
```

## Support & Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

## Maintenance Schedule

| Task | Frequency | Owner |
|------|-----------|-------|
| Database backups | Daily | Automated |
| Security updates | Weekly | DevOps |
| SSL certificate renewal | Monthly | Automated |
| Performance review | Monthly | Engineering |
| Full DR test | Quarterly | DevOps |
| Security audit | Annually | Security Team |
