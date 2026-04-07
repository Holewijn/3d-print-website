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
OS_TEMPLATE="debian-12-standard_12.12-1_amd64.tar.zst"

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

#!/bin/bash
# ================================================================
#  AdminPortal — Proxmox One-Shot Installer (GitHub edition)
#  Run ON THE PROXMOX HOST as root
#
#  Usage:
#    chmod +x install-adminportal.sh
#    bash install-adminportal.sh
#
#  What it does:
#    1. Asks a few questions (CT ID, IP, domain, NGINX IP)
#    2. Downloads Ubuntu 22.04 LXC template if needed
#    3. Creates and starts the LXC container
#    4. Installs Node.js 20 LTS, build tools, PM2
#    5. Clones AdminPortal from GitHub
#    6. Runs npm install (with native SQLite compilation)
#    7. Writes .env, starts app with PM2, enables auto-start
#    8. Configures UFW firewall
#    9. Prints your ready-to-paste NGINX config
# ================================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
info() { echo -e "${BLUE}[→]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; exit 1; }
step() { echo -e "\n${BOLD}${CYAN}━━━ $* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ── Preflight ─────────────────────────────────────────────────────
command -v pct &>/dev/null || err "pct not found — run this on the Proxmox host (tried PATH=$PATH)"
[[ $EUID -eq 0 ]] || err "Run as root"


# ── Banner ────────────────────────────────────────────────────────
clear
echo -e "${BOLD}${BLUE}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║         AdminPortal v2.1.0 — Installer           ║"
echo "  ║    Proxmox LXC · Node.js · SQLite · JWT          ║"
echo "  ║    Source: github.com/Holewijn/adminportal        ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Interactive config ────────────────────────────────────────────
step "Configuration"

while true; do
  read -rp "  GitHub repo URL   [https://github.com/Holewijn/adminportal.git]: " GITHUB_REPO
  GITHUB_REPO="${GITHUB_REPO:-https://github.com/Holewijn/adminportal.git}"
  # Strip trailing slash or .git-less URLs and normalise
  [[ "$GITHUB_REPO" == */ ]] && GITHUB_REPO="${GITHUB_REPO%/}"
  [[ "$GITHUB_REPO" != *.git ]] && GITHUB_REPO="${GITHUB_REPO}.git"
  # Basic validation — must start with http or git@
  if [[ "$GITHUB_REPO" =~ ^(https://|git@) ]]; then
    break
  else
    warn "Invalid URL — must start with https:// or git@"
  fi
done

NEXT_ID=$(pvesh get /cluster/nextid 2>/dev/null || echo "210")

read -rp "  Container ID          [${NEXT_ID}]: "       CT_ID;       CT_ID="${CT_ID:-$NEXT_ID}"
read -rp "  Container hostname    [adminportal]: "       CT_HOSTNAME; CT_HOSTNAME="${CT_HOSTNAME:-adminportal}"
read -rp "  CPU cores             [1]: "                 CT_CORES;    CT_CORES="${CT_CORES:-1}"
read -rp "  RAM in MB             [512]: "               CT_RAM;      CT_RAM="${CT_RAM:-512}"
read -rp "  Disk size in GB       [8]: "                 CT_DISK;     CT_DISK="${CT_DISK:-8}"
read -rp "  Network bridge        [vmbr0]: "             CT_BRIDGE;   CT_BRIDGE="${CT_BRIDGE:-vmbr0}"
read -rp "  IP (CIDR) or 'dhcp'  [dhcp]: "              CT_IP;       CT_IP="${CT_IP:-dhcp}"

if [[ "$CT_IP" != "dhcp" ]]; then
  read -rp "  Gateway IP: " CT_GW
  CT_GW="${CT_GW:-}"
fi

echo ""
STORAGES=$(pvesm status --content rootdir 2>/dev/null | awk 'NR>1 {print $1}' | tr '\n' ' ')
info "Storages available: ${STORAGES}"
read -rp "  Storage               [local-lvm]: " CT_STORAGE
CT_STORAGE="${CT_STORAGE:-local-lvm}"

echo ""
while true; do
  read -rsp "  Root password for container: " CT_PASSWORD; echo ""
  read -rsp "  Confirm password: " CT_PASSWORD2; echo ""
  [[ "$CT_PASSWORD" == "$CT_PASSWORD2" ]] && break
  warn "Passwords do not match, try again"
done
[[ ${#CT_PASSWORD} -ge 6 ]] || err "Password must be at least 6 characters"

echo ""
read -rp "  App port              [3000]: "                    APP_PORT;   APP_PORT="${APP_PORT:-3000}"
read -rp "  Your domain           [admin.example.com]: "       APP_DOMAIN; APP_DOMAIN="${APP_DOMAIN:-admin.example.com}"
read -rp "  NGINX server IP       [192.168.1.11]: "            NGINX_IP;   NGINX_IP="${NGINX_IP:-192.168.1.11}"

# Generate JWT secret safely
JWT_SECRET=$(cat /proc/sys/kernel/random/uuid | tr -d '-')$(cat /proc/sys/kernel/random/uuid | tr -d '-')
JWT_SECRET="${JWT_SECRET:0:64}"

# ── Summary ───────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}  ┌─ Summary ─────────────────────────────────────────┐${NC}"
printf "  │  %-20s %s\n" "Container ID:"   "$CT_ID"
printf "  │  %-20s %s\n" "Hostname:"       "$CT_HOSTNAME"
printf "  │  %-20s %s\n" "Resources:"      "${CT_CORES} CPU · ${CT_RAM}MB RAM · ${CT_DISK}GB disk"
printf "  │  %-20s %s\n" "Network:"        "bridge=${CT_BRIDGE}  ip=${CT_IP}"
printf "  │  %-20s %s\n" "Storage:"        "$CT_STORAGE"
printf "  │  %-20s %s\n" "App port:"       "$APP_PORT"
printf "  │  %-20s %s\n" "Domain:"         "$APP_DOMAIN"
printf "  │  %-20s %s\n" "NGINX IP:"       "$NGINX_IP"
printf "  │  %-20s %s\n" "Source:"         "$GITHUB_REPO"
echo -e "${BOLD}  └───────────────────────────────────────────────────┘${NC}"
echo ""
read -rp "  Proceed? [y/N]: " CONFIRM
[[ "${CONFIRM,,}" == "y" ]] || { echo "Aborted."; exit 0; }

# ── Download Ubuntu 22.04 template ───────────────────────────────
step "Checking Ubuntu 22.04 LXC Template"

TEMPLATE_STORAGE="local"
TEMPLATE_FILE=$(pveam list ${TEMPLATE_STORAGE} 2>/dev/null \
  | grep "ubuntu-22.04" | awk '{print $1}' | head -1)

if [[ -z "$TEMPLATE_FILE" ]]; then
  info "Template not cached — downloading..."
  pveam update 2>/dev/null | tail -1
  TEMPLATE_NAME=$(pveam available --section system 2>/dev/null \
    | grep "ubuntu-22.04" | awk '{print $2}' | head -1)
  [[ -z "$TEMPLATE_NAME" ]] && err "Ubuntu 22.04 template not found in pveam list"
  pveam download ${TEMPLATE_STORAGE} "${TEMPLATE_NAME}"
  TEMPLATE_FILE="${TEMPLATE_STORAGE}:vztmpl/${TEMPLATE_NAME}"
  log "Downloaded: ${TEMPLATE_NAME}"
else
  log "Template found: ${TEMPLATE_FILE}"
fi

# ── Create container ──────────────────────────────────────────────
step "Creating LXC Container ${CT_ID}"

if pct status "${CT_ID}" &>/dev/null; then
  warn "Container ${CT_ID} already exists!"
  read -rp "  Destroy and recreate it? [y/N]: " DESTROY_CONFIRM
  if [[ "${DESTROY_CONFIRM,,}" == "y" ]]; then
    pct stop "${CT_ID}" 2>/dev/null || true
    sleep 3
    pct destroy "${CT_ID}" --purge
    log "Old container destroyed"
  else
    err "Aborted — container ${CT_ID} already exists"
  fi
fi

if [[ "$CT_IP" == "dhcp" ]]; then
  NET_CONF="name=eth0,bridge=${CT_BRIDGE},ip=dhcp"
else
  NET_CONF="name=eth0,bridge=${CT_BRIDGE},ip=${CT_IP}"
  [[ -n "${CT_GW:-}" ]] && NET_CONF="${NET_CONF},gw=${CT_GW}"
fi

info "Creating container..."
pct create "${CT_ID}" "${TEMPLATE_FILE}" \
  --hostname  "${CT_HOSTNAME}" \
  --memory    "${CT_RAM}" \
  --swap      "${CT_RAM}" \
  --cores     "${CT_CORES}" \
  --net0      "${NET_CONF}" \
  --storage   "${CT_STORAGE}" \
  --rootfs    "${CT_STORAGE}:${CT_DISK}" \
  --password  "${CT_PASSWORD}" \
  --unprivileged 1 \
  --features  keyctl=1 \
  --onboot    1 \
  --start     0

log "Container ${CT_ID} created"

# ── Start and wait for network ────────────────────────────────────
info "Starting container..."
pct start "${CT_ID}"

info "Waiting for container to boot..."
sleep 8

info "Waiting for internet access..."
for i in {1..30}; do
  if pct exec "${CT_ID}" -- ping -c1 -W2 8.8.8.8 &>/dev/null; then
    log "Network is up"
    break
  fi
  [[ $i -eq 30 ]] && err "No internet after 60s — check your bridge/DHCP config"
  sleep 2
done

CONTAINER_IP=$(pct exec "${CT_ID}" -- hostname -I 2>/dev/null | awk '{print $1}')
log "Container IP: ${CONTAINER_IP}"

# ── System packages ───────────────────────────────────────────────
step "Installing System Packages"

pct exec "${CT_ID}" -- bash -c "
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get upgrade -y -qq
  apt-get install -y -qq \
    curl \
    git \
    build-essential \
    python3 \
    python3-dev \
    ufw \
    ca-certificates \
    gnupg \
    lsb-release
  echo 'done'
"
log "System packages installed"

# ── Node.js 20 LTS ───────────────────────────────────────────────
step "Installing Node.js 20 LTS"

pct exec "${CT_ID}" -- bash -c "
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
  apt-get install -y nodejs
  node --version
  npm --version
"
NODE_VER=$(pct exec "${CT_ID}" -- node --version)
log "Node.js ${NODE_VER} installed"

# ── PM2 ───────────────────────────────────────────────────────────
step "Installing PM2"
pct exec "${CT_ID}" -- npm install -g pm2 --silent
log "PM2 $(pct exec "${CT_ID}" -- pm2 --version) installed"

# ── Clone from GitHub ─────────────────────────────────────────────
step "Cloning AdminPortal from GitHub"

info "Cloning ${GITHUB_REPO}..."
pct exec "${CT_ID}" -- bash -c "
  rm -rf /opt/adminportal
  git clone ${GITHUB_REPO} /opt/adminportal
  echo 'Cloned files:'
  ls /opt/adminportal
"
log "Repository cloned to /opt/adminportal"

# ── Create required directories ───────────────────────────────────
step "Creating Runtime Directories"
pct exec "${CT_ID}" -- bash -c "
  mkdir -p /opt/adminportal/data
  mkdir -p /opt/adminportal/uploads
  mkdir -p /var/log/adminportal
  chmod 755 /opt/adminportal/uploads
  chmod +x  /opt/adminportal/update.sh 2>/dev/null || true
"
log "Directories created"

# ── Write .env ────────────────────────────────────────────────────
step "Writing Environment Config"

pct exec "${CT_ID}" -- bash -c "cat > /opt/adminportal/.env << 'ENVEOF'
PORT=${APP_PORT}
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=8h
DB_PATH=./data/adminportal.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=https://${APP_DOMAIN}
ENVEOF
echo 'written'
"
log ".env written (JWT secret auto-generated)"

# ── npm install ───────────────────────────────────────────────────
step "Installing Node.js Dependencies"
info "This takes 2-3 minutes — building native SQLite module..."

pct exec "${CT_ID}" -- bash -c "
  cd /opt/adminportal

  # Install all deps including native build
  npm install --omit=dev 2>&1

  # Explicitly verify better-sqlite3 loads
  node -e \"require('better-sqlite3'); console.log('better-sqlite3 OK')\"
"
log "npm dependencies installed and verified"

# ── Start with PM2 ───────────────────────────────────────────────
step "Starting AdminPortal with PM2"

pct exec "${CT_ID}" -- bash -c "
  cd /opt/adminportal
  pm2 delete adminportal 2>/dev/null || true
  pm2 start ecosystem.config.js
  sleep 5
  pm2 status
"

# PM2 auto-start on container boot
pct exec "${CT_ID}" -- bash -c "
  env PATH=\$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd \
    -u root --hp /root 2>/dev/null | grep 'sudo env' | bash 2>/dev/null || true
  pm2 save
"
log "PM2 started and configured for auto-start on boot"

# ── Verify API responds ───────────────────────────────────────────
step "Verifying Installation"
sleep 3

HEALTH=$(pct exec "${CT_ID}" -- \
  curl -sf "http://127.0.0.1:${APP_PORT}/auth/me" 2>/dev/null || echo "")

if echo "$HEALTH" | grep -q "Access token required"; then
  log "API health check: PASS ✓"
else
  warn "API not responding yet — showing PM2 logs:"
  pct exec "${CT_ID}" -- pm2 logs adminportal --nostream --lines 30
  err "App did not start correctly — see logs above"
fi

# ── UFW firewall ──────────────────────────────────────────────────
step "Configuring Firewall"

pct exec "${CT_ID}" -- bash -c "
  ufw --force reset > /dev/null
  ufw default deny incoming  > /dev/null
  ufw default allow outgoing > /dev/null
  ufw allow 22/tcp           comment 'SSH'           > /dev/null
  ufw allow from ${NGINX_IP} to any port ${APP_PORT} proto tcp \
                             comment 'AdminPortal from NGINX' > /dev/null
  ufw --force enable         > /dev/null
  ufw status
"
log "UFW enabled — port ${APP_PORT} allowed only from ${NGINX_IP}"

# ── Get final container IP ────────────────────────────────────────
CONTAINER_IP=$(pct exec "${CT_ID}" -- hostname -I 2>/dev/null | awk '{print $1}')

# ── Print NGINX config ────────────────────────────────────────────
step "NGINX Reverse Proxy Configuration"

echo ""
echo -e "${BOLD}${YELLOW}  ┌─ Copy this to your NGINX server (${NGINX_IP}) ─────────┐${NC}"
echo -e "${BOLD}${YELLOW}  │  File: /etc/nginx/sites-available/adminportal.conf  │${NC}"
echo -e "${BOLD}${YELLOW}  └─────────────────────────────────────────────────────┘${NC}"
echo ""
cat << NGINXEOF
limit_req_zone \$binary_remote_addr zone=ap_login:10m rate=10r/m;
limit_req_zone \$binary_remote_addr zone=ap_api:10m   rate=60r/m;

server {
    listen 80;
    server_name ${APP_DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${APP_DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${APP_DOMAIN}/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    add_header X-Frame-Options           "SAMEORIGIN"                      always;
    add_header X-Content-Type-Options    "nosniff"                         always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-XSS-Protection          "1; mode=block"                   always;
    server_tokens off;
    client_max_body_size 10M;

    location /auth/login {
        limit_req zone=ap_login burst=5 nodelay;
        proxy_pass http://${CONTAINER_IP}:${APP_PORT};
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        limit_req zone=ap_api burst=20 nodelay;
        proxy_pass http://${CONTAINER_IP}:${APP_PORT};
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://${CONTAINER_IP}:${APP_PORT};
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade           \$http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout                 60s;
    }

    location ~ /\. { deny all; return 404; }

    access_log /var/log/nginx/adminportal_access.log;
    error_log  /var/log/nginx/adminportal_error.log warn;
}
NGINXEOF

# ── NGINX setup commands ──────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}  Run these on your NGINX server (${NGINX_IP}):${NC}"
echo ""
echo "  # 1. Create the config file and paste the block above into it:"
echo "  nano /etc/nginx/sites-available/adminportal.conf"
echo ""
echo "  # 2. Enable the site:"
echo "  ln -s /etc/nginx/sites-available/adminportal.conf /etc/nginx/sites-enabled/"
echo "  nginx -t"
echo ""
echo "  # 3. Get SSL certificate (DNS must already point to ${NGINX_IP}):"
echo "  apt install -y certbot python3-certbot-nginx"
echo "  certbot --nginx -d ${APP_DOMAIN}"
echo ""
echo "  # 4. Reload NGINX:"
echo "  systemctl reload nginx"

# ── Final summary ─────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}  ✓  AdminPortal installed and running!${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
printf "  ${BOLD}%-22s${NC} %s\n" "Container:"      "CT ${CT_ID} (${CT_HOSTNAME})"
printf "  ${BOLD}%-22s${NC} %s\n" "Container IP:"   "${CONTAINER_IP}"
printf "  ${BOLD}%-22s${NC} %s\n" "Test now:"       "http://${CONTAINER_IP}:${APP_PORT}"
printf "  ${BOLD}%-22s${NC} %s\n" "After NGINX:"    "https://${APP_DOMAIN}"
echo ""
printf "  ${BOLD}%-22s${NC} %s\n" "Default email:"    "admin@example.com"
printf "  ${BOLD}%-22s${NC} %s\n" "Default password:" "admin123"
echo ""
echo -e "  ${YELLOW}⚠  Change the default password immediately after first login!${NC}"
echo ""
echo -e "  ${BOLD}Useful commands (run on Proxmox host):${NC}"
printf "  %-45s %s\n" "pct exec ${CT_ID} -- pm2 logs adminportal"    "# live log stream"
printf "  %-45s %s\n" "pct exec ${CT_ID} -- pm2 status"              "# process status"
printf "  %-45s %s\n" "pct exec ${CT_ID} -- pm2 restart adminportal" "# restart app"
printf "  %-45s %s\n" "pct exec ${CT_ID} -- pm2 monit"               "# live dashboard"
printf "  %-45s %s\n" "pct enter ${CT_ID}"                            "# enter container"
printf "  %-45s %s\n" "pct exec ${CT_ID} -- bash /opt/adminportal/update.sh" "# pull latest"
echo ""
