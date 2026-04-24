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

  renderBottom(active = 'home') {
    // Usa o dock em todos os tamanhos de tela
    this._renderDock(active);
  },

  _renderMobileNav(active = 'home') {
    const items = [
      { route: 'home',    icon: NavIcons.home,    label: 'Início'  },
      { route: 'criar',   icon: NavIcons.criar,   label: 'Criar'   },
      { route: 'folhas',  icon: NavIcons.folhas,  label: 'Folhas'  },
      { route: 'suporte', icon: NavIcons.suporte, label: 'Suporte' },
    ];

    const user     = (typeof Storage !== 'undefined' && typeof Storage.getUser === 'function') ? Storage.getUser() : {};
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
      const existing = page.querySelector('.bottom-nav, .dock-nav-desktop');
      if (existing) existing.remove();
      page.appendChild(nav);
    }
  },

  _renderDock(active = 'home') {
    const items = [
      { route: 'home',    icon: NavIcons.home,    label: 'Início'  },
      { route: 'criar',   icon: NavIcons.criar,   label: 'Criar'   },
      { route: 'folhas',  icon: NavIcons.folhas,  label: 'Folhas'  },
      { route: 'suporte', icon: NavIcons.suporte, label: 'Suporte' },
    ];

    if (!document.getElementById('dock-nav-style')) {
      const style = document.createElement('style');
      style.id = 'dock-nav-style';
      style.innerHTML = `
        /* ── Desktop: pill flutuante centralizado ── */
        .dock-nav-desktop {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 380px;
          height: 70px;
          z-index: 1000;
          display: flex;
          -webkit-tap-highlight-color: transparent;
          filter: drop-shadow(0px -5px 10px rgba(0, 0, 0, 0.12));
        }

        /* ── Mobile: barra fixa de borda a borda ── */
        @media (max-width: 899px) {
          .dock-nav-desktop {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            transform: none !important;
            width: 100vw !important;
            height: 64px !important;
            /* sem drop-shadow que pode causar overflow lateral */
            filter: none !important;
            /* sombra superior discreta em vez de drop-shadow */
            box-shadow: 0 -2px 16px rgba(92,61,46,0.10);
          }
          .dock-bg {
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
            border-bottom: none !important;
            border-top: 1px solid #D1C4A8 !important;
          }
          /* Círculo ligeiramente menor no mobile para não sair da tela */
          .dock-slider {
            width: 80px !important;
            height: 80px !important;
            top: -39px !important;
          }
          .dock-slider-icon {
            top: 26px !important;
            left: 26px !important;
            width: 28px !important;
            height: 28px !important;
          }
          .dock-slider-icon svg {
            width: 18px !important;
            height: 18px !important;
          }
          /* Items com padding menor para não espremer o texto */
          .dock-item {
            padding-top: 10px !important;
          }
        }

        .dock-bg {
          position: absolute;
          inset: 0;
          background-color: #F0E8D1;
          border: 1.5px solid #D1C4A8;
          border-radius: 22px 22px 0 0;
          box-sizing: border-box;
          -webkit-mask-image: radial-gradient(circle at 1000px 1px, transparent 22px, black 23px);
          mask-image: radial-gradient(circle at 1000px 1px, transparent 22px, black 23px);
          -webkit-mask-size: 2000px 100%;
          mask-size: 2000px 100%;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          transition: -webkit-mask-position 0.4s cubic-bezier(0.4, 0, 0.2, 1), mask-position 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dock-slider {
          position: absolute;
          top: -49px;
          left: 0;
          width: 100px;
          height: 100px;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 2;
          pointer-events: none;
        }

        .dock-slider-icon {
          position: absolute;
          top: 33px;
          left: 33px;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #F5F2E7;
        }

        .dock-slider-icon svg {
          width: 22px;
          height: 22px;
          stroke: currentColor;
          display: block;
        }

        .dock-items {
          display: flex;
          width: 100%;
          height: 100%;
          position: relative;
          z-index: 3;
        }

        .dock-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding-top: 14px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #AD8B6B;
          outline: none;
          min-width: 0;
        }

        .di-icon-wrapper {
          width: 24px;
          height: 24px;
          margin-bottom: 4px;
          transition: opacity 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .di-icon-wrapper svg {
          width: 22px;
          height: 22px;
          stroke: currentColor;
        }

        .di-label {
          font-size: 11px;
          font-weight: 600;
          font-family: inherit;
          transition: color 0.3s;
          white-space: nowrap;
        }

        .dock-item.active .di-icon-wrapper {
          opacity: 0;
        }
        .dock-item.active .di-label {
          color: #6CAB69;
        }
      `;
      document.head.appendChild(style);
    }

    const nav = document.createElement('nav');
    nav.className = 'dock-nav-desktop';
    nav.dataset.active = active;

    const bg = document.createElement('div');
    bg.className = 'dock-bg';
    nav.appendChild(bg);

    const slider = document.createElement('div');
    slider.className = 'dock-slider';
    slider.innerHTML = `
      <svg viewBox="0 0 100 100" width="100%" height="100%" style="display:block;">
        /* Ajuste do arco da borda para bater com a borda da nav */
        <path d="M 24 50 A 26 26 0 0 0 76 50" fill="none" stroke="#D1C4A8" stroke-width="1.5" />
        <circle cx="50" cy="50" r="22" fill="none" stroke="#6CAB69" stroke-width="2"/>
        <circle cx="50" cy="50" r="18" fill="#6CAB69" />
      </svg>
      <div class="dock-slider-icon">
        ${NavIcons[active] || ''}
      </div>
    `;
    nav.appendChild(slider);

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'dock-items';

    items.forEach(it => {
      const btn = document.createElement('button');
      btn.className = `dock-item ${it.route === active ? 'active' : ''}`;
      btn.dataset.route = it.route;
      btn.innerHTML = `
        <span class="di-icon-wrapper">${it.icon}</span>
        <span class="di-label">${it.label}</span>`;
      
      btn.addEventListener('click', () => {
        const route = it.route;
        if (route === nav.dataset.active) return;
        this._animateBubbleTo(nav, btn, route);
        Router.go(route);
      });
      itemsContainer.appendChild(btn);
    });
    nav.appendChild(itemsContainer);

    /* Sempre appendar ao body — evita que CSS do .page quebre position:fixed */
    const existing = document.querySelector('.dock-nav-desktop, .bottom-nav');
    if (existing) existing.remove();
    document.body.appendChild(nav);

    /* Forçar position:fixed via inline style para mobile como garantia extra */
    if (window.innerWidth < 900) {
      nav.style.position = 'fixed';
      nav.style.bottom   = '0';
      nav.style.left     = '0';
      nav.style.width    = '100vw';
      nav.style.height   = '64px';
      nav.style.zIndex   = '9999';
    }

    requestAnimationFrame(() => {
      this._positionBubble(nav, active);
    });
  },

  _positionBubble(nav, activeRoute) {
    const slider = nav.querySelector('.dock-slider');
    const bg = nav.querySelector('.dock-bg');
    const activeItem = nav.querySelector(`.dock-item[data-route="${activeRoute}"]`);

    if (!slider || !bg || !activeItem) return;

    const navRect = nav.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const rawCx = itemRect.left - navRect.left + itemRect.width / 2;

    /* Detecta tamanho real do slider (pode ser 80px no mobile, 100px no desktop) */
    const sliderSize = parseFloat(getComputedStyle(slider).width) || 100;
    const half = sliderSize / 2;

    /* Clamp: bolha nunca sai pelos lados */
    const cx = Math.max(half, Math.min(navRect.width - half, rawCx));

    /* Raio da máscara: metade do slider */
    const maskRadius = half - 4; /* 4px de margem para a borda combinar */

    slider.style.transform = `translateX(${cx - half}px)`;
    bg.style.webkitMaskPosition = `${cx - 1000}px 0`;
    bg.style.maskPosition = `${cx - 1000}px 0`;
  },

  _animateBubbleTo(nav, targetBtn, route) {
    nav.dataset.active = route;
    const iconEl = nav.querySelector('.dock-slider-icon');
    if (iconEl) iconEl.innerHTML = NavIcons[route] || '';
    nav.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));
    targetBtn.classList.add('active');
    this._positionBubble(nav, route);
  }
};