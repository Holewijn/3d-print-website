# AdminPortal — Complete Deployment Guide
## Proxmox LXC · Node.js · SQLite · JWT · NGINX Reverse Proxy

---

## 1. PROXMOX LXC CONTAINER CREATION

### 1.1 Recommended Resources
| Resource | Value     | Notes                          |
|----------|-----------|--------------------------------|
| Template | Ubuntu 22.04 LTS | Download from Proxmox template list |
| CPU      | 1–2 cores | 1 is fine for <50 concurrent users |
| RAM      | 512 MB    | 256 MB minimum, 1 GB comfortable |
| Disk     | 8 GB      | Root filesystem                |
| Network  | DHCP or static | Assign static IP recommended |
| Nesting  | OFF       | Not needed                     |
| Features | `keyctl=1` | Optional, improves security   |

### 1.2 Create via Proxmox UI
1. Click **Create CT** in the Proxmox web UI
2. Set **Hostname**: `adminportal`
3. Set a **root password** (or use SSH key)
4. Select **Ubuntu 22.04** template
5. Set disk, CPU, RAM as above
6. Set network: bridge `vmbr0`, IPv4 DHCP or static (e.g. `192.168.1.50/24`)
7. Click **Finish**, then **Start**

### 1.3 Create via CLI (on Proxmox host)
```bash
# Download template first if not present:
pveam update
pveam download local ubuntu-22.04-standard_22.04-1_amd64.tar.zst

# Create container (CT ID 210, adjust as needed)
pct create 210 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname adminportal \
  --memory 512 \
  --swap 512 \
  --cores 1 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --storage local-lvm \
  --rootfs local-lvm:8 \
  --password YourRootPassword \
  --unprivileged 1 \
  --start 1
```

### 1.4 Get Container IP
```bash
# On Proxmox host:
pct exec 210 -- ip addr show eth0 | grep inet
# Or in container console:
ip addr show eth0
```

---

## 2. INSIDE THE CONTAINER — FULL INSTALL

Enter the container:
```bash
# From Proxmox host:
pct enter 210
# Or via SSH:
ssh root@<container-ip>
```

### 2.1 System Update
```bash
apt update && apt upgrade -y
apt install -y curl git build-essential python3 ufw
```

### 2.2 Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version   # should show v20.x.x
npm --version    # should show 10.x.x
```

### 2.3 Install PM2 Globally
```bash
npm install -g pm2
pm2 --version
```

---

## 3. PROJECT SETUP

### 3.1 Clone from GitHub
```bash
# Option A — Clone your repo
git clone https://github.com/YOUR_USERNAME/adminportal.git /opt/adminportal

# Option B — Copy files manually (SCP from your machine)
# scp -r ./adminportal root@<container-ip>:/opt/adminportal
```

### 3.2 Set Ownership and Permissions
```bash
useradd -r -s /bin/false nodeapp 2>/dev/null || true
chown -R root:root /opt/adminportal
chmod +x /opt/adminportal/update.sh
```

### 3.3 Create Required Directories
```bash
mkdir -p /var/log/adminportal
mkdir -p /opt/adminportal/data
mkdir -p /opt/adminportal/uploads
chmod 755 /opt/adminportal/uploads
```

### 3.4 Create .env File
```bash
cat > /opt/adminportal/.env << 'EOF'
PORT=3000
NODE_ENV=production
JWT_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET_64_CHARS_MINIMUM
JWT_EXPIRES_IN=8h
DB_PATH=./data/adminportal.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=https://admin.yourdomain.com
EOF
```

**Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy the output and paste it as JWT_SECRET in .env
```

### 3.5 Install Dependencies
```bash
cd /opt/adminportal
npm install --omit=dev
```

> **Note on better-sqlite3:** This package requires native compilation.
> The `build-essential` and `python3` packages installed in step 2.1 handle this.
> If compilation fails: `npm rebuild better-sqlite3`

---

## 4. PM2 PROCESS MANAGER

### 4.1 Start the Application
```bash
cd /opt/adminportal
pm2 start ecosystem.config.js
```

### 4.2 Verify it's Running
```bash
pm2 status
pm2 logs adminportal --lines 30
curl http://127.0.0.1:3000/auth/me
# Should return: {"error":"Access token required"}  ← this means it's working
```

### 4.3 Enable Auto-Start on Boot
```bash
# Generate systemd startup script
pm2 startup systemd -u root --hp /root

# IMPORTANT: PM2 will print a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
# Copy and run that exact command, then:

pm2 save
```

### 4.4 Useful PM2 Commands
```bash
pm2 status                    # Show all processes
pm2 logs adminportal          # Live log stream
pm2 restart adminportal       # Restart app
pm2 reload adminportal        # Zero-downtime reload
pm2 stop adminportal          # Stop app
pm2 monit                     # Live monitoring dashboard
```

---

## 5. FIREWALL (UFW)

```bash
# Allow SSH (don't lock yourself out!)
ufw allow 22/tcp

# Allow the app port ONLY from the NGINX server IP
# Replace 192.168.1.100 with your NGINX server's IP
ufw allow from 192.168.1.100 to any port 3000 proto tcp

# Enable firewall
ufw --force enable
ufw status verbose
```

> **Security note:** Port 3000 should NOT be exposed to the internet.
> Only your NGINX server IP needs access.

---

## 6. NGINX REVERSE PROXY (External Server)

Run these commands on your **NGINX server** (not the LXC container).

### 6.1 Install Certbot (if not already)
```bash
apt install -y certbot python3-certbot-nginx
```

### 6.2 Create NGINX Site Config
Replace `192.168.1.50` with your LXC container's actual IP.
Replace `admin.yourdomain.com` with your actual domain.

```bash
cat > /etc/nginx/sites-available/adminportal.conf << 'NGINX'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=adminportal_login:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=adminportal_api:10m rate=60r/m;

server {
    listen 80;
    server_name admin.yourdomain.com;

    # Redirect HTTP → HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    # SSL — managed by Certbot
    ssl_certificate     /etc/letsencrypt/live/admin.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.yourdomain.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options            "SAMEORIGIN"   always;
    add_header X-Content-Type-Options     "nosniff"      always;
    add_header X-XSS-Protection           "1; mode=block" always;
    add_header Referrer-Policy            "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy         "geolocation=(), microphone=(), camera=()" always;
    add_header Strict-Transport-Security  "max-age=31536000; includeSubDomains" always;

    # Hide NGINX version
    server_tokens off;

    # Max upload size (match .env MAX_FILE_SIZE)
    client_max_body_size 10M;

    # Rate limit login endpoint
    location /auth/login {
        limit_req zone=adminportal_login burst=5 nodelay;
        proxy_pass http://192.168.1.50:3000;
        include /etc/nginx/proxy_params;
    }

    # Rate limit API
    location /api/ {
        limit_req zone=adminportal_api burst=20 nodelay;
        proxy_pass http://192.168.1.50:3000;
        include /etc/nginx/proxy_params;
    }

    # Uploaded files — serve with caching
    location /uploads/ {
        proxy_pass http://192.168.1.50:3000;
        include /etc/nginx/proxy_params;
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    # Frontend static assets — cache aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff2?)$ {
        proxy_pass http://192.168.1.50:3000;
        include /etc/nginx/proxy_params;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # All other requests
    location / {
        proxy_pass http://192.168.1.50:3000;
        include /etc/nginx/proxy_params;

        # WebSocket support (for future use)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Block hidden files
    location ~ /\. {
        deny all;
        return 404;
    }

    # Access and error logs
    access_log /var/log/nginx/adminportal_access.log;
    error_log  /var/log/nginx/adminportal_error.log;
}
NGINX
```

### 6.3 Create proxy_params (if missing)
```bash
cat > /etc/nginx/proxy_params << 'EOF'
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host  $host;
proxy_cache_bypass                 $http_upgrade;
proxy_connect_timeout              30s;
proxy_send_timeout                 30s;
proxy_read_timeout                 30s;
EOF
```

### 6.4 Enable Site and Get SSL Certificate
```bash
# Enable the site
ln -s /etc/nginx/sites-available/adminportal.conf /etc/nginx/sites-enabled/

# Test config
nginx -t

# Get SSL certificate (DNS must point to this NGINX server first!)
certbot --nginx -d admin.yourdomain.com --email you@yourdomain.com --agree-tos --non-interactive

# Reload NGINX
systemctl reload nginx
```

---

## 7. DEFAULT CREDENTIALS

After first boot, three users are seeded:

| Email                  | Password    | Role   |
|------------------------|-------------|--------|
| admin@example.com      | admin123    | Admin  |
| jane@example.com       | editor123   | Editor |
| bob@example.com        | viewer123   | Viewer |

**⚠️ Change these immediately after first login via the Users page!**

---

## 8. FOLDER STRUCTURE

```
/opt/adminportal/
├── server.js               # Express entry point
├── ecosystem.config.js     # PM2 config
├── package.json
├── .env                    # Environment variables (not in git)
├── update.sh               # Pull + restart script
│
├── routes/
│   ├── auth.js             # POST /auth/login, /auth/logout, /auth/me
│   └── api.js              # All /api/* protected routes
│
├── controllers/
│   ├── authController.js   # Login/logout logic
│   ├── statsController.js  # Dashboard stats
│   ├── settingsController.js
│   ├── pluginsController.js
│   ├── usersController.js
│   └── mediaController.js  # File upload/delete
│
├── middleware/
│   ├── auth.js             # JWT verify + RBAC
│   ├── logger.js           # Request log + audit log
│   └── validate.js         # Input validation
│
├── models/
│   └── db.js               # SQLite init + seed data
│
├── data/
│   └── adminportal.db      # SQLite database (auto-created, not in git)
│
├── uploads/                # Uploaded files (not in git)
│
└── public/                 # Frontend SPA
    ├── index.html
    ├── css/
    │   └── app.css
    └── js/
        └── app.js
```

---

## 9. API REFERENCE

All `/api/*` routes require: `Authorization: Bearer <jwt_token>`

| Method | Path                       | Role Required | Description          |
|--------|----------------------------|---------------|----------------------|
| POST   | /auth/login                | —             | Get JWT token        |
| POST   | /auth/logout               | any           | Log out              |
| GET    | /auth/me                   | any           | Get current user     |
| GET    | /api/stats                 | any           | Dashboard stats      |
| GET    | /api/settings              | any           | All settings         |
| POST   | /api/settings              | admin         | Update settings      |
| GET    | /api/plugins               | any           | List plugins         |
| POST   | /api/plugins               | admin         | Add plugin           |
| PATCH  | /api/plugins/:slug/toggle  | admin         | Enable/disable       |
| DELETE | /api/plugins/:slug         | admin         | Remove plugin        |
| GET    | /api/users                 | admin/editor  | List users           |
| POST   | /api/users                 | admin         | Create user          |
| PATCH  | /api/users/:id             | admin         | Update user          |
| DELETE | /api/users/:id             | admin         | Delete user          |
| GET    | /api/media                 | any           | List media           |
| POST   | /api/upload                | admin/editor  | Upload file          |
| DELETE | /api/media/:id             | admin/editor  | Delete file          |
| GET    | /api/pages                 | any           | List pages           |
| POST   | /api/pages                 | admin/editor  | Create page          |
| DELETE | /api/pages/:id             | admin/editor  | Delete page          |
| GET    | /api/activity              | admin         | Activity log         |

---

## 10. UPDATING THE APP

```bash
# SSH into the container:
ssh root@<container-ip>
cd /opt/adminportal
bash update.sh
```

Or if you prefer manual steps:
```bash
git pull origin main
npm install --omit=dev
pm2 reload adminportal --update-env
```

---

## 11. BACKUP

### Database backup (run daily via cron)
```bash
# Add to crontab: crontab -e
0 2 * * * cp /opt/adminportal/data/adminportal.db /opt/adminportal/data/adminportal.db.bak.$(date +\%Y\%m\%d)

# Keep only last 7 days
0 3 * * * find /opt/adminportal/data -name "*.bak.*" -mtime +7 -delete
```

### Uploads backup
```bash
0 2 * * * rsync -av /opt/adminportal/uploads/ /backup/adminportal/uploads/
```

---

## 12. TROUBLESHOOTING

| Issue | Fix |
|-------|-----|
| App won't start | `pm2 logs adminportal` — check for DB or .env issues |
| 502 Bad Gateway from NGINX | App isn't running: `pm2 status` |
| better-sqlite3 fails to install | Run `apt install -y build-essential python3` then `npm rebuild better-sqlite3` |
| Can't login | Check .env JWT_SECRET is set; check DB at `data/adminportal.db` exists |
| Uploads fail with 413 | Increase `client_max_body_size` in NGINX and `MAX_FILE_SIZE` in .env |
| Port 3000 unreachable from NGINX | Check UFW: `ufw allow from <nginx-ip> to any port 3000` |

---

## 13. ACCESS

After deployment:
- **URL**: `https://admin.yourdomain.com`
- **Login**: `admin@example.com` / `admin123`
- **Change password** immediately in the Users section
