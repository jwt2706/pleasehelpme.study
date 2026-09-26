#!/usr/bin/env bash
# Say It Back — Vultr one-shot setup
#
# Run this ON the Vultr instance (Ubuntu 24.04 LTS), as a user with sudo.
#
# Usage:
#   1. Get the backend/ folder onto the server first, e.g. from your machine:
#        scp -r backend root@YOUR_VULTR_IP:~/say-it-back
#      or clone it from git if you're using a repo.
#   2. SSH in, cd into that folder, then run:
#        chmod +x deploy/setup.sh && ./deploy/setup.sh
#   3. Fill in .env when the script pauses for it.
#
# What this does:
#   - installs Node.js 20, pm2, and Caddy
#   - creates .env from .env.example if missing
#   - npm install
#   - starts the API under pm2 (auto-restarts on crash/reboot)
#   - configures Caddy to serve https://api.pleasehelpme.study with auto HTTPS

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "==> Installing Node.js 20 (if missing)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v

echo "==> Installing pm2 (if missing)"
if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

echo "==> Installing Caddy (if missing)"
if ! command -v caddy >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update
  sudo apt-get install -y caddy
fi

echo "==> Setting up environment file"
if [ ! -f .env ]; then
  cp .env.example .env
  echo
  echo "  !! .env created from .env.example — edit it now with real values:"
  echo "     nano $APP_DIR/.env"
  echo
  read -rp "Press Enter once .env is filled in to continue... "
fi

echo "==> Installing dependencies"
npm install --omit=dev

echo "==> Starting API with pm2"
pm2 start ecosystem.config.js
pm2 save
# Registers pm2 to relaunch the app after a server reboot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null

echo "==> Configuring Caddy (reverse proxy + automatic HTTPS)"
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy || sudo systemctl restart caddy

echo
echo "=================================================================="
echo " Done. Checklist:"
echo "  1. DNS: point api.pleasehelpme.study -> this server's IP (A record)"
echo "  2. Vultr firewall: allow ports 80 and 443 (and 22 for SSH)"
echo "  3. Test locally on the box:   curl localhost:3000/health"
echo "  4. Test publicly once DNS propagates: curl https://api.pleasehelpme.study/health"
echo "  5. Logs:   pm2 logs say-it-back"
echo "  6. Restart after editing code:  pm2 restart say-it-back"
echo "=================================================================="
