/* FOLIUM v4 — components/navbar.js */

const NavIcons = {
  home:   `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>`,
  criar:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  folhas: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg>`,
  suporte:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="currentColor" stroke="none"/></svg>`,
  back:   `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>`,
  burger: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><line x1="3" y1="7"  x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>`,
};

const Navbar = {

  renderTop(opts = {}) {
    const {
      backRoute  = null,
      backLabel  = 'Voltar',
      title      = 'Foli<em>um</em>',
      showBurger = true,
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

  /* ─────────────────────────────────────────
     renderBottom — dock no desktop, barra no mobile
  ───────────────────────────────────────── */
  renderBottom(active = 'home') {
    if (window.innerWidth >= 900) {
      this._renderDock(active);
    } else {
      this._renderMobileNav(active);
    }
  },

  /* ── MOBILE NAV (bottom bar) ── */
  _renderMobileNav(active = 'home') {
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
      <div class="nav-logo-desk">Foli<em>um</em></div>
      ${items.map(it => `
        <button
          class="nav-item ${it.route === active ? 'active' : ''}"
          onclick="Router.go('${it.route}')">
          <span class="ni">${it.icon}</span>
          <span class="nl">${it.label}</span>
        </button>`).join('')}
      <div class="nav-user-desk">
        <div class="nu-name">${userName}</div>
        <div class="nu-label">Conta</div>
      </div>`;

    const page = document.querySelector('.page');
    if (page) {
      const existing = page.querySelector('.bottom-nav, .dock-nav');
      if (existing) existing.remove();
      page.appendChild(nav);
    }
  },

  /* ── DESKTOP DOCK — bolha flutuante fora da borda ── */
  _renderDock(active = 'home') {
    const items = [
      { route: 'home',    icon: NavIcons.home,    label: 'Início'  },
      { route: 'criar',   icon: NavIcons.criar,   label: 'Criar'   },
      { route: 'folhas',  icon: NavIcons.folhas,  label: 'Folhas'  },
      { route: 'suporte', icon: NavIcons.suporte, label: 'Suporte' },
    ];

    /* Wrapper fixo centralizado */
    const nav = document.createElement('nav');
    nav.className = 'dock-nav';
    nav.dataset.active = active;

    /* Pílula — contém itens, bolha e máscara */
    const pill = document.createElement('div');
    pill.className = 'dock-pill';

    /* Itens de navegação */
    items.forEach(it => {
      const btn = document.createElement('button');
      btn.className = `dock-item${it.route === active ? ' active' : ''}`;
      btn.dataset.route = it.route;
      btn.innerHTML = `
        <span class="di-icon">${it.icon}</span>
        <span class="di-label">${it.label}</span>`;
      btn.addEventListener('click', () => {
        if (it.route === nav.dataset.active) return;
        this._animateBubbleTo(nav, btn, it.route);
        setTimeout(() => Router.go(it.route), 300);
      });
      pill.appendChild(btn);
    });

    /* Bolha verde que flutua acima da borda */
    const bubble = document.createElement('div');
    bubble.className = 'dock-bubble';
    bubble.innerHTML = `<span class="db-icon">${NavIcons[active] || ''}</span>`;
    pill.appendChild(bubble);

    /* Máscara que apaga a borda superior sob a bolha */
    const mask = document.createElement('div');
    mask.className = 'dock-notch-mask';
    pill.appendChild(mask);

    nav.appendChild(pill);

    /* Injeta no DOM */
    const page = document.querySelector('.page');
    if (page) {
      const existing = page.querySelector('.dock-nav, .bottom-nav');
      if (existing) existing.remove();
      page.appendChild(nav);
    }

    /* Posiciona após o layout ser calculado */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._positionBubble(nav, active);
      });
    });
  },

  /* Posiciona a bolha e a máscara sobre o item ativo */
  _positionBubble(nav, activeRoute) {
    const pill       = nav.querySelector('.dock-pill');
    const bubble     = nav.querySelector('.dock-bubble');
    const mask       = nav.querySelector('.dock-notch-mask');
    const activeItem = nav.querySelector(`.dock-item[data-route="${activeRoute}"]`);

    if (!pill || !bubble || !activeItem) return;

    const pillRect = pill.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();

    /* Centro X do item relativo ao padding-box da pílula */
    const cx = itemRect.left - pillRect.left + itemRect.width / 2;

    /* Bolha: 58px de diâmetro, centrada */
    bubble.style.left    = `${cx - 29}px`;
    bubble.style.opacity = '1';

    /* Máscara: 66px, centrada — cobre a borda superior da pílula */
    if (mask) mask.style.left = `${cx - 33}px`;
  },

  /* Anima a bolha para o novo destino antes de navegar */
  _animateBubbleTo(nav, targetBtn, route) {
    const pill   = nav.querySelector('.dock-pill');
    const bubble = nav.querySelector('.dock-bubble');
    const mask   = nav.querySelector('.dock-notch-mask');

    if (!pill || !bubble) return;

    nav.dataset.active = route;

    /* Atualiza ícone na bolha */
    const iconEl = bubble.querySelector('.db-icon');
    if (iconEl) iconEl.innerHTML = NavIcons[route] || '';

    /* Move classes .active */
    nav.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));
    targetBtn.classList.add('active');

    /* Desloca a bolha e a máscara */
    const pillRect = pill.getBoundingClientRect();
    const itemRect = targetBtn.getBoundingClientRect();
    const cx = itemRect.left - pillRect.left + itemRect.width / 2;

    bubble.style.left = `${cx - 29}px`;
    if (mask) mask.style.left = `${cx - 33}px`;
  },
};
