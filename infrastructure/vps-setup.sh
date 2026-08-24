#!/bin/bash
# ==============================================================================
# BrandOS VPS Bootstrap & Setup Script
# Ubuntu 22.04 / 24.04 LTS + Docker + Caddy + Node/pnpm
# ==============================================================================

set -e

echo "========================================================"
echo "🚀 Starting BrandOS VPS Environment Setup"
echo "========================================================"

# 1. Update system packages
echo "📦 Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get upgrade -y

# 2. Install essential utilities
echo "🔧 Installing essential packages..."
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    htop \
    unzip \
    tar \
    jq

# 3. Ensure Docker and Docker Compose plugin are installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing official Docker Engine..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
    echo "✅ Docker is already installed: $(docker --version)"
fi

# Enable and start Docker service
systemctl enable docker
systemctl start docker

# 4. Install Node.js 20 LTS and pnpm
if ! command -v node &> /dev/null; then
    echo "🟢 Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "✅ Node.js is already installed: $(node -v)"
fi

if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm@latest
else
    echo "✅ pnpm is already installed: $(pnpm -v)"
fi

# 5. Configure Firewall (UFW)
echo "🛡️ Configuring Firewall (UFW)..."
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

# 6. Create Application Directory
echo "📁 Setting up BrandOS app directory at /opt/brandos..."
mkdir -p /opt/brandos
mkdir -p /opt/brandos/caddy_data
mkdir -p /opt/brandos/caddy_config

echo ""
echo "========================================================"
echo "✅ BrandOS VPS Base Setup Complete!"
echo "========================================================"
echo "Docker version: $(docker --version)"
echo "Docker Compose: $(docker compose version)"
echo "Node version:   $(node -v)"
echo "pnpm version:   $(pnpm -v)"
echo "Firewall:       Active (Ports 22, 80, 443 open)"
echo "App Directory:  /opt/brandos"
echo "========================================================"
