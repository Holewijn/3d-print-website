#!/usr/bin/env bash
# update.sh — runs INSIDE the container. Pulls, builds, restarts, rolls back on failure.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/print3d}"
BACKUP_DIR="/var/backups/print3d"
TS="$(date +%Y%m%d-%H%M%S)"

log() { printf "\033[1;32m[update]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[error]\033[0m %s\n" "$*" >&2; }

cd "$APP_DIR"

mkdir -p "$BACKUP_DIR"
CURRENT_SHA="$(git rev-parse HEAD)"
echo "$CURRENT_SHA" > "$BACKUP_DIR/last-good.sha"
log "Current commit: $CURRENT_SHA"

rollback() {
  err "Update failed — rolling back to $CURRENT_SHA"
  cd "$APP_DIR"
  git reset --hard "$CURRENT_SHA"
  pnpm install --recursive || true
  pnpm build || true
  pm2 restart print3d || true
  exit 1
}
trap rollback ERR

log "git pull…"
git fetch --all
git reset --hard "origin/$(git rev-parse --abbrev-ref HEAD)"

log "pnpm install…"
pnpm install --recursive

log "prisma migrate…"
pnpm prisma:generate
pnpm prisma migrate deploy || pnpm prisma db push

log "build…"
pnpm build

log "restart pm2…"
pm2 restart print3d

trap - ERR
log "✔ Update complete: $(git rev-parse HEAD)"
