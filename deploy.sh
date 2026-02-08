#!/bin/bash

# NR Travel Webapp - Automated deployment/bootstrap script
# Usage:
#   ./deploy.sh --env production --url https://yourdomain.com
#   ./deploy.sh --env docker --url http://localhost:8090
#   ./deploy.sh --env production --url https://yourdomain.com --pull --branch main --down

set -euo pipefail

ENVIRONMENT="production"
BASE_URL=""
DO_PULL="false"
DO_DOWN="false"
BRANCH="main"

usage() {
  echo "Usage: ./deploy.sh [--env <development|docker|production>] [--url <base_url>]"
  echo "                 [--pull] [--branch <name>] [--down]"
  echo ""
  echo "Examples:"
  echo "  ./deploy.sh --env production --url https://travel.yourdomain.com"
  echo "  ./deploy.sh --env docker --url http://localhost:8090"
  echo "  ./deploy.sh --env production --url https://travel.yourdomain.com --pull --branch main --down"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --url)
      BASE_URL="$2"
      shift 2
      ;;
    --pull)
      DO_PULL="true"
      shift 1
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --down)
      DO_DOWN="true"
      shift 1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [ "$ENVIRONMENT" = "production" ] && [ -z "$BASE_URL" ]; then
  echo "ERROR: --url is required for production."
  exit 1
fi

if [ "$DO_PULL" = "true" ]; then
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
fi

echo "🔧 Checking prerequisites..."
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is not installed. Please install Node.js v18+."
  exit 1
fi
if ! command -v npm &> /dev/null; then
  echo "ERROR: npm is not installed."
  exit 1
fi
echo "✓ Node.js $(node --version)"
echo "✓ npm $(npm --version)"
echo ""

echo "📦 Installing backend dependencies..."
if [ ! -d "backend" ] || [ ! -f "backend/package.json" ]; then
  echo "ERROR: backend/package.json not found."
  exit 1
fi
(
  cd backend
  npm install
)
echo "✓ Backend dependencies installed"
echo ""

echo "📦 Installing frontend dependencies..."
if [ ! -d "frontend" ] || [ ! -f "frontend/package.json" ]; then
  echo "ERROR: frontend/package.json not found."
  exit 1
fi
(
  cd frontend
  npm install
)
echo "✓ Frontend dependencies installed"
echo ""

echo "🔍 Verifying lock files..."
if [ ! -f "backend/package-lock.json" ] || [ ! -f "frontend/package-lock.json" ]; then
  echo "ERROR: Missing package-lock.json files."
  exit 1
fi
echo "✓ Lock files verified"
echo ""

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    echo "ERROR: .env.example not found."
    exit 1
  fi
fi

if [ -n "$BASE_URL" ]; then
  ./setup-config.sh "$ENVIRONMENT" "$BASE_URL"
else
  ./setup-config.sh "$ENVIRONMENT"
fi

echo ""
echo "🔒 IMPORTANT: review .env for secrets (JWT_SECRET, REFRESH_SECRET, SMTP, DB password)."
echo ""

if [ "$DO_DOWN" = "true" ]; then
  docker compose down
fi

docker compose up -d --build

echo ""
echo "✅ Deployment complete."
echo "   Environment: $ENVIRONMENT"
echo "   Base URL: ${BASE_URL:-<not set>}"
