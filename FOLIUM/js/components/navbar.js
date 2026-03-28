/* ═══════════════════════════════════════
   FOLIUM — components/navbar.js
   Renderização da top e bottom navbar
═══════════════════════════════════════ */

const Navbar = {
  /**
   * Injeta a top navbar no topo de .page
   * @param {object} opts
   *   - backLabel  {string}  texto do botão voltar (null = sem botão)
   *   - backRoute  {string}  rota ao clicar em voltar
   *   - title      {string}  título central (HTML permitido)
   *   - showLogout {bool}    exibe botão de sair (padrão: false)
   */
  renderTop(opts = {}) {
    const {
      backLabel  = '‹ Voltar',
      backRoute  = null,
      title      = '<em>Folium</em>',
      showLogout = false,
    } = opts;

    const nav = document.createElement('nav');
    nav.className = 'top-nav';
    nav.innerHTML = `
      <div style="width:80px">
        ${backRoute
          ? `<button class="nav-back" onclick="Router.go('${backRoute}')">${backLabel}</button>`
          : ''}
      </div>
      <div class="logo-nav">${title}</div>
      <div style="width:80px;text-align:right">
        ${showLogout
          ? `<button class="nav-logout" onclick="Router.logout()" title="Sair">↩ Sair</button>`
          : ''}
      </div>`;

    const page = document.querySelector('.page');
    if (page) page.insertBefore(nav, page.firstChild);
  },

  /**
   * Injeta a bottom navbar
   * @param {string} active - rota ativa
   */
  renderBottom(active = 'home') {
    const items = [
      { route: 'home',    icon: '🏠', label: 'Início'  },
      { route: 'criar',   icon: '✨', label: 'Criar'   },
      { route: 'folhas',  icon: '📚', label: 'Folhas'  },
      { route: 'suporte', icon: '💬', label: 'Suporte' },
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
