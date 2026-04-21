/* FOLIUM v3 — components/sidebar.js */

const Sidebar = {
  _panel:   null,
  _overlay: null,

  init() {
    if (document.getElementById('sb-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id        = 'sb-overlay';
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', () => Sidebar.close());

    const panel = document.createElement('div');
    panel.id        = 'sb-panel';
    panel.className = 'sidebar-panel';

    const user     = Storage.getUser() || {};
    const userName = user.name  || user.nome  || 'Usuário';
    const userEmail= user.email || '';

    panel.innerHTML = `
      <div class="sb-head">
        <div>
          <div class="sb-logo">Foli<em>um</em></div>
          <div class="sb-tagline">Resumos inteligentes</div>
        </div>
        <button class="sb-close" onclick="Sidebar.close()" aria-label="Fechar menu">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6"  y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="sb-body">
        <div class="sb-user">
          <div class="sb-user-name">${userName}</div>
          ${userEmail ? `<div class="sb-user-email">${userEmail}</div>` : ''}
        </div>

        <button class="sb-item" onclick="Sidebar.close();Router.go('home')">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
            <path d="M9 21V12h6v9"/>
          </svg>
          Início
        </button>

        <button class="sb-item" onclick="Sidebar.close();Router.go('criar')">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8"  y1="12" x2="16" y2="12"/>
          </svg>
          Criar folha
        </button>

        <button class="sb-item" onclick="Sidebar.close();Router.go('folhas')">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            <line x1="9" y1="7"  x2="15" y2="7"/>
            <line x1="9" y1="11" x2="15" y2="11"/>
          </svg>
          Minhas folhas
        </button>

        <button class="sb-item" onclick="Sidebar.close();Router.go('suporte')">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
            <circle cx="12" cy="17" r=".5" fill="var(--text-mid)"/>
          </svg>
          Suporte
        </button>

        <div class="sb-divider"></div>

        <button class="sb-item sb-item-danger" onclick="Sidebar.close();Router.logout()">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Desconectar
        </button>
      </div>

      <div class="sb-footer">
        <div class="sb-version">Folium — versão beta</div>
      </div>`;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    this._panel   = panel;
    this._overlay = overlay;
  },

  open() {
    this.init();
    this._panel.classList.add('open');
    this._overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    if (!this._panel) return;
    this._panel.classList.remove('open');
    this._overlay.classList.remove('open');
    document.body.style.overflow = '';
  },

  toggle() {
    this._panel && this._panel.classList.contains('open')
      ? this.close()
      : this.open();
  }
};
