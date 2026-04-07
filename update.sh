#!/bin/bash
set -e
APP_DIR="/opt/adminportal"
echo "==> Pulling latest from GitHub..."
cd "$APP_DIR"
git fetch origin
git reset --hard origin/main
echo "==> Installing dependencies..."
npm install --omit=dev
echo "==> Reloading PM2..."
pm2 reload adminportal --update-env
pm2 save
echo "✓ AdminPortal updated"
pm2 status adminportal
