#!/bin/bash

# NR Travel Webapp - Automated deployment/bootstrap script
# Usage:
#   ./deploy.sh --env production --url https://yourdomain.com
#   ./deploy.sh --env docker --url http://localhost:8090
#   ./deploy.sh --env production --url https://yourdomain.com --pull --branch main --down
#   ./deploy.sh --env docker --url http://localhost:8090 --reset-db
#   ./deploy.sh --env production --url https://yourdomain.com --no-prompt

set -euo pipefail

ENVIRONMENT="production"
BASE_URL=""
DO_PULL="false"
DO_DOWN="false"
RESET_DB="false"
NO_PROMPT="false"
BRANCH="main"

usage() {
  echo "Usage: ./deploy.sh [--env <development|docker|production>] [--url <base_url>]"
  echo "                 [--pull] [--branch <name>] [--down] [--reset-db] [--no-prompt]"
  echo ""
  echo "Examples:"
  echo "  ./deploy.sh --env production --url https://travel.yourdomain.com"
  echo "  ./deploy.sh --env docker --url http://localhost:8090"
  echo "  ./deploy.sh --env production --url https://travel.yourdomain.com --pull --branch main --down"
  echo "  ./deploy.sh --env docker --url http://localhost:8090 --reset-db"
  echo "  ./deploy.sh --env production --url https://travel.yourdomain.com --no-prompt"
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
    --reset-db)
      RESET_DB="true"
      shift 1
      ;;
    --no-prompt)
      NO_PROMPT="true"
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

get_env_value() {
  local key="$1"
  local value=""
  if [ -f .env ]; then
    value=$(grep -E "^${key}=" .env | tail -n 1 | cut -d '=' -f2-)
  fi
  echo "$value"
}

set_env_value() {
  local key="$1"
  local value="$2"
  if grep -qE "^${key}=" .env; then
    sed -i '' "s#^${key}=.*#${key}=${value}#g" .env
  else
    echo "${key}=${value}" >> .env
  fi
}

is_placeholder() {
  local value="$1"
  case "$value" in
    ""|change-me*|your_*|REDACTED)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

generate_secret() {
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

JWT_SECRET_CURRENT=$(get_env_value JWT_SECRET)
REFRESH_SECRET_CURRENT=$(get_env_value REFRESH_SECRET)
POSTGRES_USER_CURRENT=$(get_env_value POSTGRES_USER)
POSTGRES_PASSWORD_CURRENT=$(get_env_value POSTGRES_PASSWORD)
POSTGRES_DB_CURRENT=$(get_env_value POSTGRES_DB)

# Auto-generate secrets if missing/placeholder
if is_placeholder "$JWT_SECRET_CURRENT"; then
  NEW_JWT_SECRET=$(generate_secret)
  set_env_value JWT_SECRET "$NEW_JWT_SECRET"
fi

if is_placeholder "$REFRESH_SECRET_CURRENT"; then
  NEW_REFRESH_SECRET=$(generate_secret)
  set_env_value REFRESH_SECRET "$NEW_REFRESH_SECRET"
fi

if is_placeholder "$POSTGRES_USER_CURRENT"; then
  set_env_value POSTGRES_USER "travel"
  echo "🧩 Set POSTGRES_USER=travel (default)"
fi

if is_placeholder "$POSTGRES_DB_CURRENT"; then
  set_env_value POSTGRES_DB "travel"
  echo "🧩 Set POSTGRES_DB=travel (default)"
fi

if is_placeholder "$POSTGRES_PASSWORD_CURRENT"; then
  GENERATED_DB_PASSWORD=$(generate_secret)
  set_env_value POSTGRES_PASSWORD "$GENERATED_DB_PASSWORD"
  echo "🔐 Generated POSTGRES_PASSWORD (stored in .env)."
  echo "    Save this value now: $GENERATED_DB_PASSWORD"
fi

if [ "$NO_PROMPT" != "true" ]; then
  read -r -p "Enter POSTGRES_USER to override (leave blank to keep current): " POSTGRES_USER_INPUT
  if [ -n "$POSTGRES_USER_INPUT" ]; then
    set_env_value POSTGRES_USER "$POSTGRES_USER_INPUT"
  fi

  read -r -p "Enter POSTGRES_DB to override (leave blank to keep current): " POSTGRES_DB_INPUT
  if [ -n "$POSTGRES_DB_INPUT" ]; then
    set_env_value POSTGRES_DB "$POSTGRES_DB_INPUT"
  fi

  read -r -p "Enter POSTGRES_PASSWORD to override (leave blank to keep current): " POSTGRES_PASSWORD_INPUT
  if [ -n "$POSTGRES_PASSWORD_INPUT" ]; then
    set_env_value POSTGRES_PASSWORD "$POSTGRES_PASSWORD_INPUT"
  fi
fi

echo ""
echo "🔒 IMPORTANT: review .env for secrets (JWT_SECRET, REFRESH_SECRET, SMTP, DB password)."
echo ""

if [ "$DO_DOWN" = "true" ]; then
  docker compose down
fi

if [ "$RESET_DB" = "true" ]; then
  echo "⚠️  Resetting database volume (destructive)..."
  docker compose down -v
fi

docker compose up -d --build

echo ""
echo "✅ Deployment complete."
echo "   Environment: $ENVIRONMENT"
echo "   Base URL: ${BASE_URL:-<not set>}"
