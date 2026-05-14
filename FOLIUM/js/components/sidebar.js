const Sidebar = {
  _panel: null,
  _overlay: null,
  _ready: false,

  init() {
    if (this._ready) return;
    this._ready = true;

    const overlay = document.createElement("div");
    overlay.id = "sb-overlay";
    overlay.className = "sidebar-overlay";
    overlay.addEventListener("click", () => Sidebar.close());

    const panel = document.createElement("div");
    panel.id = "sb-panel";
    panel.className = "sidebar-panel";

    const user = Storage.getUser() || {};
    const subjects = Storage.getSubjects() || [];
    const name = user.name || user.nome || "Usuário";
    const email = user.email || "";
    const first = this._escape(name.trim().charAt(0).toUpperCase() || "F");
    const active = this._activeRoute();
    const sheetCount = subjects.reduce(
      (total, s) => total + (s.folhas || []).length,
      0,
    );
    const mapCount = subjects.reduce(
      (total, s) => total + (s.mapas || []).length,
      0,
    );
    const navItems = [
      {
        route: "home",
        label: "Início",
        sub: "Painel principal",
        icon: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9.5Z"/>',
      },
      {
        route: "escolher",
        label: "Criar",
        sub: "Folha ou mapa",
        icon: '<path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/>',
      },
      {
        route: "folhas",
        label: "Biblioteca",
        sub: "Folhas salvas",
        icon: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-3-7 3V4a1 1 0 0 1 1-1Z"/><path d="M9 8h6M9 12h4"/>',
      },
      {
        route: "suporte",
        label: "Suporte",
        sub: "Ajuda e contato",
        icon: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-2.9 2.7-2.9 4"/><path d="M12 17h.01"/>',
      },
    ];
    const navHtml = navItems
      .map(
        (item) => `
          <button class="sb-nav-item ${active === item.route ? "active" : ""}" onclick="Sidebar.go('${item.route}')" type="button">
            <span class="sb-nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
            </span>
            <span class="sb-nav-copy">
              <span>${item.label}</span>
              <small>${item.sub}</small>
            </span>
          </button>`,
      )
      .join("");

    panel.innerHTML = `
      <div class="sb-head">
        <div class="sb-brand-mark">
          <img src="../assets/images/favicon-folium.png" alt="" aria-hidden="true">
        </div>
        <div class="sb-head-copy">
          <strong>Folium</strong>
          <span>Central de estudos</span>
        </div>
        <button class="sb-close" onclick="Sidebar.close()" aria-label="Fechar">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="sb-user-block">
        <div class="sb-avatar">${first}</div>
        <div>
          <div class="sb-user-name">${this._escape(name)}</div>
          ${email ? `<div class="sb-user-email">${this._escape(email)}</div>` : ""}
        </div>
      </div>
      <div class="sb-body">
        <nav class="sb-nav" aria-label="Navegação lateral">
          ${navHtml}
        </nav>
        <div class="sb-library">
          <span class="sb-library__label">Sua biblioteca</span>
          <div class="sb-library__grid">
            <div><strong>${sheetCount}</strong><span>folhas</span></div>
            <div><strong>${mapCount}</strong><span>mapas</span></div>
            <div><strong>${subjects.length}</strong><span>matérias</span></div>
          </div>
        </div>
        <button class="sb-logout-btn" onclick="Sidebar.close(); Router.logout()">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
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

  open() {
    this.init();
    this._panel.classList.add("open");
    this._overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  },

  close() {
    if (!this._panel) return;
    this._panel.classList.remove("open");
    this._overlay.classList.remove("open");
    document.body.style.overflow = "";
  },

  toggle() {
    this._panel?.classList.contains("open") ? this.close() : this.open();
  },

  go(route) {
    this.close();
    Router.go(route);
  },

  _activeRoute() {
    const file = (
      window.location.pathname.split("/").pop() || ""
    ).toLowerCase();
    if (file.includes("home")) return "home";
    if (file.includes("folhas") || file.includes("materia")) return "folhas";
    if (file.includes("suporte")) return "suporte";
    if (
      file.includes("criar") ||
      file.includes("mapa") ||
      file.includes("escolher")
    ) {
      return "escolher";
    }
    return "home";
  },

  _escape(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },
};
