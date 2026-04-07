#!/bin/bash
# AdminPortal update script — run inside the LXC container
set -e

APP_DIR="/opt/adminportal"
LOG_DIR="/var/log/adminportal"

echo "==> Pulling latest code from GitHub..."
cd "$APP_DIR"
git fetch origin
git reset --hard origin/main

echo "==> Installing/updating dependencies..."
npm install --omit=dev

echo "==> Restarting PM2 process..."
pm2 reload adminportal --update-env

echo "==> Saving PM2 process list..."
pm2 save

echo ""
echo "✓ AdminPortal updated and running."
pm2 status adminportal
