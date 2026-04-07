/* ── AdminPortal Frontend v2.1.0 ──────────────────────────────── */

const API = '';
let authToken = localStorage.getItem('ap_token');
let currentUser = null;
let chartInstance = null;

/* ── UTILITY ──────────────────────────────────────────────────── */
function el(id) { return document.getElementById(id); }
function q(sel, ctx = document) { return ctx.querySelector(sel); }
function show(id) { el(id)?.classList.remove('hidden'); }
function hide(id) { el(id)?.classList.add('hidden'); }
function fmt(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}
function initials(name) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

/* ── TOAST ────────────────────────────────────────────────────── */
function toast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  el('toastContainer').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, duration);
}

/* ── MODAL ────────────────────────────────────────────────────── */
function openModal(title, bodyHTML) {
  el('modalTitle').textContent = title;
  el('modalBody').innerHTML = bodyHTML;
  show('modal');
}
function closeModal() { hide('modal'); }
el('modalClose').addEventListener('click', closeModal);
q('.modal-backdrop').addEventListener('click', closeModal);

/* ── API HELPER ───────────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (options.body instanceof FormData) delete headers['Content-Type'];

  try {
    const res = await fetch(API + path, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      if (path !== '/auth/login') { doLogout(); return null; }
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    toast(err.message, 'error');
    return null;
  }
}

/* ── AUTH ─────────────────────────────────────────────────────── */
async function doLogin() {
  const email = el('loginEmail').value.trim();
  const password = el('loginPassword').value;
  const btn = el('loginBtn');
  const errEl = el('loginError');

  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner"></div><span>Signing in…</span>';
  errEl.classList.add('hidden');

  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  btn.disabled = false;
  btn.innerHTML = '<span>Sign In</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

  if (!data) {
    errEl.textContent = 'Invalid credentials';
    errEl.classList.remove('hidden');
    return;
  }

  authToken = data.token;
  currentUser = data.user;
  localStorage.setItem('ap_token', authToken);
  localStorage.setItem('ap_user', JSON.stringify(currentUser));
  initApp();
}

function doLogout() {
  apiFetch('/auth/logout', { method: 'POST' });
  authToken = null;
  currentUser = null;
  localStorage.removeItem('ap_token');
  localStorage.removeItem('ap_user');
  hide('app');
  show('loginScreen');
  el('loginPassword').value = '';
}

el('loginBtn').addEventListener('click', doLogin);
el('loginEmail').addEventListener('keydown', e => { if (e.key === 'Enter') el('loginPassword').focus(); });
el('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
el('logoutBtn').addEventListener('click', doLogout);

/* ── NAVIGATION ───────────────────────────────────────────────── */
function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = q(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  const titles = {
    dashboard: ['Dashboard', 'Overview & System Summary'],
    pages: ['Pages', 'Content Management'],
    media: ['Media Library', 'Uploads & Files'],
    users: ['Users', 'Account Management'],
    plugins: ['Plugins', 'Extensions & Integrations'],
    seo: ['SEO', 'Search Engine Optimization'],
    settings: ['Settings', 'Site Configuration'],
  };
  const [title, sub] = titles[page] || ['', ''];
  el('pageTitle').textContent = title;
  el('pageSubtitle').textContent = sub;

  const content = el('pageContent');
  content.style.opacity = '0';

  const loaders = {
    dashboard: loadDashboard,
    pages: loadPages,
    media: loadMedia,
    users: loadUsers,
    plugins: loadPlugins,
    seo: loadSEO,
    settings: loadSettings,
  };

  (loaders[page] || (() => { content.innerHTML = '<p style="color:var(--text-muted)">Page coming soon.</p>'; }))();
  setTimeout(() => { content.style.transition = 'opacity 0.25s'; content.style.opacity = '1'; }, 50);

  // Close sidebar on mobile
  if (window.innerWidth < 900) el('sidebar').classList.remove('open');
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

el('menuToggle').addEventListener('click', () => el('sidebar').classList.toggle('open'));

// Quick actions (set from dashboard)
window.qAction = function(page) { navigateTo(page); };

/* ── MENU SEARCH ──────────────────────────────────────────────── */
el('menuSearch').addEventListener('input', function() {
  const q2 = this.value.toLowerCase();
  document.querySelectorAll('.nav-item').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(q2) ? '' : 'none';
  });
});

/* ── SIDEBAR MOBILE CLOSE ON OUTSIDE CLICK ───────────────────── */
document.addEventListener('click', e => {
  const sidebar = el('sidebar');
  if (window.innerWidth < 900 && sidebar.classList.contains('open')) {
    if (!sidebar.contains(e.target) && e.target !== el('menuToggle')) {
      sidebar.classList.remove('open');
    }
  }
});

/* ── DASHBOARD ────────────────────────────────────────────────── */
async function loadDashboard() {
  el('pageContent').innerHTML = `<div style="display:flex;align-items:center;gap:0.5rem;color:var(--text-muted)"><div class="loading-spinner"></div> Loading dashboard…</div>`;
  const data = await apiFetch('/api/stats');
  if (!data) return;

  const { stats, chartData, activity, recentPages } = data;

  el('pageContent').innerHTML = `
    <!-- STAT CARDS -->
    <div class="stats-grid">
      <div class="stat-card" style="--card-accent:var(--accent);--icon-bg:var(--accent-glow)">
        <div class="stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
        <div class="stat-value">${stats.pages.value}</div>
        <div class="stat-label">Total Pages</div>
        <div class="stat-change">↑ ${stats.pages.change} vs last month</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--green);--icon-bg:var(--green-glow)">
        <div class="stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
        <div class="stat-value">${stats.users.value}</div>
        <div class="stat-label">Active Users</div>
        <div class="stat-change">↑ ${stats.users.change} vs last month</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--purple);--icon-bg:rgba(139,92,246,0.12)">
        <div class="stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/></svg></div>
        <div class="stat-value">${stats.plugins.value}</div>
        <div class="stat-label">Active Plugins</div>
        <div class="stat-change">↑ ${stats.plugins.change} installed</div>
      </div>
      <div class="stat-card" style="--card-accent:var(--green);--icon-bg:var(--green-glow)">
        <div class="stat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        <div class="stat-value">${stats.siteHealth.value}</div>
        <div class="stat-label">Site Health</div>
        <div class="stat-change">↑ Score: ${stats.siteHealth.score}/100</div>
      </div>
    </div>

    <!-- CHART + HEALTH -->
    <div class="chart-grid">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Site Overview</div>
            <div class="chart-legend" style="margin-top:0.375rem">
              <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>Visitors</div>
              <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>Page Views</div>
            </div>
          </div>
          <div class="date-filter">
            <button class="date-btn active" onclick="this.closest('.date-filter').querySelectorAll('.date-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active')">30D</button>
            <button class="date-btn" onclick="this.closest('.date-filter').querySelectorAll('.date-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active')">7D</button>
            <button class="date-btn" onclick="this.closest('.date-filter').querySelectorAll('.date-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active')">90D</button>
          </div>
        </div>
        <div class="chart-wrapper"><canvas id="mainChart"></canvas></div>
      </div>
      <div class="card health-card">
        <div class="card-title" style="margin-bottom:0.5rem">Site Health</div>
        <div class="health-ring">
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="46" fill="none" stroke="var(--border)" stroke-width="8"/>
            <circle cx="55" cy="55" r="46" fill="none" stroke="var(--green)" stroke-width="8" stroke-dasharray="${2*Math.PI*46}" stroke-dashoffset="${2*Math.PI*46*(1-0.94)}" stroke-linecap="round"/>
          </svg>
          <div class="health-score" style="color:var(--green)">${stats.siteHealth.score}</div>
        </div>
        <div class="health-label">Overall Score</div>
        <div class="health-status">● Excellent</div>
        <div style="margin-top:1rem;width:100%">
          ${[['PHP 8.2', 'green'],['MySQL 8.0', 'green'],['SSL', 'green'],['WordPress', 'green']].map(([n,c]) =>
            `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid var(--border);font-size:0.78rem">
              <span style="color:var(--text-secondary)">${n}</span>
              <span class="badge badge-${c}">✓ OK</span>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- ACTIVITY + QUICK ACTIONS -->
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:1rem;margin-bottom:1.5rem">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Recent Activity</div>
          <button class="btn-secondary" onclick="navigateTo('pages')">View All</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Type</th><th>Author</th><th>Date</th></tr></thead>
            <tbody>
              ${recentPages.map(p => `
                <tr>
                  <td>${p.title}</td>
                  <td><span class="badge badge-${p.status === 'published' ? 'green' : 'gray'}">${p.type}</span></td>
                  <td>${p.author_name || '—'}</td>
                  <td>${timeAgo(p.updated_at)}</td>
                </tr>`).join('')}
              ${activity.slice(0, 3).map(a => `
                <tr>
                  <td>${a.resource || a.action}</td>
                  <td><span class="badge badge-blue">${a.action}</span></td>
                  <td>${a.user_name}</td>
                  <td>${timeAgo(a.created_at)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:1rem">Quick Actions</div>
        <div class="quick-actions">
          <button class="action-btn" onclick="qAction('pages')">
            <div class="action-icon" style="background:var(--accent-glow)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
            New Page
          </button>
          <button class="action-btn" onclick="qAction('media')">
            <div class="action-icon" style="background:var(--green-glow)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
            Upload
          </button>
          <button class="action-btn" onclick="qAction('plugins')">
            <div class="action-icon" style="background:rgba(139,92,246,0.12)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/></svg></div>
            Plugins
          </button>
          <button class="action-btn" onclick="qAction('settings')">
            <div class="action-icon" style="background:var(--amber-glow)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg></div>
            Settings
          </button>
          <button class="action-btn" onclick="qAction('seo')">
            <div class="action-icon" style="background:rgba(239,68,68,0.1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
            SEO
          </button>
          <button class="action-btn" onclick="qAction('users')">
            <div class="action-icon" style="background:rgba(20,184,166,0.12)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
            Users
          </button>
        </div>
      </div>
    </div>
  `;

  // Render chart
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  const ctx = q('#mainChart').getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Visitors', data: chartData.visitors,
          borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)',
          tension: 0.4, fill: true, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4
        },
        {
          label: 'Page Views', data: chartData.pageViews,
          borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.06)',
          tension: 0.4, fill: true, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#141720', borderColor: '#1e2535', borderWidth: 1, titleColor: '#e8ecf4', bodyColor: '#8892a4' } },
      scales: {
        x: { grid: { color: '#1e2535', drawBorder: false }, ticks: { color: '#4d5a6e', maxTicksLimit: 8, font: { size: 11 } } },
        y: { grid: { color: '#1e2535', drawBorder: false }, ticks: { color: '#4d5a6e', font: { size: 11 } } }
      }
    }
  });
}

/* ── PAGES ────────────────────────────────────────────────────── */
async function loadPages() {
  el('pageContent').innerHTML = `<div style="color:var(--text-muted);display:flex;align-items:center;gap:0.5rem"><div class="loading-spinner"></div>Loading…</div>`;
  const data = await apiFetch('/api/pages');
  if (!data) return;

  el('pageContent').innerHTML = `
    <div class="page-header">
      <h2>Pages</h2>
      <button class="btn-primary" onclick="showAddPageModal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add New Page
      </button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Author</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody>
            ${data.pages.map(p => `
              <tr>
                <td>${p.title}</td>
                <td><code style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted)">/${p.slug}</code></td>
                <td><span class="badge badge-${p.status === 'published' ? 'green' : 'gray'}">${p.status}</span></td>
                <td>${p.author_name || '—'}</td>
                <td>${timeAgo(p.updated_at)}</td>
                <td>
                  <button class="btn-danger" onclick="deletePage(${p.id}, '${p.title.replace(/'/g,"\\'")}')">Delete</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

window.showAddPageModal = function() {
  openModal('Add New Page', `
    <div class="form-field"><label>Page Title</label><input id="newPageTitle" placeholder="e.g. About Us"/></div>
    <div class="form-field"><label>Slug</label><input id="newPageSlug" placeholder="e.g. about-us"/></div>
    <div class="form-field"><label>Status</label>
      <select id="newPageStatus"><option value="draft">Draft</option><option value="published">Published</option></select>
    </div>
    <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.25rem">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="addPage()">Create Page</button>
    </div>`);
  // Auto slug from title
  el('newPageTitle').addEventListener('input', function() {
    el('newPageSlug').value = this.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  });
};

window.addPage = async function() {
  const res = await apiFetch('/api/pages', { method: 'POST', body: JSON.stringify({ title: el('newPageTitle').value, slug: el('newPageSlug').value, status: el('newPageStatus').value }) });
  if (res) { toast('Page created!', 'success'); closeModal(); loadPages(); }
};

window.deletePage = async function(id, title) {
  if (!confirm(`Delete "${title}"?`)) return;
  const res = await apiFetch(`/api/pages/${id}`, { method: 'DELETE' });
  if (res) { toast('Page deleted', 'success'); loadPages(); }
};

/* ── MEDIA ────────────────────────────────────────────────────── */
async function loadMedia() {
  el('pageContent').innerHTML = `<div style="color:var(--text-muted);display:flex;align-items:center;gap:0.5rem"><div class="loading-spinner"></div>Loading…</div>`;
  const data = await apiFetch('/api/media');
  if (!data) return;

  const fileEmoji = mime => {
    if (mime?.includes('image')) return '🖼️';
    if (mime?.includes('pdf')) return '📄';
    if (mime?.includes('video')) return '🎬';
    if (mime?.includes('audio')) return '🎵';
    if (mime?.includes('zip')) return '🗜️';
    return '📁';
  };

  el('pageContent').innerHTML = `
    <div class="page-header">
      <h2>Media Library</h2>
      <span style="font-size:0.8rem;color:var(--text-muted)">${data.media.length} files</span>
    </div>
    <div class="card" style="margin-bottom:1.5rem">
      <div class="upload-zone" id="uploadZone">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <p>Drop files here or <strong style="color:var(--accent)">click to upload</strong></p>
        <span>Max 10MB per file • Images, PDFs, ZIP, Video, Audio</span>
        <input type="file" id="fileInput" style="display:none" multiple />
      </div>
    </div>
    <div class="media-grid" id="mediaGrid">
      ${data.media.length === 0 ? '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:2rem">No files yet.</p>' :
        data.media.map(f => `
          <div class="media-item">
            <div class="media-thumb">${fileEmoji(f.mime_type)}</div>
            <div class="media-info">
              <div class="media-name" title="${f.original_name}">${f.original_name}</div>
              <div class="media-size">${fmt(f.size || 0)}</div>
            </div>
            <button class="media-delete" onclick="deleteMedia(${f.id}, event)" title="Delete">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>`).join('')}
    </div>`;

  const zone = el('uploadZone');
  const fileInput = el('fileInput');

  zone.addEventListener('click', () => fileInput.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));
}

async function handleFiles(files) {
  for (const file of files) {
    const fd = new FormData();
    fd.append('file', file);
    toast(`Uploading ${file.name}…`, 'info', 2000);
    const res = await apiFetch('/api/upload', { method: 'POST', body: fd });
    if (res) toast(`${file.name} uploaded!`, 'success');
  }
  loadMedia();
}

window.deleteMedia = async function(id, e) {
  e.stopPropagation();
  if (!confirm('Delete this file?')) return;
  const res = await apiFetch(`/api/media/${id}`, { method: 'DELETE' });
  if (res) { toast('File deleted', 'success'); loadMedia(); }
};

/* ── USERS ────────────────────────────────────────────────────── */
async function loadUsers() {
  el('pageContent').innerHTML = `<div style="color:var(--text-muted);display:flex;align-items:center;gap:0.5rem"><div class="loading-spinner"></div>Loading…</div>`;
  const data = await apiFetch('/api/users');
  if (!data) return;

  el('pageContent').innerHTML = `
    <div class="page-header">
      <h2>Users</h2>
      <button class="btn-primary" onclick="showAddUserModal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add User
      </button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
          <tbody>
            ${data.users.map(u => `
              <tr>
                <td><div style="display:flex;align-items:center;gap:0.625rem"><div class="user-avatar sm">${initials(u.name)}</div>${u.name}</div></td>
                <td style="font-family:var(--font-mono);font-size:0.78rem">${u.email}</td>
                <td><span class="badge badge-${u.role === 'admin' ? 'blue' : u.role === 'editor' ? 'green' : 'gray'}">${u.role}</span></td>
                <td><span class="badge badge-${u.active ? 'green' : 'red'}">${u.active ? 'Active' : 'Inactive'}</span></td>
                <td>${u.last_login ? timeAgo(u.last_login) : 'Never'}</td>
                <td style="display:flex;gap:0.375rem">
                  <button class="btn-secondary" onclick="showEditUserModal(${JSON.stringify(u).replace(/"/g,'&quot;')})">Edit</button>
                  ${u.id !== currentUser?.id ? `<button class="btn-danger" onclick="deleteUser(${u.id},'${u.name.replace(/'/g,"\\'")}')">Delete</button>` : ''}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

window.showAddUserModal = function() {
  openModal('Add New User', `
    <div class="form-row">
      <div class="form-field"><label>Full Name</label><input id="uName" placeholder="John Doe"/></div>
      <div class="form-field"><label>Email</label><input id="uEmail" type="email" placeholder="john@example.com"/></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>Password</label><input id="uPass" type="password" placeholder="Minimum 6 characters"/></div>
      <div class="form-field"><label>Role</label><select id="uRole"><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option></select></div>
    </div>
    <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.25rem">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="addUser()">Create User</button>
    </div>`);
};

window.addUser = async function() {
  const res = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify({ name: el('uName').value, email: el('uEmail').value, password: el('uPass').value, role: el('uRole').value }) });
  if (res) { toast('User created!', 'success'); closeModal(); loadUsers(); }
};

window.showEditUserModal = function(u) {
  const user = typeof u === 'string' ? JSON.parse(u) : u;
  openModal(`Edit: ${user.name}`, `
    <div class="form-row">
      <div class="form-field"><label>Full Name</label><input id="euName" value="${user.name}"/></div>
      <div class="form-field"><label>Email</label><input id="euEmail" type="email" value="${user.email}"/></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label>New Password <span style="color:var(--text-muted)">(leave blank to keep)</span></label><input id="euPass" type="password" placeholder="••••••••"/></div>
      <div class="form-field"><label>Role</label><select id="euRole"><option value="viewer" ${user.role==='viewer'?'selected':''}>Viewer</option><option value="editor" ${user.role==='editor'?'selected':''}>Editor</option><option value="admin" ${user.role==='admin'?'selected':''}>Admin</option></select></div>
    </div>
    <div class="form-field"><label>Status</label><select id="euActive"><option value="1" ${user.active?'selected':''}>Active</option><option value="0" ${!user.active?'selected':''}>Inactive</option></select></div>
    <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.25rem">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="updateUser(${user.id})">Save Changes</button>
    </div>`);
};

window.updateUser = async function(id) {
  const body = { name: el('euName').value, email: el('euEmail').value, role: el('euRole').value, active: el('euActive').value === '1' };
  const pass = el('euPass').value;
  if (pass) body.password = pass;
  const res = await apiFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  if (res) { toast('User updated!', 'success'); closeModal(); loadUsers(); }
};

window.deleteUser = async function(id, name) {
  if (!confirm(`Delete user "${name}"?`)) return;
  const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
  if (res) { toast('User deleted', 'success'); loadUsers(); }
};

/* ── PLUGINS ──────────────────────────────────────────────────── */
async function loadPlugins() {
  el('pageContent').innerHTML = `<div style="color:var(--text-muted);display:flex;align-items:center;gap:0.5rem"><div class="loading-spinner"></div>Loading…</div>`;
  const data = await apiFetch('/api/plugins');
  if (!data) return;

  const icons = ['🔧','📊','🎨','📝','🔒','⚡','🌐','🗂️','🔔','📦'];
  const colors = ['var(--accent-glow)','var(--green-glow)','rgba(139,92,246,0.12)','var(--amber-glow)','rgba(239,68,68,0.1)','rgba(20,184,166,0.12)'];

  el('pageContent').innerHTML = `
    <div class="page-header">
      <h2>Plugins <span class="badge badge-blue" style="font-size:0.8rem;margin-left:0.5rem">${data.plugins.filter(p=>p.enabled).length} active</span></h2>
      <button class="btn-primary" onclick="showAddPluginModal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Plugin
      </button>
    </div>
    <div class="plugins-grid">
      ${data.plugins.map((p, i) => `
        <div class="plugin-card" id="plugin-${p.slug}">
          <div class="plugin-header">
            <div class="plugin-icon" style="background:${colors[i % colors.length]}">${icons[i % icons.length]}</div>
            <div class="plugin-meta">
              <div class="plugin-name">${p.name}</div>
              <div class="plugin-version">v${p.version}</div>
            </div>
            <span class="badge badge-${p.enabled ? 'green' : 'gray'}">${p.enabled ? 'Active' : 'Inactive'}</span>
          </div>
          <div class="plugin-desc">${p.description || 'No description available.'}</div>
          <div class="plugin-footer">
            <span class="plugin-author">by ${p.author || 'Unknown'}</span>
            <div class="plugin-actions">
              <label class="toggle" title="${p.enabled ? 'Disable' : 'Enable'}">
                <input type="checkbox" ${p.enabled ? 'checked' : ''} onchange="togglePlugin('${p.slug}', this)">
                <span class="toggle-slider"></span>
              </label>
              <button class="btn-icon" title="Remove" onclick="removePlugin('${p.slug}','${p.name.replace(/'/g,"\\'")}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}

window.togglePlugin = async function(slug, checkbox) {
  const res = await apiFetch(`/api/plugins/${slug}/toggle`, { method: 'PATCH' });
  if (res) {
    toast(`Plugin ${res.enabled ? 'enabled' : 'disabled'}`, 'success');
    const badge = q(`#plugin-${slug} .badge`);
    if (badge) { badge.className = `badge badge-${res.enabled ? 'green' : 'gray'}`; badge.textContent = res.enabled ? 'Active' : 'Inactive'; }
    const badge2 = el('pluginBadge');
    if (badge2) { const data2 = await apiFetch('/api/plugins'); if (data2) badge2.textContent = data2.plugins.filter(p=>p.enabled).length; }
  } else {
    checkbox.checked = !checkbox.checked;
  }
};

window.showAddPluginModal = function() {
  openModal('Add Plugin', `
    <div class="form-field"><label>Plugin Name *</label><input id="pName" placeholder="My Awesome Plugin"/></div>
    <div class="form-field"><label>Description</label><textarea id="pDesc" rows="3" placeholder="What does this plugin do?"></textarea></div>
    <div class="form-row">
      <div class="form-field"><label>Author</label><input id="pAuthor" placeholder="Author name"/></div>
      <div class="form-field"><label>Version</label><input id="pVer" placeholder="1.0.0" value="1.0.0"/></div>
    </div>
    <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.25rem">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="addPlugin()">Add Plugin</button>
    </div>`);
};

window.addPlugin = async function() {
  const res = await apiFetch('/api/plugins', { method: 'POST', body: JSON.stringify({ name: el('pName').value, description: el('pDesc').value, author: el('pAuthor').value, version: el('pVer').value }) });
  if (res) { toast('Plugin added!', 'success'); closeModal(); loadPlugins(); }
};

window.removePlugin = async function(slug, name) {
  if (!confirm(`Remove plugin "${name}"? This cannot be undone.`)) return;
  const res = await apiFetch(`/api/plugins/${slug}`, { method: 'DELETE' });
  if (res) { toast('Plugin removed', 'success'); loadPlugins(); }
};

/* ── SEO ──────────────────────────────────────────────────────── */
async function loadSEO() {
  const data = await apiFetch('/api/settings');
  if (!data) return;
  const s = data.settings;

  el('pageContent').innerHTML = `
    <div class="page-header"><h2>SEO Settings</h2><button class="btn-primary" onclick="saveSEO()">Save Changes</button></div>
    <div class="seo-grid">
      <div>
        <div class="card" style="margin-bottom:1rem">
          <div class="card-title" style="margin-bottom:1rem">Metadata</div>
          <div class="form-field"><label>SEO Title</label><input id="seoTitle" value="${s.seo_title||''}" oninput="updateGooglePreview()"/></div>
          <div class="form-field"><label>Meta Description</label><textarea id="seoDesc" rows="3" oninput="updateGooglePreview()">${s.seo_description||''}</textarea><div class="form-hint" id="seoDescCount">${(s.seo_description||'').length}/160 characters</div></div>
          <div class="form-field"><label>Keywords</label><input id="seoKeywords" value="${s.seo_keywords||''}"/></div>
          <div class="form-field"><label>Site URL (canonical)</label><input id="seoUrl" value="${s.site_url||''}" oninput="updateGooglePreview()"/></div>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:1rem">Open Graph</div>
          <div class="form-field"><label>OG Title</label><input id="ogTitle" value="${s.og_title||''}" oninput="updateOGPreview()"/></div>
          <div class="form-field"><label>OG Description</label><textarea id="ogDesc" rows="3" oninput="updateOGPreview()">${s.og_description||''}</textarea></div>
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:1rem">
          <div class="card-title" style="margin-bottom:0.875rem">Google Preview</div>
          <div class="google-preview">
            <div class="gp-url" id="gpUrl">${(s.site_url||'').replace(/^https?:\/\//,'')}</div>
            <div class="gp-title" id="gpTitle">${s.seo_title||'Page Title'}</div>
            <div class="gp-desc" id="gpDesc">${s.seo_description||'Page description will appear here.'}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:0.875rem">Social Preview</div>
          <div class="og-preview">
            <div class="og-image">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <div class="og-content">
              <div class="og-site" id="ogSite">${(s.site_url||'').replace(/^https?:\/\//,'').split('/')[0]}</div>
              <div class="og-title" id="ogTitlePrev">${s.og_title||''}</div>
              <div class="og-desc" id="ogDescPrev">${s.og_description||''}</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  el('seoDesc').addEventListener('input', function() { el('seoDescCount').textContent = `${this.value.length}/160 characters`; });
}

window.updateGooglePreview = function() {
  el('gpTitle').textContent = el('seoTitle').value || 'Page Title';
  el('gpDesc').textContent = el('seoDesc').value || 'Page description…';
  el('gpUrl').textContent = (el('seoUrl').value || '').replace(/^https?:\/\//, '');
};

window.updateOGPreview = function() {
  el('ogTitlePrev').textContent = el('ogTitle').value;
  el('ogDescPrev').textContent = el('ogDesc').value;
};

window.saveSEO = async function() {
  const res = await apiFetch('/api/settings', { method: 'POST', body: JSON.stringify({
    seo_title: el('seoTitle').value, seo_description: el('seoDesc').value,
    seo_keywords: el('seoKeywords').value, site_url: el('seoUrl').value,
    og_title: el('ogTitle').value, og_description: el('ogDesc').value,
  })});
  if (res) toast('SEO settings saved!', 'success');
};

/* ── SETTINGS ─────────────────────────────────────────────────── */
async function loadSettings() {
  const data = await apiFetch('/api/settings');
  if (!data) return;
  const s = data.settings;

  el('pageContent').innerHTML = `
    <div class="page-header"><h2>Settings</h2></div>
    <div class="settings-layout">
      <div class="settings-tabs">
        <button class="tab-btn active" onclick="switchTab('general',this)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
          General
        </button>
        <button class="tab-btn" onclick="switchTab('performance',this)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Performance
        </button>
        <button class="tab-btn" onclick="switchTab('security',this)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Security
        </button>
      </div>
      <div>
        <!-- GENERAL TAB -->
        <div class="settings-section active" id="tab-general">
          <div class="card">
            <div class="settings-group">
              <h4>Site Identity</h4>
              <div class="form-field"><label>Site Title</label><input id="cfgSiteName" value="${s.site_name||''}"/></div>
              <div class="form-field"><label>Tagline</label><input id="cfgTagline" value="${s.tagline||''}"/><div class="form-hint">A short description shown in browser tabs and search results.</div></div>
              <div class="form-field"><label>Site URL</label><input id="cfgSiteUrl" value="${s.site_url||''}"/></div>
              <div class="form-field"><label>Admin Email</label><input type="email" id="cfgEmail" value="${s.admin_email||''}"/></div>
            </div>
            <div class="settings-group">
              <h4>Localization</h4>
              <div class="form-row">
                <div class="form-field"><label>Timezone</label>
                  <select id="cfgTimezone">
                    ${['Europe/Amsterdam','Europe/London','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Asia/Tokyo','UTC'].map(tz => `<option ${s.timezone===tz?'selected':''}>${tz}</option>`).join('')}
                  </select>
                </div>
                <div class="form-field"><label>Language</label>
                  <select id="cfgLang">
                    <option value="en" ${s.language==='en'?'selected':''}>English (US)</option>
                    <option value="nl" ${s.language==='nl'?'selected':''}>Nederlands</option>
                    <option value="de" ${s.language==='de'?'selected':''}>Deutsch</option>
                    <option value="fr" ${s.language==='fr'?'selected':''}>Français</option>
                  </select>
                </div>
              </div>
            </div>
            <button class="btn-primary" onclick="saveGeneral()">Save Changes</button>
          </div>
        </div>

        <!-- PERFORMANCE TAB -->
        <div class="settings-section" id="tab-performance">
          <div class="card">
            <div class="settings-group">
              <h4>System Toggles</h4>
              <div class="toggle-row">
                <div class="toggle-info"><h5>Maintenance Mode</h5><p>Take the site offline for visitors while you work.</p></div>
                <label class="toggle"><input type="checkbox" id="cfgMaintenance" ${s.maintenance_mode==='1'?'checked':''}><span class="toggle-slider"></span></label>
              </div>
              <div class="toggle-row">
                <div class="toggle-info"><h5>Debug Mode</h5><p>Show detailed error messages (disable in production).</p></div>
                <label class="toggle"><input type="checkbox" id="cfgDebug" ${s.debug_mode==='1'?'checked':''}><span class="toggle-slider"></span></label>
              </div>
              <div class="toggle-row">
                <div class="toggle-info"><h5>Analytics</h5><p>Enable built-in analytics tracking.</p></div>
                <label class="toggle"><input type="checkbox" id="cfgAnalytics" ${s.analytics_enabled==='1'?'checked':''}><span class="toggle-slider"></span></label>
              </div>
              <div class="toggle-row">
                <div class="toggle-info"><h5>Open Registration</h5><p>Allow visitors to register new accounts.</p></div>
                <label class="toggle"><input type="checkbox" id="cfgReg" ${s.registration_open==='1'?'checked':''}><span class="toggle-slider"></span></label>
              </div>
            </div>
            <button class="btn-primary" onclick="saveToggles()">Save Toggles</button>
          </div>
        </div>

        <!-- SECURITY TAB -->
        <div class="settings-section" id="tab-security">
          <div class="card">
            <div class="settings-group">
              <h4>System Information</h4>
              <table>
                <thead><tr><th>Component</th><th>Value</th><th>Status</th></tr></thead>
                <tbody>
                  ${[['Node.js', process?.version||'v20.x (LTS)', 'green'],['Express', '4.x', 'green'],['SQLite', 'better-sqlite3 9.x', 'green'],['JWT', 'jsonwebtoken 9.x', 'green'],['Environment', 'Production', 'green']].map(([c,v,b]) =>
                    `<tr><td>${c}</td><td style="font-family:var(--font-mono);font-size:0.78rem">${v}</td><td><span class="badge badge-${b}">✓ OK</span></td></tr>`).join('')}
                </tbody>
              </table>
            </div>
            <div class="settings-group" style="margin-top:1.5rem">
              <h4>Danger Zone</h4>
              <div style="background:var(--red-glow);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius);padding:1rem">
                <p style="font-size:0.83rem;color:var(--text-secondary);margin-bottom:0.75rem">These actions are irreversible. Proceed with caution.</p>
                <button class="btn-danger" onclick="toast('Action blocked in demo mode','error')">Clear All Cache</button>
                <button class="btn-danger" style="margin-left:0.5rem" onclick="toast('Action blocked in demo mode','error')">Reset to Defaults</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

window.switchTab = function(name, btn) {
  document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  el(`tab-${name}`)?.classList.add('active');
  btn.classList.add('active');
};

window.saveGeneral = async function() {
  const res = await apiFetch('/api/settings', { method: 'POST', body: JSON.stringify({
    site_name: el('cfgSiteName').value, tagline: el('cfgTagline').value,
    site_url: el('cfgSiteUrl').value, admin_email: el('cfgEmail').value,
    timezone: el('cfgTimezone').value, language: el('cfgLang').value,
  })});
  if (res) toast('Settings saved!', 'success');
};

window.saveToggles = async function() {
  const res = await apiFetch('/api/settings', { method: 'POST', body: JSON.stringify({
    maintenance_mode: el('cfgMaintenance').checked ? '1' : '0',
    debug_mode: el('cfgDebug').checked ? '1' : '0',
    analytics_enabled: el('cfgAnalytics').checked ? '1' : '0',
    registration_open: el('cfgReg').checked ? '1' : '0',
  })});
  if (res) toast('Toggles updated!', 'success');
};

/* ── INIT APP ─────────────────────────────────────────────────── */
function initApp() {
  if (!currentUser) { currentUser = JSON.parse(localStorage.getItem('ap_user') || 'null'); }
  if (!authToken || !currentUser) { show('loginScreen'); hide('app'); return; }

  // Update UI with user info
  const avatarText = initials(currentUser.name);
  el('sidebarAvatar').textContent = avatarText;
  el('topbarAvatar').textContent = avatarText;
  el('sidebarName').textContent = currentUser.name;
  el('sidebarRole').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
  el('topbarName').textContent = currentUser.name;

  // Show/hide admin-only items
  document.querySelectorAll('.admin-only').forEach(el2 => {
    el2.style.display = currentUser.role === 'admin' ? '' : 'none';
  });

  hide('loginScreen');
  show('app');

  // Load initial plugin badge
  apiFetch('/api/plugins').then(d => {
    if (d) el('pluginBadge').textContent = d.plugins.filter(p => p.enabled).length;
  });

  navigateTo('dashboard');
}

/* ── THEME TOGGLE ─────────────────────────────────────────────── */
el('themeToggle').addEventListener('click', function() {
  toast('Light theme coming soon!', 'info', 2000);
});

/* ── BOOT ─────────────────────────────────────────────────────── */
if (authToken) {
  initApp();
} else {
  show('loginScreen');
}
