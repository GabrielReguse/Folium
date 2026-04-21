/* FOLIUM v3 — components/navbar.js */

const NavIcons = {
  home:   `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>`,
  criar:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  folhas: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg>`,
  suporte:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="currentColor" stroke="none"/></svg>`,
  back:   `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>`,
  burger: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><line x1="3" y1="7"  x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>`,
};

const Navbar = {
  /**
   * Top navbar
   * opts.backRoute  — se definido, mostra botão voltar
   * opts.backLabel  — label do botão voltar
   * opts.title      — título central (HTML)
   * opts.showBurger — mostra hamburger (padrão: true)
   */
  renderTop(opts = {}) {
    const {
      backRoute  = null,
      backLabel  = 'Voltar',
      title      = 'Foli<em>um</em>',
      showBurger = true,
      showLogout = false, // legacy — kept for compat, ignored (use sidebar)
    } = opts;

    const nav = document.createElement('nav');
    nav.className = 'top-nav';
    nav.innerHTML = `
      <div style="min-width:90px">
        ${backRoute
          ? `<button class="nav-back" onclick="Router.go('${backRoute}')">
               ${NavIcons.back} ${backLabel}
             </button>`
          : ''}
      </div>
      <div class="logo-nav">${title}</div>
      <div style="min-width:90px;display:flex;justify-content:flex-end">
        ${showBurger
          ? `<button class="nav-hamburger" onclick="Sidebar.toggle()" aria-label="Menu">
               ${NavIcons.burger}
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
   * Bottom navbar (vira sidebar no desktop via CSS)
   */
  renderBottom(active = 'home') {
    const items = [
      { route: 'home',    icon: NavIcons.home,    label: 'Início'  },
      { route: 'criar',   icon: NavIcons.criar,   label: 'Criar'   },
      { route: 'folhas',  icon: NavIcons.folhas,  label: 'Folhas'  },
      { route: 'suporte', icon: NavIcons.suporte, label: 'Suporte' },
    ];

    const user     = Storage.getUser() || {};
    const userName = user.name || user.nome || 'Usuário';

    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.innerHTML = `
      <!-- Logo — visível apenas na sidebar desktop -->
      <div class="nav-logo-desk">Foli<em>um</em></div>

      ${items.map(it => `
        <button
          class="nav-item ${it.route === active ? 'active' : ''}"
          onclick="Router.go('${it.route}')">
          <span class="ni">${it.icon}</span>
          <span class="nl">${it.label}</span>
        </button>`).join('')}

      <!-- Bloco do usuário — visível apenas na sidebar desktop -->
      <div class="nav-user-desk">
        <div class="nu-name">${userName}</div>
        <div class="nu-label">Conta</div>
      </div>`;

    const page = document.querySelector('.page');
    if (page) page.appendChild(nav);
  }
};
