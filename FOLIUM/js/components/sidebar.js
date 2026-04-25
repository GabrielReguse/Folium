/* FOLIUM v5 — components/sidebar.js — only logout */

const Sidebar = {
  _panel: null, _overlay: null, _ready: false,

  init() {
    if (this._ready) return;
    this._ready = true;

    const overlay = document.createElement('div');
    overlay.id = 'sb-overlay';
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', () => Sidebar.close());

    const panel = document.createElement('div');
    panel.id = 'sb-panel';
    panel.className = 'sidebar-panel';

    const user  = Storage.getUser() || {};
    const name  = user.name || user.nome || 'Usuário';
    const email = user.email || '';
    const first = name.trim().charAt(0).toUpperCase();

    panel.innerHTML = `
      <div class="sb-head">
        <div class="sb-head-brand">
          <img src="../assets/images/logo-folium.png" alt="Folium" class="sb-logo">
          <div class="sb-tagline">Seus resumos inteligentes</div>
        </div>
        <button class="sb-close" onclick="Sidebar.close()" aria-label="Fechar">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;stroke:var(--text-mid)">
            <line x1="18" y1="6"  x2="6"  y2="18"/>
            <line x1="6"  y1="6"  x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="sb-user-block">
        <div class="sb-avatar">${first}</div>
        <div>
          <div class="sb-user-name">${name}</div>
          ${email ? `<div class="sb-user-email">${email}</div>` : ''}
        </div>
      </div>
      <div class="sb-body">
        <button class="sb-logout-btn" onclick="Sidebar.close(); Router.logout()">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;stroke:currentColor;flex-shrink:0">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Desconectar conta
        </button>
      </div>
      <div class="sb-footer">Folium · versão beta</div>`;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    this._panel = panel;
    this._overlay = overlay;
  },

  open()   {
    this.init();
    this._panel.classList.add('open');
    this._overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  },
  close()  {
    if (!this._panel) return;
    this._panel.classList.remove('open');
    this._overlay.classList.remove('open');
    document.body.style.overflow = '';
  },
  toggle() { this._panel?.classList.contains('open') ? this.close() : this.open(); }
};