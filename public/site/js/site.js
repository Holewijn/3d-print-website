/* MHStudio Public Site JS */

// ── Helpers ───────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${msg}`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.4s'; setTimeout(() => t.remove(), 400); }, 4000);
}

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  return res.json();
}

// ── Nav ───────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 20);
});

window.toggleMenu = function() {
  document.getElementById('navLinks').classList.toggle('open');
};

window.scrollTo = function(id) {
  document.getElementById('navLinks').classList.remove('open');
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ── Load services ─────────────────────────────────────────────────
async function loadServices() {
  try {
    const data = await api('/public/services');
    const grid = document.getElementById('servicesGrid');
    if (!data.services || data.services.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center">No services found.</p>';
      return;
    }
    grid.innerHTML = data.services.map(s => `
      <div class="service-card">
        <div class="service-icon">${s.icon || '🔧'}</div>
        <div class="service-title">${s.title}</div>
        <div class="service-desc">${s.description || ''}</div>
        ${s.price_from ? `<div class="service-price">From €${parseFloat(s.price_from).toFixed(2)}</div>` : ''}
      </div>
    `).join('');
  } catch (e) {
    console.error('Failed to load services', e);
  }
}

// ── Load products ─────────────────────────────────────────────────
let allProducts = [];

async function loadProducts() {
  try {
    const data = await api('/public/products');
    allProducts = data.products || [];
    renderProducts(allProducts);
  } catch (e) {
    console.error('Failed to load products', e);
  }
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  if (!products.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:2rem">No products available.</p>';
    return;
  }
  grid.innerHTML = products.map(p => `
    <div class="product-card" data-category="${p.category}">
      <div class="product-img">${categoryEmoji(p.category)}</div>
      <div class="product-body">
        <div class="product-category">${p.category}</div>
        ${p.featured ? '<span class="product-badge">⭐ Featured</span>' : ''}
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description || ''}</div>
        <div class="product-footer">
          <div class="product-price">€${parseFloat(p.price).toFixed(2)} <span>excl. shipping</span></div>
          <button class="btn-add" onclick="orderProduct('${p.name}')">Order</button>
        </div>
      </div>
    </div>
  `).join('');
}

function categoryEmoji(cat) {
  const map = { prints: '🖨️', services: '✏️', general: '📦' };
  return map[cat] || '📦';
}

window.filterProducts = function(category, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = category === 'all' ? allProducts : allProducts.filter(p => p.category === category);
  renderProducts(filtered);
};

window.orderProduct = function(name) {
  // Pre-fill the quote form and scroll to it
  const notesField = document.querySelector('#quoteForm textarea[name="notes"]');
  if (notesField) notesField.value = `I would like to order: ${name}`;
  window.scrollTo('quote');
  toast(`Redirected to quote form for: ${name}`);
};

// ── File upload ───────────────────────────────────────────────────
window.fileSelected = function(input) {
  const file = input.files[0];
  const drop = document.getElementById('fileDrop');
  const text = document.getElementById('fileDropText');
  if (file) {
    drop.classList.add('has-file');
    text.innerHTML = `<strong>✓ ${file.name}</strong> (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
  }
};

// Drag and drop
const fileDrop = document.getElementById('fileDrop');
if (fileDrop) {
  fileDrop.addEventListener('dragover', e => { e.preventDefault(); fileDrop.style.borderColor = '#2563eb'; });
  fileDrop.addEventListener('dragleave', () => { fileDrop.style.borderColor = ''; });
  fileDrop.addEventListener('drop', e => {
    e.preventDefault();
    fileDrop.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file) {
      document.getElementById('stlFile').files = e.dataTransfer.files;
      window.fileSelected(document.getElementById('stlFile'));
    }
  });
}

// ── Submit quote ──────────────────────────────────────────────────
window.submitQuote = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('quoteSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>Sending...</span>';

  const form = document.getElementById('quoteForm');
  const formData = new FormData(form);

  try {
    const res = await fetch('/public/quote', { method: 'POST', body: formData });
    const data = await res.json();

    if (res.ok) {
      toast(data.message || 'Quote request sent!', 'success');
      form.reset();
      document.getElementById('fileDrop').classList.remove('has-file');
      document.getElementById('fileDropText').innerHTML = 'Drop your file here or <strong>click to browse</strong>';
    } else {
      toast(data.error || 'Something went wrong', 'error');
    }
  } catch (err) {
    toast('Failed to send — please try again', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<span>Send Quote Request</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
};

// ── Submit contact ────────────────────────────────────────────────
window.submitContact = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('contactSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>Sending...</span>';

  const form = document.getElementById('contactForm');
  const body = Object.fromEntries(new FormData(form));

  try {
    const res = await fetch('/public/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (res.ok) {
      toast(data.message || 'Message sent!', 'success');
      form.reset();
    } else {
      toast(data.error || 'Something went wrong', 'error');
    }
  } catch (err) {
    toast('Failed to send — please try again', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<span>Send Message</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
};

// ── Boot ──────────────────────────────────────────────────────────
loadServices();
loadProducts();
