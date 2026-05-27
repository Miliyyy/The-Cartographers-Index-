/**
 * 6b6t Mapart Archive — Main JavaScript
 * Gallery engine, upload system, modal viewer, search/filter, animations
 */

// ── State ────────────────────────────────────────────────────────────────────
const STATE = {
  maparts: [],
  filtered: [],
  currentSort: 'newest',
  currentFilter: 'all',
  searchQuery: '',
  currentModal: null,
  currentPage: 'home',
  viewCounts: JSON.parse(localStorage.getItem('6b6t_views') || '{}'),
};

// ── Data Layer ────────────────────────────────────────────────────────────────

/**
 * Load maparts from data/maparts.json.
 * If running locally (file://) we fall back to embedded demo data so it
 * still works without a web server.
 */
async function loadMaparts() {
  try {
    const res = await fetch('data/maparts.json');
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    STATE.maparts = data.maparts || [];
  } catch {
    // Fallback: use any data already stored in localStorage (from uploads)
    const saved = localStorage.getItem('6b6t_maparts');
    STATE.maparts = saved ? JSON.parse(saved) : [];
  }
  // Merge with any locally-uploaded maparts stored in localStorage
  const local = JSON.parse(localStorage.getItem('6b6t_local_maparts') || '[]');
  STATE.maparts = [...STATE.maparts, ...local];
}

/**
 * Persist a newly-uploaded mapart to localStorage so it survives page reload.
 */
function saveLocalMapart(entry) {
  const local = JSON.parse(localStorage.getItem('6b6t_local_maparts') || '[]');
  local.unshift(entry);
  localStorage.setItem('6b6t_local_maparts', JSON.stringify(local));
}

// ── Filtering & Sorting ───────────────────────────────────────────────────────

function applyFilters() {
  let list = [...STATE.maparts];

  // Search
  if (STATE.searchQuery) {
    const q = STATE.searchQuery.toLowerCase();
    list = list.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.creator.toLowerCase().includes(q) ||
      (m.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (m.description || '').toLowerCase().includes(q)
    );
  }

  // Filter chips
  if (STATE.currentFilter === 'featured') {
    list = list.filter(m => m.featured);
  } else if (STATE.currentFilter === 'large') {
    list = list.filter(m => m.width * m.height >= 64);
  } else if (STATE.currentFilter === 'small') {
    list = list.filter(m => m.width * m.height < 36);
  }

  // Creator dropdown
  const creatorSelect = document.getElementById('filter-creator');
  if (creatorSelect && creatorSelect.value) {
    list = list.filter(m => m.creator === creatorSelect.value);
  }

  // Sort
  switch (STATE.currentSort) {
    case 'newest':
      list.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      break;
    case 'oldest':
      list.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
      break;
    case 'biggest':
      list.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      break;
    case 'popular':
      list.sort((a, b) => (STATE.viewCounts[b.id] || b.views || 0) - (STATE.viewCounts[a.id] || a.views || 0));
      break;
  }

  STATE.filtered = list;
  renderGallery();
}

// ── Gallery Renderer ──────────────────────────────────────────────────────────

/**
 * Scale card visual size based on mapart map dimensions.
 * Larger pieces occupy more columns by injecting a width style.
 * In a CSS masonry layout the image's natural aspect ratio handles height.
 */
function getCardScaleStyle(width, height) {
  const area = width * height;
  // Roughly: <36 = small, 36-80 = medium, 81-120 = large, >120 = xl
  if (area > 120) return 'card--xl';
  if (area > 80)  return 'card--large';
  if (area > 36)  return 'card--medium';
  return 'card--small';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

function renderCard(m, delay = 0) {
  const area   = m.width * m.height;
  const sizeClass = getCardScaleStyle(m.width, m.height);
  const views  = STATE.viewCounts[m.id] || m.views || 0;
  const tags   = (m.tags || []).slice(0, 3).map(t => `<span class="tag">#${t}</span>`).join('');

  return `
    <div class="mapart-card ${sizeClass}"
         style="animation-delay:${delay}ms"
         data-id="${m.id}"
         role="button"
         tabindex="0"
         aria-label="View ${m.title}">

      <!-- Image -->
      <div class="card-image-wrap">
        <img
          src="${m.image}"
          alt="${m.title}"
          loading="lazy"
          onerror="this.src='images/placeholder.png'"
        />
        <div class="card-overlay"></div>

        <!-- Quick actions on hover -->
        <div class="card-quick-actions">
          <button class="quick-btn" title="Download" onclick="event.stopPropagation();downloadMapart('${m.id}')">⬇</button>
          <button class="quick-btn" title="Share"    onclick="event.stopPropagation();shareMapart('${m.id}')">🔗</button>
        </div>

        ${m.featured ? `<div class="card-featured-badge">⭐ Featured</div>` : ''}
      </div>

      <!-- Info -->
      <div class="card-info">
        <div class="card-top">
          <div class="card-title">${m.title}</div>
          <div class="card-size-badge">${m.width}×${m.height}</div>
        </div>

        <div class="card-meta">
          <div class="card-creator">
            <div class="creator-avatar">${getInitial(m.creator)}</div>
            ${m.creator}
          </div>
          <div class="card-date">${formatDate(m.uploadDate)}</div>
        </div>

        ${tags ? `<div class="card-tags">${tags}</div>` : ''}

        <div class="card-stats-row">
          <div class="card-stat">🗺 ${m.totalMaps} maps</div>
          <div class="card-stat">👁 ${views.toLocaleString()}</div>
          <div class="card-stat">📐 ${area} cells</div>
        </div>
      </div>
    </div>
  `;
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  const empty = document.getElementById('gallery-empty');
  if (!grid) return;

  if (STATE.filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = STATE.filtered
    .map((m, i) => renderCard(m, i * 60))
    .join('');

  // Attach click listeners
  grid.querySelectorAll('.mapart-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal(card.dataset.id); });
  });
}

// ── Featured Section ──────────────────────────────────────────────────────────

function renderFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  const featured = STATE.maparts.filter(m => m.featured).slice(0, 4);
  if (!featured.length) {
    grid.closest('.section').style.display = 'none';
    return;
  }
  grid.innerHTML = featured.map((m, i) => renderCard(m, i * 80)).join('');
  grid.querySelectorAll('.mapart-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function updateStats() {
  const totalMaparts = STATE.maparts.length;
  const totalMaps    = STATE.maparts.reduce((s, m) => s + (m.totalMaps || 0), 0);
  const largest      = STATE.maparts.reduce((max, m) => {
    const area = m.width * m.height;
    return area > (max.width || 0) * (max.height || 1) ? m : max;
  }, {});
  const creators     = new Set(STATE.maparts.map(m => m.creator)).size;

  setEl('stat-total',    totalMaparts);
  setEl('stat-maps',     totalMaps.toLocaleString());
  setEl('stat-largest',  largest.id ? `${largest.width}×${largest.height}` : '—');
  setEl('stat-creators', creators);
}

// ── Creator Dropdown ──────────────────────────────────────────────────────────

function populateCreatorDropdown() {
  const sel = document.getElementById('filter-creator');
  if (!sel) return;
  const creators = [...new Set(STATE.maparts.map(m => m.creator))].sort();
  sel.innerHTML = `<option value="">All Creators</option>` +
    creators.map(c => `<option value="${c}">${c}</option>`).join('');
}

// ── Modal / Detail View ───────────────────────────────────────────────────────

function openModal(id) {
  const m = STATE.maparts.find(x => x.id === id);
  if (!m) return;
  STATE.currentModal = m;

  // Increment view count
  STATE.viewCounts[m.id] = (STATE.viewCounts[m.id] || m.views || 0) + 1;
  localStorage.setItem('6b6t_views', JSON.stringify(STATE.viewCounts));

  const area = m.width * m.height;
  const specs = [
    { label: 'Dimensions', value: `${m.width}×${m.height}` },
    { label: 'Total Maps',  value: m.totalMaps },
    { label: 'Resolution',  value: `${m.width * 128}×${m.height * 128}` },
    { label: 'Map Area',    value: `${area} cells` },
  ];

  document.getElementById('modal-image').src  = m.image;
  document.getElementById('modal-image').alt  = m.title;
  document.getElementById('modal-title').textContent = m.title;
  document.getElementById('modal-avatar').textContent = getInitial(m.creator);
  document.getElementById('modal-creator-name').textContent = m.creator;
  document.getElementById('modal-upload-date').textContent  = formatDate(m.uploadDate);
  document.getElementById('modal-description').textContent  = m.description || 'No description provided.';
  document.getElementById('modal-specs').innerHTML = specs.map(s => `
    <div class="spec-item">
      <div class="spec-label">${s.label}</div>
      <div class="spec-value">${s.value}</div>
    </div>`).join('');
  document.getElementById('modal-tags').innerHTML = (m.tags || []).map(t =>
    `<span class="modal-tag">#${t}</span>`).join('');

  document.getElementById('modal-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  document.body.style.overflow = '';
  STATE.currentModal = null;
}

function downloadMapart(id) {
  const m = STATE.maparts.find(x => x.id === (id || STATE.currentModal?.id));
  if (!m) return;
  const a = document.createElement('a');
  a.href = m.image;
  a.download = `${m.title.replace(/\s+/g, '_')}_${m.width}x${m.height}.png`;
  a.click();
  showToast('⬇ Download started!');
}

function shareMapart(id) {
  const m = STATE.maparts.find(x => x.id === (id || STATE.currentModal?.id));
  if (!m) return;
  const url = `${location.href.split('#')[0]}#mapart-${m.id}`;
  navigator.clipboard.writeText(url).then(() => showToast('🔗 Link copied!'));
}

// ── Upload System ─────────────────────────────────────────────────────────────

let uploadedImageData = null;

function initUploadForm() {
  const dropZone   = document.getElementById('drop-zone');
  const fileInput  = document.getElementById('file-input');
  const previewImg = document.getElementById('drop-preview-img');
  const form       = document.getElementById('upload-form');

  if (!dropZone) return;

  // Drag events
  ['dragenter', 'dragover'].forEach(ev => {
    dropZone.addEventListener(ev, e => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
  });
  ['dragleave', 'drop'].forEach(ev => {
    dropZone.addEventListener(ev, () => dropZone.classList.remove('drag-over'));
  });
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleImageFile(file);
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) handleImageFile(file);
  });

  function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = ev => {
      uploadedImageData = ev.target.result;
      previewImg.src = uploadedImageData;
      previewImg.style.display = 'block';
      document.getElementById('drop-text').textContent = file.name;
    };
    reader.readAsDataURL(file);
  }

  // Form submit
  form.addEventListener('submit', e => {
    e.preventDefault();
    submitUpload();
  });
}

function submitUpload() {
  const title    = document.getElementById('input-title').value.trim();
  const dims     = document.getElementById('input-dims').value.trim();
  const creator  = document.getElementById('input-creator').value.trim();
  const desc     = document.getElementById('input-desc').value.trim();
  const tagsRaw  = document.getElementById('input-tags').value.trim();

  if (!title || !dims || !creator) {
    showToast('⚠ Please fill in all required fields.', true);
    return;
  }

  const dimMatch = dims.match(/^(\d+)[x×](\d+)$/i);
  if (!dimMatch) {
    showToast('⚠ Invalid dimensions. Use format: 10x9', true);
    return;
  }

  const width  = parseInt(dimMatch[1], 10);
  const height = parseInt(dimMatch[2], 10);

  if (!uploadedImageData) {
    showToast('⚠ Please select an image.', true);
    return;
  }

  const id    = 'ma_' + Date.now();
  const entry = {
    id,
    title,
    image: uploadedImageData,
    width,
    height,
    creator,
    uploadDate: new Date().toISOString().split('T')[0],
    description: desc,
    tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [],
    totalMaps: width * height,
    views: 0,
    featured: false,
    isLocal: true,
  };

  saveLocalMapart(entry);
  STATE.maparts.unshift(entry);
  updateStats();
  populateCreatorDropdown();
  applyFilters();

  // Reset form
  document.getElementById('upload-form').reset();
  uploadedImageData = null;
  document.getElementById('drop-preview-img').style.display = 'none';
  document.getElementById('drop-text').textContent = 'Drop your PNG here, or click to browse';
  document.getElementById('upload-success').classList.add('show');

  showToast('✅ Mapart added to gallery!');
  setTimeout(() => {
    document.getElementById('upload-success').classList.remove('show');
    navigateTo('gallery');
  }, 2500);
}

// ── Navigation ────────────────────────────────────────────────────────────────

function navigateTo(page) {
  STATE.currentPage = page;

  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');

  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Search & Filter Events ────────────────────────────────────────────────────

function initFilters() {
  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      STATE.searchQuery = searchInput.value;
      applyFilters();
    });
  }

  // Sort
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      STATE.currentSort = sortSelect.value;
      applyFilters();
    });
  }

  // Creator
  const creatorSelect = document.getElementById('filter-creator');
  if (creatorSelect) {
    creatorSelect.addEventListener('change', () => applyFilters());
  }

  // Chips
  document.querySelectorAll('.chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      STATE.currentFilter = chip.dataset.filter;
      applyFilters();
    });
  });
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function initNavbar() {
  window.addEventListener('scroll', () => {
    document.querySelector('.navbar').classList.toggle('scrolled', window.scrollY > 20);
  });

  document.getElementById('mobile-toggle')?.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.toggle('open');
  });
}

// ── Particles ─────────────────────────────────────────────────────────────────

function initParticles() {
  const container = document.querySelector('.hero-particles');
  if (!container) return;
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      animation-duration: ${6 + Math.random() * 10}s;
      animation-delay: ${Math.random() * 8}s;
      --dx: ${(Math.random() - 0.5) * 80}px;
      width: ${2 + Math.random() * 4}px;
      height: ${2 + Math.random() * 4}px;
      opacity: ${0.2 + Math.random() * 0.6};
      ${Math.random() > 0.6 ? 'background: var(--cyan-mc);' : ''}
    `;
    container.appendChild(p);
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.querySelector('.toast-msg').textContent = msg;
  toast.style.borderColor = isError ? 'rgba(255,85,85,0.4)' : 'var(--border-glow)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Counter Animation ─────────────────────────────────────────────────────────

function animateCounter(el, target, duration = 1200) {
  if (!el) return;
  const start = performance.now();
  const isNum = typeof target === 'number';
  const num   = isNum ? target : parseInt(target, 10) || 0;
  const suffix = isNum ? '' : target.toString().replace(/[0-9,]/g, '');

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const cur = Math.floor(ease * num);
    el.textContent = cur.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function animateStats() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.stat-value').forEach(el => {
          const raw = el.dataset.target || el.textContent;
          el.dataset.target = raw;
          const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
          animateCounter(el, num);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.stats-bar').forEach(el => observer.observe(el));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  // Show loader
  const loader = document.getElementById('page-loader');

  await loadMaparts();

  // Initial render
  STATE.filtered = [...STATE.maparts];
  renderGallery();
  renderFeatured();
  updateStats();
  populateCreatorDropdown();

  // Events
  initNavbar();
  initFilters();
  initParticles();
  initUploadForm();

  // Nav links
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(el.dataset.page);
      document.querySelector('.nav-links')?.classList.remove('open');
    });
  });

  // Modal close
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-backdrop')?.addEventListener('click', e => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Modal action buttons
  document.getElementById('modal-download')?.addEventListener('click', () => downloadMapart());
  document.getElementById('modal-share')?.addEventListener('click', () => shareMapart());

  // Stats animation
  animateStats();

  // Hide loader
  setTimeout(() => {
    loader?.classList.add('hidden');
    navigateTo('home');
  }, 1300);
}

document.addEventListener('DOMContentLoaded', init);

// ── Gallery Page Sync ─────────────────────────────────────────────────────────
// The "Gallery" page has its own grid element (#gallery-grid-2).
// We keep it in sync whenever the filtered list updates.
const _origRenderGallery = renderGallery;
window.renderGallery = function() {
  _origRenderGallery();
  const grid2  = document.getElementById('gallery-grid-2');
  const empty2 = document.getElementById('gallery-empty-2');
  if (!grid2) return;

  if (STATE.filtered.length === 0) {
    grid2.innerHTML = '';
    if (empty2) empty2.style.display = 'block';
    return;
  }
  if (empty2) empty2.style.display = 'none';
  grid2.innerHTML = STATE.filtered.map((m, i) => renderCard(m, i * 60)).join('');
  grid2.querySelectorAll('.mapart-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal(card.dataset.id); });
  });
};
