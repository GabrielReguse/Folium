/* FOLIUM — components/navbar.js */

/* SVG icons centralizados */
const NavIcons = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>`,

  criar: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>`,

  folhas: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    <line x1="9" y1="8" x2="15" y2="8"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
  </svg>`,

  suporte: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17" stroke-width="2.5"/>
  </svg>`,

  back: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
    <path d="M19 12H5M12 5l-7 7 7 7"/>
  </svg>`,

  logout: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>`,
};

const Navbar = {
  /**
   * Injeta a top navbar
   * @param {object} opts
   *   - backLabel  {string}  texto do botão voltar (null = sem botão)
   *   - backRoute  {string}  rota ao clicar em voltar
   *   - title      {string}  título central (HTML permitido)
   *   - showLogout {bool}    exibe botão de sair
   */
  renderTop(opts = {}) {
    const {
      backLabel  = 'Voltar',
      backRoute  = null,
      title      = '<em>Folium</em>',
      showLogout = false,
    } = opts;

    const nav = document.createElement('nav');
    nav.className = 'top-nav';
    nav.innerHTML = `
      <div style="width:90px">
        ${backRoute
          ? `<button class="nav-back" onclick="Router.go('${backRoute}')">
               ${NavIcons.back}
               ${backLabel}
             </button>`
          : ''}
      </div>
      <div class="logo-nav">${title}</div>
      <div style="width:90px;text-align:right">
        ${showLogout
          ? `<button class="nav-logout" onclick="Router.logout()" title="Sair">
               ${NavIcons.logout} Sair
             </button>`
          : ''}
      </div>`;

    const page = document.querySelector('.page');
    if (!page) return;

    const existing = page.querySelector('.top-nav');
    if (existing) existing.remove();

    page.insertBefore(nav, page.firstChild);
  },

  /**
   * Injeta a bottom navbar
   * @param {string} active - rota ativa
   */
  renderBottom(active = 'home') {
    const items = [
      { route: 'home',    icon: NavIcons.home,    label: 'Início'  },
      { route: 'criar',   icon: NavIcons.criar,   label: 'Criar'   },
      { route: 'folhas',  icon: NavIcons.folhas,  label: 'Folhas'  },
      { route: 'suporte', icon: NavIcons.suporte, label: 'Suporte' },
    ];

    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.innerHTML = items.map(it => `
      <button
        class="nav-item ${it.route === active ? 'active' : ''}"
        onclick="Router.go('${it.route}')">
        <span class="ni">${it.icon}</span>
        <span class="nl">${it.label}</span>
      </button>`).join('');

    const page = document.querySelector('.page');
    if (page) page.appendChild(nav);
  }
};
