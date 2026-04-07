#!/usr/bin/env bash
# install-proxmox.sh — run on Proxmox HOST as root.
# One-command installer: creates LXC, installs Node/Postgres/PM2, clones repo, builds, starts.
set -euo pipefail

# ─── EDIT THESE IF NEEDED ──────────────────────────────
CTID="${CTID:-202}"
HOSTNAME="${HOSTNAME:-print3d-app}"
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-local}"
ROOTFS_STORAGE="${ROOTFS_STORAGE:-local-lvm}"
DISK_GB="${DISK_GB:-20}"
RAM_MB="${RAM_MB:-4096}"
SWAP_MB="${SWAP_MB:-512}"
CORES="${CORES:-2}"
BRIDGE="${BRIDGE:-vmbr0}"
NET_CONFIG="${NET_CONFIG:-name=eth0,bridge=${BRIDGE},ip=dhcp}"
UNPRIVILEGED="${UNPRIVILEGED:-1}"
NESTING="${NESTING:-1}"
OS_TEMPLATE="${OS_TEMPLATE:-debian-12-standard_12.7-1_amd64.tar.zst}"

GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/Holewijn/3d-print-website.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"
APP_PORT="${APP_PORT:-3000}"
APP_DIR="/opt/print3d"

SSH_PUBKEY_FILE="${SSH_PUBKEY_FILE:-}"

# ─── helpers ───────────────────────────────────────────
log()  { printf "\033[1;32m[install]\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m[error]\033[0m %s\n" "$*" >&2; }
rand() { tr -dc 'A-Za-z0-9' </dev/urandom | head -c "${1:-32}"; }

command -v pct   >/dev/null || { err "pct not found — run on Proxmox host."; exit 1; }
command -v pveam >/dev/null || { err "pveam not found."; exit 1; }

if pct status "$CTID" &>/dev/null; then
  err "CTID $CTID already exists."; exit 1
fi

# ─── ensure template ───────────────────────────────────
log "Ensuring template: $OS_TEMPLATE"
pveam update >/dev/null || true
if ! pveam list "$TEMPLATE_STORAGE" | grep -q "$OS_TEMPLATE"; then
  log "Downloading template…"
  pveam download "$TEMPLATE_STORAGE" "$OS_TEMPLATE"
fi
TEMPLATE_REF="${TEMPLATE_STORAGE}:vztmpl/${OS_TEMPLATE}"

# ─── secrets ───────────────────────────────────────────
ROOT_PASSWORD="$(rand 24)"
DB_PASSWORD="$(rand 32)"
JWT_SECRET="$(rand 48)"
ADMIN_EMAIL="admin@local"
ADMIN_PASSWORD="$(rand 16)"

# ─── create LXC ────────────────────────────────────────
log "Creating LXC $CTID ($HOSTNAME)…"
PCT_ARGS=(
  "$CTID" "$TEMPLATE_REF"
  --hostname "$HOSTNAME"
  --cores "$CORES"
  --memory "$RAM_MB"
  --swap "$SWAP_MB"
  --rootfs "${ROOTFS_STORAGE}:${DISK_GB}"
  --net0 "$NET_CONFIG"
  --unprivileged "$UNPRIVILEGED"
  --features "nesting=${NESTING}"
  --onboot 1
  --password "$ROOT_PASSWORD"
)
if [[ -n "$SSH_PUBKEY_FILE" && -f "$SSH_PUBKEY_FILE" ]]; then
  PCT_ARGS+=( --ssh-public-keys "$SSH_PUBKEY_FILE" )
fi
pct create "${PCT_ARGS[@]}"

log "Starting container…"
pct start "$CTID"
sleep 5

# wait for network
log "Waiting for network…"
for i in {1..30}; do
  if pct exec "$CTID" -- bash -c "getent hosts deb.debian.org >/dev/null 2>&1"; then break; fi
  sleep 2
done

# ─── install inside container ──────────────────────────
log "Installing base packages inside container…"
pct exec "$CTID" -- bash -lc "
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git build-essential postgresql postgresql-contrib sudo
"

log "Installing Node.js 20 LTS…"
pct exec "$CTID" -- bash -lc "
set -e
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -qq nodejs
npm install -g pnpm pm2
"

log "Configuring PostgreSQL…"
pct exec "$CTID" -- bash -lc "
set -e
systemctl enable --now postgresql
sudo -u postgres psql -c \"CREATE USER print3d WITH PASSWORD '${DB_PASSWORD}';\" || true
sudo -u postgres psql -c \"CREATE DATABASE print3d OWNER print3d;\" || true
sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE print3d TO print3d;\" || true
"

log "Cloning repo: $GIT_REPO_URL ($GIT_BRANCH)"
pct exec "$CTID" -- bash -lc "
set -e
mkdir -p /opt /var/log/print3d /var/lib/print3d/uploads
git clone --branch '${GIT_BRANCH}' '${GIT_REPO_URL}' '${APP_DIR}'
"

log "Writing .env…"
pct exec "$CTID" -- bash -lc "cat > ${APP_DIR}/.env <<EOF
NODE_ENV=production
PORT=${APP_PORT}
HOST=0.0.0.0
PUBLIC_URL=http://0.0.0.0:${APP_PORT}
DATABASE_URL=postgresql://print3d:${DB_PASSWORD}@localhost:5432/print3d
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
SESSION_COOKIE_NAME=p3d_session
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
UPLOAD_DIR=/var/lib/print3d/uploads
MAX_UPLOAD_MB=200
ENERGY_PROVIDER=manual
ENERGY_PRICE_KWH=0.30
GIT_REPO_URL=${GIT_REPO_URL}
GIT_BRANCH=${GIT_BRANCH}
APP_DIR=${APP_DIR}
EOF
chmod 600 ${APP_DIR}/.env"

log "Installing dependencies + building…"
pct exec "$CTID" -- bash -lc "
set -e
cd ${APP_DIR}
pnpm install --recursive
pnpm prisma:generate
pnpm prisma migrate deploy || pnpm prisma db push
node prisma/seed.js
pnpm build
"

log "Starting with PM2…"
pct exec "$CTID" -- bash -lc "
set -e
cd ${APP_DIR}
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | tail -n 1 | bash || true
"

CT_IP="$(pct exec "$CTID" -- bash -lc "hostname -I | awk '{print \$1}'")"

cat <<EOF

╔══════════════════════════════════════════════════════════╗
║  3D Print Website — installation complete                ║
╚══════════════════════════════════════════════════════════╝

  Container ID:   $CTID
  Hostname:       $HOSTNAME
  IP address:     $CT_IP
  App URL:        http://$CT_IP:$APP_PORT
  Admin URL:      http://$CT_IP:$APP_PORT/admin

  ── Credentials (SAVE THESE NOW) ────────────────────────
  Container root password : $ROOT_PASSWORD
  PostgreSQL password     : $DB_PASSWORD
  Admin email             : $ADMIN_EMAIL
  Admin password          : $ADMIN_PASSWORD
  JWT secret              : (stored in ${APP_DIR}/.env)

  Configure inside admin panel:
    • Mollie API key
    • Energy pricing (Zonneplan/EPEX or manual)
    • Printers (Moonraker)

  Update later:
    pct exec $CTID -- bash -lc "${APP_DIR}/scripts/update.sh"

EOF
