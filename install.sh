#!/bin/bash

# NR Travel Webapp - Install Script
# This script installs all dependencies for the application
# Usage: ./install.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   NR Travel Webapp - Installation      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if Node.js and npm are installed
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js v18+ from https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    echo "Please install npm (comes with Node.js)"
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"
echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}"
echo ""

# Check for .env file
echo -e "${YELLOW}Checking environment configuration...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "${YELLOW}⚠ .env file not found${NC}"
        echo "Copying .env.example to .env..."
        cp .env.example .env
        echo -e "${GREEN}✓ .env file created${NC}"
        echo -e "${YELLOW}⚠ IMPORTANT: Please edit .env with your configuration before running Docker!${NC}"
    else
        echo -e "${RED}✗ Neither .env nor .env.example found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi
echo ""

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
if [ ! -d "backend" ]; then
    echo -e "${RED}✗ backend directory not found${NC}"
    exit 1
fi

cd backend
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ package.json not found in backend${NC}"
    exit 1
fi

npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install backend dependencies${NC}"
    exit 1
fi
cd ..
echo ""

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
if [ ! -d "frontend" ]; then
    echo -e "${RED}✗ frontend directory not found${NC}"
    exit 1
fi

cd frontend
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ package.json not found in frontend${NC}"
    exit 1
fi

npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install frontend dependencies${NC}"
    exit 1
fi
cd ..
echo ""

# Verify lock files exist
echo -e "${YELLOW}Verifying lock files...${NC}"
if [ -f "backend/package-lock.json" ] && [ -f "frontend/package-lock.json" ]; then
    echo -e "${GREEN}✓ package-lock.json files verified${NC}"
else
    echo -e "${RED}✗ Missing package-lock.json files${NC}"
    exit 1
fi
echo ""

# Success message
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}✓ Installation completed successfully!${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review and update .env file with your configuration"
echo "2. For Docker setup: run ${YELLOW}docker compose up -d${NC}"
echo "3. For development: follow DEVELOPMENT.md"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "  - Development: see DEVELOPMENT.md"
echo "  - Production: see PRODUCTION.md"
echo "  - Environment: update .env file"
echo ""
