#!/bin/bash
set -euo pipefail

# ── Auto-install helpers ──────────────────────────────────────────────────────

OS="$(uname -s)"

# Returns true if running inside WSL (any version)
is_wsl() {
  grep -qiE "microsoft|wsl" /proc/version 2>/dev/null
}

# Returns "2", "1", or "unknown"
wsl_version() {
  if grep -qi "WSL2" /proc/version 2>/dev/null; then
    echo "2"
  elif grep -qiE "microsoft|wsl" /proc/version 2>/dev/null; then
    echo "1"
  else
    echo "unknown"
  fi
}

# Start Docker daemon in a WSL-aware way (systemd may not be available)
start_docker_daemon() {
  if is_wsl; then
    # WSL2: try Docker Desktop socket first, then fallback to service/dockerd
    if [ -S /var/run/docker.sock ] && docker info &>/dev/null 2>&1; then
      return 0
    fi
    if command -v service &>/dev/null; then
      echo "  Starting Docker service (WSL)..."
      sudo service docker start || true
      sleep 3
    else
      echo "  Starting dockerd directly (WSL)..."
      sudo dockerd &>/dev/null &
      sleep 5
    fi
  elif command -v systemctl &>/dev/null && systemctl is-system-running &>/dev/null 2>&1; then
    echo "  Starting Docker daemon..."
    sudo systemctl start docker
    sleep 3
  elif command -v service &>/dev/null; then
    echo "  Starting Docker service..."
    sudo service docker start || true
    sleep 3
  fi
}

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

# Ensure curl is present (required for all auto-installs)
ensure_curl() {
  if ! command -v curl &>/dev/null; then
    echo "  curl not found — installing..."
    if command -v apt-get &>/dev/null; then
      sudo apt-get install -y curl
    elif command -v dnf &>/dev/null; then
      sudo dnf install -y curl
    elif command -v yum &>/dev/null; then
      sudo yum install -y curl
    else
      echo "ERROR: curl is required but could not be installed automatically."
      echo "  Please install curl and re-run this script."
      exit 1
    fi
  fi
}

install_node() {
  echo "📦 Node.js not found — attempting auto-install..."
  if [ "$OS" = "Darwin" ]; then
    ensure_brew
    brew install node
  elif [ "$OS" = "Linux" ]; then
    ensure_curl
    if command -v apt-get &>/dev/null; then
      # Debian/Ubuntu/WSL-Ubuntu: install Node.js 20 LTS via NodeSource
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
    ensure_curl
    if is_wsl; then
      WSL_VER=$(wsl_version)
      if [ "$WSL_VER" = "1" ]; then
        echo ""
        echo "ERROR: WSL1 does not support Docker Engine natively."
        echo "  Option 1 (recommended): Upgrade to WSL2 — run in PowerShell:"
        echo "    wsl --set-version <YourDistroName> 2"
        echo "  Option 2: Install Docker Desktop for Windows with WSL2 integration:"
        echo "    https://docs.docker.com/desktop/windows/wsl/"
        exit 1
      fi
      echo "  WSL2 detected."
      echo "  Tip: If Docker Desktop for Windows is installed, enable WSL2 integration"
      echo "  in Docker Desktop settings for the best experience."
      echo "  Proceeding with Docker Engine install inside WSL2..."
    fi
    if command -v apt-get &>/dev/null || command -v yum &>/dev/null || command -v dnf &>/dev/null; then
      curl -fsSL https://get.docker.com | sudo sh
      sudo usermod -aG docker "$USER" || true
      # Start service — WSL may not have systemd
      if is_wsl; then
        sudo service docker start || true
      elif command -v systemctl &>/dev/null && systemctl is-system-running &>/dev/null 2>&1; then
        sudo systemctl enable --now docker
      else
        sudo service docker start || true
      fi
      echo "  Docker installed and service started."
      echo "  NOTE: You may need to log out and back in for group membership to take effect."
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

# WSL version gate
if [ "$OS" = "Linux" ] && is_wsl; then
  WSL_VER=$(wsl_version)
  echo "ℹ️  Running inside WSL${WSL_VER}"
  if [ "$WSL_VER" = "1" ]; then
    echo "ERROR: WSL1 is not supported. Please upgrade to WSL2:"
    echo "  wsl --set-version <YourDistroName> 2"
    exit 1
  fi
  echo ""
fi

# curl (must come before any other auto-install)
ensure_curl
echo "✓ curl $(curl --version | head -1 | awk '{print $2}')"

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
    if is_wsl && [ "$(wsl_version)" = "1" ]; then
      echo "ERROR: WSL1 does not support Docker. Upgrade to WSL2 or use Docker Desktop."
      exit 1
    fi
    start_docker_daemon
  fi
  if ! docker info &>/dev/null 2>&1; then
    if is_wsl; then
      echo ""
      echo "ERROR: Docker daemon is not reachable in WSL."
      echo "  If you have Docker Desktop for Windows, enable WSL2 integration:"
      echo "    Docker Desktop → Settings → Resources → WSL Integration"
      echo "  Otherwise ensure the Docker service started: sudo service docker status"
    else
      echo "ERROR: Docker daemon still not reachable. Start Docker and re-run this script."
    fi
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

# Respect NGINX_PORT from .env if already set, otherwise default to 8090
NGINX_PORT=8090
if [ -f .env ]; then
  _PORT=$(grep -E '^NGINX_PORT=' .env | tail -n1 | cut -d'=' -f2-)
  if [ -n "$_PORT" ]; then
    NGINX_PORT="$_PORT"
  fi
fi

./deploy.sh --env docker --url "http://localhost:${NGINX_PORT}"
