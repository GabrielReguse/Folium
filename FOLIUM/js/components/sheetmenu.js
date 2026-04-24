/* ═══════════════════════════════════════
   FOLIUM — components/sheetmenu.js
   Dropdown leve (kebab / popover) com ações
   de uma folha: favoritar, baixar, excluir.
═══════════════════════════════════════ */

const SheetMenu = {
  _current: null,

  _icons: {
    star:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    starOff:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    doc:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>`,
    pdf:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h1.5a1.5 1.5 0 0 1 0 3H8v2"/><path d="M12 13v5h1a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2h-1z"/><path d="M17 13h2"/><path d="M17 16h1.5"/><path d="M17 13v5"/></svg>`,
    trash:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  },

  /**
   * Mostra o menu ancorado em `anchorBtn`.
   * @param {HTMLElement} anchorBtn — botão que disparou o menu
   * @param {Object} opts
   *   - isFav (bool)
   *   - onFavorite (fn)
   *   - onDownloadDoc (fn)
   *   - onDownloadPdf (fn)
   *   - onDelete (fn)
   *   - variant: 'full' (padrão, mostra todas as ações) | 'download' (só DOC/PDF)
   */
  show(anchorBtn, opts = {}) {
    this.close();

    const variant = opts.variant || 'full';
    const menu = document.createElement('div');
    menu.className = `sheet-menu sheet-menu--${variant}`;
    menu.setAttribute('role', 'menu');

    const items = [];

    if (variant === 'full') {
      const favLabel = opts.isFav ? 'Desfavoritar' : 'Favoritar';
      const favIcon  = opts.isFav
        ? `<span class="sm-icon sm-icon--star-on">${this._icons.star}</span>`
        : `<span class="sm-icon">${this._icons.starOff}</span>`;
      items.push({ icon: favIcon, label: favLabel, onClick: opts.onFavorite });
      items.push({ icon: `<span class="sm-icon">${this._icons.doc}</span>`, label: 'Baixar DOC', onClick: opts.onDownloadDoc });
      items.push({ icon: `<span class="sm-icon">${this._icons.pdf}</span>`, label: 'Baixar PDF', onClick: opts.onDownloadPdf });
      items.push({ icon: `<span class="sm-icon sm-icon--danger">${this._icons.trash}</span>`, label: 'Excluir', danger: true, onClick: opts.onDelete });
    } else {
      items.push({ icon: `<span class="sm-icon">${this._icons.doc}</span>`, label: 'DOC (Word)', onClick: opts.onDownloadDoc });
      items.push({ icon: `<span class="sm-icon">${this._icons.pdf}</span>`, label: 'PDF', onClick: opts.onDownloadPdf });
    }

    items.forEach(it => {
      if (!it.onClick) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `sm-item${it.danger ? ' sm-item--danger' : ''}`;
      btn.setAttribute('role', 'menuitem');
      btn.innerHTML = `${it.icon}<span class="sm-label">${it.label}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
        it.onClick();
      });
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);
    this._position(menu, anchorBtn);
    this._current = menu;

    // click fora / esc / scroll / resize fecha
    setTimeout(() => {
      document.addEventListener('click', this._onDocClick, true);
      document.addEventListener('keydown', this._onKey, true);
      window.addEventListener('resize', this._onReposition, true);
      window.addEventListener('scroll', this._onReposition, true);
    }, 0);
    menu._anchor = anchorBtn;
  },

  close() {
    if (!this._current) return;
    this._current.remove();
    this._current = null;
    document.removeEventListener('click', this._onDocClick, true);
    document.removeEventListener('keydown', this._onKey, true);
    window.removeEventListener('resize', this._onReposition, true);
    window.removeEventListener('scroll', this._onReposition, true);
  },

  _onDocClick(e) {
    const cur = SheetMenu._current;
    if (!cur) return;
    if (cur.contains(e.target)) return;
    if (cur._anchor && cur._anchor.contains(e.target)) return;
    SheetMenu.close();
  },

  _onKey(e) {
    if (e.key === 'Escape') SheetMenu.close();
  },

  _onReposition() {
    SheetMenu.close();
  },

  _position(menu, anchor) {
    const rect = anchor.getBoundingClientRect();
    menu.style.visibility = 'hidden';
    menu.style.position = 'fixed';
    menu.style.left = '0px';
    menu.style.top = '0px';
    // garantir dimensões calculadas
    const mw = menu.offsetWidth  || 200;
    const mh = menu.offsetHeight || 150;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;

    let left = rect.right - mw;                  // alinha à direita do botão
    if (left < margin) left = margin;
    if (left + mw > vw - margin) left = vw - mw - margin;

    let top = rect.bottom + 6;
    if (top + mh > vh - margin) {
      // abre para cima se não couber embaixo
      top = rect.top - mh - 6;
      if (top < margin) top = margin;
    }

    menu.style.left = `${Math.round(left)}px`;
    menu.style.top  = `${Math.round(top)}px`;
    menu.style.visibility = '';
  },
};
