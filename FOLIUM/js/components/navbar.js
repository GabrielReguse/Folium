const NavIcons = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>`,
  criar: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  folhas: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg>`,
  biblioteca: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h4v16H4z"/><path d="M10 7h4v13h-4z"/><path d="M16 2h4v18h-4z"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  suporte: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>`,
  burger: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><line x1="3" y1="7"  x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>`,
};

const Navbar = {
  renderTop(opts = {}) {
    const {
      backRoute = null,
      backLabel = "Voltar",
      title = "Foli<em>um</em>",
      showBurger = true,
    } = opts;

    const nav = document.createElement("nav");
    nav.className = "top-nav";
    nav.innerHTML = `
      <div style="min-width:90px">
        ${
          backRoute
            ? `<button class="nav-back" onclick="Router.go('${backRoute}')">
               ${NavIcons.back} ${backLabel}
             </button>`
            : ""
        }
      </div>
      <div class="logo-nav">${title}</div>
      <div style="min-width:90px;display:flex;justify-content:flex-end">
        ${
          showBurger
            ? `<button class="nav-hamburger" onclick="Sidebar.toggle()" aria-label="Menu">
               ${NavIcons.burger}
             </button>`
            : ""
        }
      </div>`;

    const page = document.querySelector(".page");
    if (!page) return;
    const existing = page.querySelector(".top-nav");
    if (existing) existing.remove();
    page.insertBefore(nav, page.firstChild);
  },

  renderBottom(active = "home") {
    this._renderDock(active);
  },

  _renderMobileNav(active = "home") {
    const items = [
      { route: "home", icon: NavIcons.home, label: "Início" },
      { route: "escolher", icon: NavIcons.criar, label: "Criar" },
      { route: "folhas", icon: NavIcons.biblioteca, label: "Biblioteca" },
      { route: "suporte", icon: NavIcons.suporte, label: "Suporte" },
    ];

    const user =
      typeof Storage !== "undefined" && typeof Storage.getUser === "function"
        ? Storage.getUser()
        : {};
    const userName = user.name || user.nome || "Usuário";

    const nav = document.createElement("nav");
    nav.className = "bottom-nav";
    nav.innerHTML = `
      <div class="nav-logo-desk">Foli<em>um</em></div>
      ${items
        .map(
          (it) => `
        <button
          class="nav-item ${it.route === active ? "active" : ""}"
          onclick="Router.go('${it.route}')">
          <span class="ni">${it.icon}</span>
          <span class="nl">${it.label}</span>
        </button>`,
        )
        .join("")}
      <div class="nav-user-desk">
        <div class="nu-name">${userName}</div>
        <div class="nu-label">Conta</div>
      </div>`;

    const page = document.querySelector(".page");
    if (page) {
      const existing = page.querySelector(".bottom-nav, .dock-nav-desktop");
      if (existing) existing.remove();
      page.appendChild(nav);
    }
  },

  _renderDock(active = "home") {
    const items = [
      { route: "home", icon: NavIcons.home, label: "Início" },
      { route: "escolher", icon: NavIcons.criar, label: "Criar" },
      { route: "folhas", icon: NavIcons.biblioteca, label: "Biblioteca" },
      { route: "suporte", icon: NavIcons.suporte, label: "Suporte" },
    ];

    if (!document.getElementById("dock-nav-style")) {
      const style = document.createElement("style");
      style.id = "dock-nav-style";
      style.innerHTML = `
        .dock-nav-desktop {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 380px;
          height: 70px;
          z-index: 1000;
          display: flex;
          -webkit-tap-highlight-color: transparent;
          filter: drop-shadow(0px -5px 10px rgba(0, 0, 0, 0.12));
        }
        @media (max-width: 899px) {
          .dock-nav-desktop {
            width: 100%;
            left: 0;
            transform: none;
          }
          .dock-bg {
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
          }
        }
        
        .dock-bg {
          position: absolute;
          inset: 0;
          background-color: #F0E8D1;
          border: 1.5px solid #D1C4A8;
          border-radius: 22px 22px 0 0; 
          box-sizing: border-box;
          
          -webkit-mask-image: radial-gradient(circle at 1000px 1px, transparent 26px, black 27px);
          mask-image: radial-gradient(circle at 1000px 1px, transparent 26px, black 27px);
          -webkit-mask-size: 2000px 100%;
          mask-size: 2000px 100%;
          -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
          transition: -webkit-mask-position 0.24s cubic-bezier(0.4, 0, 0.2, 1), mask-position 0.24s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dock-slider {
          position: absolute;
          top: -49px; 
          left: 0;
          width: 100px;
          height: 100px;
          transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
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
        }
        
        .di-icon-wrapper {
          width: 24px;
          height: 24px;
          margin-bottom: 4px;
          transition: opacity 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
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

    const nav = document.createElement("nav");
    nav.className = "dock-nav-desktop";
    nav.dataset.active = active;

    const bg = document.createElement("div");
    bg.className = "dock-bg";
    nav.appendChild(bg);

    const slider = document.createElement("div");
    slider.className = "dock-slider";
    slider.innerHTML = `
      <svg viewBox="0 0 100 100" width="100%" height="100%" style="display:block;">
        <path d="M 24 50 A 26 26 0 0 0 76 50" fill="none" stroke="#D1C4A8" stroke-width="1.5" />
        <circle cx="50" cy="50" r="22" fill="none" stroke="#6CAB69" stroke-width="2"/>
        <circle cx="50" cy="50" r="18" fill="#6CAB69" />
      </svg>
      <div class="dock-slider-icon">
        ${(items.find((it) => it.route === active) || {}).icon || NavIcons[active] || ""}
      </div>
    `;
    nav.appendChild(slider);

    const itemsContainer = document.createElement("div");
    itemsContainer.className = "dock-items";

    items.forEach((it) => {
      const btn = document.createElement("button");
      btn.className = `dock-item ${it.route === active ? "active" : ""}`;
      btn.dataset.route = it.route;
      btn.innerHTML = `
        <span class="di-icon-wrapper">${it.icon}</span>
        <span class="di-label">${it.label}</span>`;

      btn.addEventListener("click", () => {
        const route = it.route;
        if (route === nav.dataset.active) return;

        this._animateBubbleTo(nav, btn, route);

        setTimeout(() => Router.go(route), 260);
      });
      itemsContainer.appendChild(btn);
    });
    nav.appendChild(itemsContainer);

    const page = document.querySelector(".page") || document.body;
    const existing = document.querySelector(".dock-nav-desktop, .bottom-nav");
    if (existing) existing.remove();
    page.appendChild(nav);

    requestAnimationFrame(() => {
      this._positionBubble(nav, active, true);
    });
  },

  _positionBubble(nav, activeRoute, instant = false) {
    const slider = nav.querySelector(".dock-slider");
    const bg = nav.querySelector(".dock-bg");
    const activeItem = nav.querySelector(
      `.dock-item[data-route="${activeRoute}"]`,
    );

    if (!slider || !bg || !activeItem) return;

    const navRect = nav.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const cx = itemRect.left - navRect.left + itemRect.width / 2;

    if (instant) {
      const prevSlider = slider.style.transition;
      const prevBg = bg.style.transition;
      slider.style.transition = "none";
      bg.style.transition = "none";
      slider.style.transform = `translateX(${cx - 50}px)`;
      bg.style.webkitMaskPosition = `${cx - 1000}px 0`;
      bg.style.maskPosition = `${cx - 1000}px 0`;

      slider.offsetHeight;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          slider.style.transition = prevSlider;
          bg.style.transition = prevBg;
        });
      });
    } else {
      slider.style.transform = `translateX(${cx - 50}px)`;
      bg.style.webkitMaskPosition = `${cx - 1000}px 0`;
      bg.style.maskPosition = `${cx - 1000}px 0`;
    }
  },

  _animateBubbleTo(nav, targetBtn, route) {
    nav.dataset.active = route;
    const iconEl = nav.querySelector(".dock-slider-icon");

    if (iconEl) {
      const btnIconEl = targetBtn.querySelector(".di-icon-wrapper");
      iconEl.innerHTML = btnIconEl
        ? btnIconEl.innerHTML
        : NavIcons[route] || "";
    }
    nav
      .querySelectorAll(".dock-item")
      .forEach((el) => el.classList.remove("active"));
    targetBtn.classList.add("active");
    this._positionBubble(nav, route);
  },
};
