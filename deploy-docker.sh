#!/bin/bash
set -euo pipefail

# ── Auto-install helpers ──────────────────────────────────────────────────────

OS="$(uname -s)"

ensure_brew() {
  if ! command -v brew &>/dev/null; then
    echo "  Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Add brew to PATH for Apple Silicon
    if [ -f /opt/homebrew/bin/brew ]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
  fi
}

install_node() {
  echo "📦 Node.js not found — attempting auto-install..."
  if [ "$OS" = "Darwin" ]; then
    ensure_brew
    brew install node
  elif [ "$OS" = "Linux" ]; then
    if command -v apt-get &>/dev/null; then
      # Debian/Ubuntu: install Node.js 20 LTS via NodeSource
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      sudo apt-get install -y nodejs
    elif command -v dnf &>/dev/null; then
      # Fedora/RHEL/Rocky/AlmaLinux — use NodeSource RPM repo
      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
      sudo dnf install -y nodejs
    elif command -v yum &>/dev/null; then
      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
      sudo yum install -y nodejs
    else
      echo "ERROR: Unsupported Linux package manager. Install Node.js v18+ manually: https://nodejs.org"
      exit 1
    fi
  else
    echo "ERROR: Unsupported OS '$OS'. Install Node.js v18+ manually: https://nodejs.org"
    exit 1
  fi
}

install_docker() {
  echo "🐳 Docker not found — attempting auto-install..."
  if [ "$OS" = "Darwin" ]; then
    ensure_brew
    brew install --cask docker
    echo ""
    echo "  Docker Desktop has been installed."
    echo "  Please open Docker Desktop from Applications and wait for it to start,"
    echo "  then press Enter to continue..."
    read -r
  elif [ "$OS" = "Linux" ]; then
    if command -v apt-get &>/dev/null || command -v yum &>/dev/null || command -v dnf &>/dev/null; then
      curl -fsSL https://get.docker.com | sudo sh
      sudo usermod -aG docker "$USER" || true
      sudo systemctl enable --now docker
      echo "  Docker installed and service started."
      echo "  NOTE: You may need to log out and back in for group membership to take effect."
      echo "        To avoid this now, subsequent docker commands will use sudo if needed."
    else
      echo "ERROR: Unsupported Linux package manager. Install Docker manually: https://docs.docker.com/engine/install/"
      exit 1
    fi
  else
    echo "ERROR: Unsupported OS '$OS'. Install Docker manually: https://docs.docker.com/engine/install/"
    exit 1
  fi
}

install_docker_compose() {
  echo "🐳 Docker Compose plugin not found — attempting auto-install..."
  if [ "$OS" = "Darwin" ]; then
    # On macOS, Docker Compose comes bundled with Docker Desktop
    echo "  On macOS, Docker Compose is bundled with Docker Desktop."
    echo "  Ensure Docker Desktop is fully started and try again."
    exit 1
  elif [ "$OS" = "Linux" ]; then
    if command -v apt-get &>/dev/null; then
      sudo apt-get install -y docker-compose-plugin 2>/dev/null || true
    fi
    # Fallback: install standalone docker-compose binary
    if ! docker compose version &>/dev/null 2>&1; then
      COMPOSE_VERSION=$(curl -fsSL https://api.github.com/repos/docker/compose/releases/latest \
        | grep '"tag_name"' | sed 's/.*"tag_name": "\(.*\)".*/\1/')
      sudo curl -SL \
        "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose
      sudo chmod +x /usr/local/bin/docker-compose
      echo "  docker-compose standalone binary installed at /usr/local/bin/docker-compose"
    fi
  fi
}

# ── Prerequisites check & auto-install ───────────────────────────────────────

echo "🔧 Checking prerequisites..."
echo ""

# Node.js
if ! command -v node &>/dev/null; then
  install_node
fi
echo "✓ Node.js $(node --version)"

# npm (bundled with Node.js; verify it's on PATH)
if ! command -v npm &>/dev/null; then
  echo "ERROR: npm not found even after Node.js install. Check your PATH and try again."
  exit 1
fi
echo "✓ npm $(npm --version)"

# Docker
if ! command -v docker &>/dev/null; then
  install_docker
fi
echo "✓ Docker $(docker --version | head -1)"

# Docker daemon running?
if ! docker info &>/dev/null 2>&1; then
  echo ""
  echo "⚠️  Docker is installed but the daemon is not running."
  if [ "$OS" = "Darwin" ]; then
    echo "  Please open Docker Desktop and wait for it to start, then press Enter to continue..."
    read -r
  elif [ "$OS" = "Linux" ]; then
    echo "  Attempting to start Docker daemon..."
    sudo systemctl start docker
    sleep 3
  fi
  if ! docker info &>/dev/null 2>&1; then
    echo "ERROR: Docker daemon still not reachable. Start Docker and re-run this script."
    exit 1
  fi
fi

# Docker Compose (prefer the modern plugin, fall back to standalone)
if ! docker compose version &>/dev/null 2>&1; then
  if docker-compose version &>/dev/null 2>&1; then
    echo "✓ docker-compose (standalone) $(docker-compose version --short)"
  else
    install_docker_compose
  fi
else
  echo "✓ Docker Compose $(docker compose version --short)"
fi

echo ""

# ── Deploy ────────────────────────────────────────────────────────────────────

./deploy.sh --env docker --url http://localhost:8090
