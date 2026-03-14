/* ── ui.js — CoreInventory shared enhancement utilities ── */

/* ═══════════════════════════════════════════
   1. THEME (dark / light)
═══════════════════════════════════════════ */
const CI_THEME_KEY = 'ci-theme';

function ciInitTheme() {
  const saved = localStorage.getItem(CI_THEME_KEY) || 'light';
  document.body.classList.toggle('dark', saved === 'dark');
  _updateThemeBtn(saved);
}

function ciToggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  const next = isDark ? 'dark' : 'light';
  localStorage.setItem(CI_THEME_KEY, next);
  _updateThemeBtn(next);
}

function _updateThemeBtn(theme) {
  const btn = document.getElementById('ci-theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

/* inject toggle button once DOM is ready */
function ciMountThemeToggle() {
  if (document.getElementById('ci-theme-toggle')) return;
  const btn = document.createElement('button');
  btn.id = 'ci-theme-toggle';
  btn.title = 'Toggle dark / light mode';
  btn.addEventListener('click', ciToggleTheme);
  document.body.appendChild(btn);
}

/* ═══════════════════════════════════════════
   2. TOAST NOTIFICATIONS
═══════════════════════════════════════════ */
let _toastContainer = null;

function _ensureToasts() {
  if (_toastContainer) return _toastContainer;
  _toastContainer = document.createElement('div');
  _toastContainer.id = 'ci-toasts';
  document.body.appendChild(_toastContainer);
  return _toastContainer;
}

/**
 * showToast(message, type)
 * type: 'success' | 'error' | 'info' | 'warning'
 */
function showToast(message, type = 'info', duration = 3500) {
  const container = _ensureToasts();

  const icons = { success: '✔', error: '✖', info: 'ℹ', warning: '⚠' };

  const el = document.createElement('div');
  el.className = `ci-toast ci-toast-${type}`;
  el.innerHTML = `<span class="ci-toast-icon">${icons[type] || 'ℹ'}</span>
                  <span>${message}</span>`;

  el.addEventListener('click', () => _dismissToast(el));
  container.appendChild(el);

  setTimeout(() => _dismissToast(el), duration);
}

function _dismissToast(el) {
  el.classList.add('out');
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

/* ═══════════════════════════════════════════
   3. ANIMATED KPI COUNTER
   ciAnimateCounter(element, targetValue, durationMs)
═══════════════════════════════════════════ */
function ciAnimateCounter(el, target, duration = 900) {
  if (!el) return;
  const start = performance.now();
  const from  = 0;

  function step(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + eased * (target - from));
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }

  requestAnimationFrame(step);
}

/* ═══════════════════════════════════════════
   4. TABLE ROW SLIDE-IN ANIMATIONS
   ciAnimateRows(tableOrSelector, delayStep)
═══════════════════════════════════════════ */
function ciAnimateRows(tableOrSelector = 'table', delayStep = 40) {
  const el = typeof tableOrSelector === 'string'
    ? document.querySelector(tableOrSelector)
    : tableOrSelector;
  if (!el) return;

  const rows = el.querySelectorAll('tbody tr');
  rows.forEach((row, i) => {
    row.classList.add('ci-row-anim');
    row.style.animationDelay = `${i * delayStep}ms`;
    row.style.animationFillMode = 'both';
  });
}

/* ═══════════════════════════════════════════
   5. PAGE FADE-IN
═══════════════════════════════════════════ */
function ciPageFadeIn() {
  document.body.classList.add('ci-page');
}

/* ═══════════════════════════════════════════
   6. SIDEBAR BUILDER
   ciMountSidebar(activeLink)
   activeLink: 'dashboard'|'stock'|'receipts'|'deliveries'|'history'|'settings'
═══════════════════════════════════════════ */
function ciMountSidebar(activeLink) {
  /* remove legacy top navbar if present */
  const old = document.querySelector('.navbar, nav.navbar, header.navbar');
  if (old) old.remove();

  /* remove old main margin */
  const mainEl = document.querySelector('.main-content, main, .content');
  if (mainEl) mainEl.classList.add('ci-main');

  const userName = localStorage.getItem('user_name') || 'Admin';
  const initial  = userName.charAt(0).toUpperCase();

  const nav = [
    { id: 'dashboard', icon: '▣',  label: 'Dashboard',    href: '/pages/dashboard.html' },
    {
      id: 'operations', icon: '⇄', label: 'Operations', children: [
        { label: 'Receipts',   href: '/pages/receipts.html'   },
        { label: 'Deliveries', href: '/pages/deliveries.html' },
      ]
    },
    { id: 'stock',    icon: '☰',  label: 'Stock',         href: '/pages/stock.html'     },
    { id: 'history',  icon: '⟳',  label: 'Move History',  href: '/pages/history.html'   },
    {
      id: 'settings', icon: '⚙', label: 'Settings', children: [
        { label: 'Warehouse', href: '/pages/warehouse.html' },
        { label: 'Locations', href: '/pages/locations.html' },
      ]
    },
  ];

  const liHtml = nav.map(item => {
    const isActive = item.id === activeLink ||
      (item.children && item.children.some(c => location.pathname.includes(c.href)));
    const openClass = isActive && item.children ? ' open' : '';
    const activeClass = isActive ? ' active' : '';

    if (item.children) {
      const subItems = item.children.map(c =>
        `<li><a href="${c.href}">${c.label}</a></li>`
      ).join('');
      return `
        <li class="has-sub${activeClass}${openClass}">
          <button class="ci-nav-btn" onclick="ciToggleSub(this)">
            <span class="ci-icon">${item.icon}</span>
            ${item.label}
            <span class="ci-caret">▶</span>
          </button>
          <ul class="ci-subnav${openClass ? ' open' : ''}">${subItems}</ul>
        </li>`;
    }
    return `
      <li class="${activeClass}">
        <a href="${item.href}">
          <span class="ci-icon">${item.icon}</span>
          ${item.label}
        </a>
      </li>`;
  }).join('');

  const sidebar = document.createElement('aside');
  sidebar.className = 'ci-sidebar';
  sidebar.id = 'ci-sidebar';
  sidebar.innerHTML = `
    <div class="ci-brand">
      <h2>CoreInventory</h2>
      <p>Inventory Management</p>
    </div>
    <ul class="ci-nav">${liHtml}</ul>
    <div class="ci-sidebar-footer">
      <div class="ci-avatar-sm">${initial}</div>
      <div class="ci-user-info">
        <strong>${userName}</strong>
        <span>Inventory Staff</span>
      </div>
      <button onclick="ciLogout()" title="Logout"
        style="margin-left:auto;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;" >⏻</button>
    </div>`;

  /* overlay + hamburger for mobile */
  const overlay = document.createElement('div');
  overlay.className = 'ci-overlay';
  overlay.id = 'ci-overlay';
  overlay.addEventListener('click', _closeSidebar);

  const ham = document.createElement('button');
  ham.className = 'ci-hamburger';
  ham.innerHTML = '☰';
  ham.id = 'ci-hamburger';
  ham.addEventListener('click', _openSidebar);

  document.body.prepend(overlay, ham, sidebar);
}

function ciToggleSub(btn) {
  const li = btn.closest('li');
  li.classList.toggle('open');
  const sub = li.querySelector('.ci-subnav');
  if (sub) sub.classList.toggle('open');
}

function _openSidebar() {
  document.getElementById('ci-sidebar').classList.add('open');
  document.getElementById('ci-overlay').classList.add('show');
}
function _closeSidebar() {
  document.getElementById('ci-sidebar').classList.remove('open');
  document.getElementById('ci-overlay').classList.remove('show');
}

function ciLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user_name');
  location.href = '/index.html';
}

/* ═══════════════════════════════════════════
   7. INIT HELPER — call once per page
   ciInit(activeLink)
═══════════════════════════════════════════ */
function ciInit(activeLink) {
  ciInitTheme();
  ciMountThemeToggle();
  ciPageFadeIn();
  ciMountSidebar(activeLink);
}

/* ═══════════════════════════════════════════
   8. FUN INTERACTIVE LAYER
═══════════════════════════════════════════ */
const CI_FUN_EMOJIS = ['✨', '💚', '🚀', '😊', '📦'];

function ciBurstEmoji(x, y, emoji = '✨') {
  const node = document.createElement('span');
  node.className = 'ci-emoji-burst';
  node.textContent = emoji;
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  document.body.appendChild(node);
  node.addEventListener('animationend', () => node.remove(), { once: true });
}

function ciEnhanceInteractiveElements() {
  const selector = 'button, a, .btn, .btn-primary, .btn-outline, .icon-btn, .new-btn, .tab-btn, .kpi-card';
  document.querySelectorAll(selector).forEach((el, index) => {
    if (el.dataset.ciFunBound === '1') return;
    el.dataset.ciFunBound = '1';
    el.classList.add('ci-fun-target');

    el.addEventListener('click', (event) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX || (rect.left + rect.width / 2);
      const y = event.clientY || (rect.top + rect.height / 2);
      ciBurstEmoji(x, y, CI_FUN_EMOJIS[index % CI_FUN_EMOJIS.length]);
    });
  });
}

function ciMountFloatingEmojis() {
  if (document.querySelector('.ci-floating-emoji')) return;
  const one = document.createElement('div');
  one.className = 'ci-floating-emoji one';
  one.textContent = '✨';
  const two = document.createElement('div');
  two.className = 'ci-floating-emoji two';
  two.textContent = '💚';
  document.body.append(one, two);
}

function ciMountInteractiveWidget() {
  if (document.getElementById('ci-fun-widget')) return;

  const pageName = (document.title || 'CoreInventory').replace('CoreInventory — ', '');
  const widget = document.createElement('div');
  widget.className = 'ci-fun-widget';
  widget.id = 'ci-fun-widget';
  widget.innerHTML = `
    <div class="ci-fun-panel">
      <div class="ci-fun-header">
        <div class="ci-fun-gif" aria-hidden="true">📦✨</div>
        <div>
          <div class="ci-fun-title">Interactive mode</div>
          <div class="ci-fun-subtitle">${pageName} now feels more playful and dynamic 😊</div>
        </div>
      </div>
      <div class="ci-fun-pills">
        <span class="ci-fun-pill">💚 Soft colors</span>
        <span class="ci-fun-pill">✨ Hover motion</span>
        <span class="ci-fun-pill">🚀 Click feedback</span>
      </div>
      <div class="ci-fun-actions">
        <button type="button" data-tip="Try hovering cards and tables for motion ✨">Tip</button>
        <button type="button" data-tip="Use search and quick actions for faster flow 🚀">Guide</button>
      </div>
    </div>
    <button class="ci-fun-toggle" type="button" aria-label="Open interactive helper">😊</button>
  `;

  const toggle = widget.querySelector('.ci-fun-toggle');
  toggle.addEventListener('click', () => {
    widget.classList.toggle('open');
    ciBurstEmoji(window.innerWidth - 50, window.innerHeight - 70, widget.classList.contains('open') ? '💚' : '✨');
  });

  widget.querySelectorAll('[data-tip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      showToast(btn.dataset.tip, 'success', 2600);
    });
  });

  document.body.appendChild(widget);
}

function ciAutoMountInteractiveUI() {
  ciEnhanceInteractiveElements();
  ciMountFloatingEmojis();
  ciMountInteractiveWidget();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ciAutoMountInteractiveUI);
} else {
  ciAutoMountInteractiveUI();
}
