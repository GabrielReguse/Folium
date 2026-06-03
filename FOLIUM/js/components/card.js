const CardIcons = {
  criar: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  folhas: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg>`,
  suporte: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg>`,
  sheet: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>`,
  subject: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  starFill: `<svg viewBox="0 0 24 24" fill="#f5a623" stroke="#f5a623" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,

  getSubjectIcon(name = "") {
    const n = name.toLowerCase();
    if (n.includes("bio"))
      return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M7 12s2-5 5-5 5 5 5 5-2 5-5 5-5-5-5-5z"/></svg>`;
    if (n.includes("mat") || n.includes("calc") || n.includes("álg"))
      return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`;
    if (n.includes("fís"))
      return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`;
    if (n.includes("hist"))
      return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    if (n.includes("geo"))
      return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`;
    if (n.includes("quím"))
      return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v11l-4 6h14l-4-6V3"/></svg>`;
    if (n.includes("port") || n.includes("liter"))
      return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`;

    return CardIcons.subject;
  },
};

const Card = {
  action({ icon, iconClass = "ai-1", title, subtitle, route, ctx = {} }) {
    const svgMap = {
      criar: CardIcons.criar,
      folhas: CardIcons.folhas,
      suporte: CardIcons.suporte,
    };
    const svgIcon = svgMap[route] || CardIcons.sheet;

    const arrowSvg = CardIcons.arrow;

    const btn = document.createElement("button");
    btn.className = "act-card au";
    btn.innerHTML = `
      <div class="act-icon ${iconClass}">${svgIcon}</div>
      <div class="act-info">
        <h3>${title}</h3>
        <p>${subtitle}</p>
      </div>
      <span class="act-arr">${arrowSvg}</span>`;
    btn.addEventListener("click", () => Router.go(route, ctx));
    return btn;
  },

  subject(s) {
    const nome = s.nomeNormalizado || s.name || "Matéria";
    const count = Array.isArray(s.folhas)
      ? s.folhas.length
      : Array.isArray(s.sheets)
        ? s.sheets.length
        : 0;
    const icon = CardIcons.getSubjectIcon(nome);

    const btn = document.createElement("button");
    btn.className = "subj-card";
    btn.innerHTML = `
      <div class="subj-emoji">${icon}</div>
      <div class="subj-info">
        <div class="subj-name">${nome}</div>
        <div class="subj-count">${count} folha${count !== 1 ? "s" : ""}</div>
      </div>
      <span class="subj-arr">${CardIcons.arrow}</span>`;
    btn.addEventListener("click", () =>
      Router.go("materia", { subjectId: s.id }),
    );
    return btn;
  },

  subjectMapas(s) {
    const nome = s.nomeNormalizado || s.name || "Matéria";
    const count = Array.isArray(s.mapas) ? s.mapas.length : 0;
    const icon = CardIcons.getSubjectIcon(nome);

    const btn = document.createElement("button");
    btn.className = "subj-card subj-card--maps";
    btn.innerHTML = `
      <div class="subj-emoji subj-emoji--forest">${icon}</div>
      <div class="subj-info">
        <div class="subj-name">${nome}</div>
        <div class="subj-count">${count} mapa${count !== 1 ? "s" : ""}</div>
      </div>
      <span class="subj-arr">${CardIcons.arrow}</span>`;
    btn.addEventListener("click", () => {
      Storage.setContext("fromMapasTab", true);
      Router.go("materia", { subjectId: s.id });
    });
    return btn;
  },

  mindMap(m) {
    const titulo = m.titulo || "Mapa";
    const data = m.dataFormatada || "";
    const nodesCount = Array.isArray(m.topicos) ? m.topicos.length :
      Array.isArray(m.nodes) ? m.nodes.filter((n) => !n.isCenter).length : 0;
    const isFav = !!m.favorita;
    const thumbSvg = m.thumbSvg || "";
    const subjectName = m.subjectName || "";
    const onFavorite = m.onFavorite;
    const onDelete   = m.onDelete;
    const onDownload = m.onDownload;

    const mapNodeIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:26px;height:26px;stroke:var(--forest);opacity:.65"><circle cx="12" cy="5" r="2.5"/><circle cx="4" cy="19" r="2.5"/><circle cx="20" cy="19" r="2.5"/><line x1="12" y1="7.5" x2="4" y2="16.5"/><line x1="12" y1="7.5" x2="20" y2="16.5"/></svg>`;
    const delIcon    = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    const dlJpgIcon  = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    const kebabIcon  = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;

    const btn = document.createElement("button");
    btn.className = "map-card-item";
    btn.innerHTML = `
      <div class="mc-thumb">
        ${thumbSvg
          ? `<div class="mc-thumb-svg">${thumbSvg}</div>`
          : `<div class="mc-thumb-placeholder">${mapNodeIcon}</div>`}
      </div>
      <div class="mc-info">
        <div class="mc-title">${titulo}</div>
        <div class="mc-meta">
          <span class="mc-node-count">${nodesCount} nó${nodesCount !== 1 ? "s" : ""}</span>
          ${subjectName ? `<span class="mc-subject-tag">${subjectName}</span>` : ""}
          ${data ? `<span class="mc-date">${data}</span>` : ""}
        </div>
      </div>
      <div class="mc-actions">
        <button class="fav-btn mc-fav mc-desktop ${isFav ? "on" : ""}" title="${isFav ? "Remover favorito" : "Favoritar"}">
          ${isFav ? CardIcons.starFill : CardIcons.star}
        </button>
        ${onDownload ? `<button class="dl-btn mc-dl mc-desktop" title="Baixar JPG">${dlJpgIcon}</button>` : ""}
        ${onDelete   ? `<button class="del-btn mc-del mc-desktop" title="Apagar mapa">${delIcon}</button>` : ""}
        <button class="sc-kebab mc-kebab" title="Mais opções" aria-haspopup="menu" aria-expanded="false">${kebabIcon}</button>
      </div>`;

    const favBtn = btn.querySelector(".fav-btn");
    if (favBtn && onFavorite) {
      favBtn.addEventListener("click", (e) => { e.stopPropagation(); onFavorite(); });
    }

    const dlBtn = btn.querySelector(".dl-btn");
    if (dlBtn && onDownload) {
      dlBtn.addEventListener("click", (e) => { e.stopPropagation(); onDownload(); });
    }

    const delBtn = btn.querySelector(".del-btn");
    if (delBtn && onDelete) {
      delBtn.addEventListener("click", (e) => { e.stopPropagation(); onDelete(); });
    }

    const kebab = btn.querySelector(".sc-kebab");
    if (kebab) {
      kebab.addEventListener("click", (e) => {
        e.stopPropagation();
        Card._openMapMenu(kebab, { isFav, onFavorite, onDownload, onDelete });
      });
    }

    btn.addEventListener("click", () => {
      Storage.setContext("mapaId", m.id);
      Storage.setContext("subjectId_mapa", m.subjectId);
      Storage.setContext("mapaOrigin", "biblioteca");
      Router.go("mapa");
    });
    return btn;
  },

  _openMapMenu(anchor, { isFav, onFavorite, onDownload, onDelete }) {
    const existing = document.querySelector(".sc-menu");
    if (existing) {
      existing.remove();
      if (existing.dataset.anchorId && existing.dataset.anchorId === anchor.dataset.menuId) {
        anchor.setAttribute("aria-expanded", "false");
        return;
      }
    }
    const menuId = "kb_" + Date.now().toString(36);
    anchor.dataset.menuId = menuId;
    anchor.setAttribute("aria-expanded", "true");

    const menu = document.createElement("div");
    menu.className = "sc-menu";
    menu.dataset.anchorId = menuId;
    menu.setAttribute("role", "menu");

    const items = [];
    if (onFavorite) items.push({ label: isFav ? "Remover favorito" : "Favoritar", action: onFavorite });
    if (onDownload) items.push({ label: "Baixar JPG", action: onDownload });
    if (onDelete)   items.push({ label: "Excluir", action: onDelete, danger: true });

    menu.innerHTML = items.map((it, i) =>
      `<button class="sc-menu-item${it.danger ? " danger" : ""}" data-idx="${i}" role="menuitem">${it.label}</button>`
    ).join("");
    document.body.appendChild(menu);

    const r = anchor.getBoundingClientRect();
    const mw = menu.offsetWidth;
    let left = r.right - mw;
    if (left < 8) left = 8;
    if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
    menu.style.top  = `${r.bottom + 6 + window.scrollY}px`;
    menu.style.left = `${left + window.scrollX}px`;

    const close = () => {
      menu.remove();
      anchor.setAttribute("aria-expanded", "false");
      document.removeEventListener("click", onDoc, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
    const onDoc = (e) => { if (!menu.contains(e.target) && e.target !== anchor) close(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    setTimeout(() => {
      document.addEventListener("click", onDoc, true);
      document.addEventListener("keydown", onKey);
      window.addEventListener("resize", close);
      window.addEventListener("scroll", close, true);
    }, 0);
    menu.querySelectorAll(".sc-menu-item").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const it = items[parseInt(b.dataset.idx, 10)];
        close();
        if (it && typeof it.action === "function") it.action();
      });
    });
  },

  sheet(sh) {
    const titulo = sh.titulo || sh.title || "Folha";
    const data = sh.dataFormatada || sh.date || "";
    const topicos = Array.isArray(sh.topicos)
      ? sh.topicos
      : Array.isArray(sh.topics)
        ? sh.topics
        : [];
    const nivelLabel = sh.nivelLabel || "";
    const isFav = !!sh.favorita;
    const subjectId = sh.subjectId;
    const onFavorite = sh.onFavorite;
    const onDelete = sh.onDelete;
    const onDownload = sh.onDownload;

    const delIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    const dlPdfIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><text x="7" y="18" font-family="Arial" font-size="6" font-weight="bold" fill="currentColor" stroke="none">PDF</text></svg>`;
    const dlDocIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><text x="6" y="18" font-family="Arial" font-size="6" font-weight="bold" fill="currentColor" stroke="none">DOC</text></svg>`;
    const kebabIcon = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;

    const btn = document.createElement("button");
    btn.className = "sheet-card-item";
    btn.innerHTML = `
      <div class="sc-icon">${CardIcons.sheet}</div>
      <div class="sc-info">
        <div class="sc-title">${titulo}</div>
        <div class="sc-meta">
          ${data ? `<span class="sc-date">${data}</span>` : ""}
          ${topicos.length ? `<span class="sc-topics">&middot; ${topicos.length} tópico${topicos.length !== 1 ? "s" : ""}</span>` : ""}
          ${nivelLabel ? `<span class="sc-nivel">${nivelLabel}</span>` : ""}
        </div>
      </div>
      <div class="sc-actions">
        <button class="fav-btn sc-desktop ${isFav ? "on" : ""}" title="${isFav ? "Remover favorito" : "Favoritar"}">
          ${isFav ? CardIcons.starFill : CardIcons.star}
        </button>
        ${onDownload ? `<button class="dl-btn sc-desktop" data-format="pdf" title="Baixar PDF">${dlPdfIcon}</button>` : ""}
        ${onDownload ? `<button class="dl-btn sc-desktop" data-format="doc" title="Baixar DOC">${dlDocIcon}</button>` : ""}
        ${onDelete ? `<button class="del-btn sc-desktop" title="Apagar folha">${delIcon}</button>` : ""}
        <svg class="sc-arr sc-desktop" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="var(--text-light)" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <button class="sc-kebab" title="Mais opções" aria-haspopup="menu" aria-expanded="false">${kebabIcon}</button>
      </div>`;

    const favBtn = btn.querySelector(".fav-btn");
    if (favBtn && onFavorite) {
      favBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        onFavorite();
      });
    }

    const delBtn = btn.querySelector(".del-btn");
    if (delBtn && onDelete) {
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        onDelete();
      });
    }

    btn.querySelectorAll(".dl-btn").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (onDownload) onDownload(b.dataset.format);
      });
    });

    const kebab = btn.querySelector(".sc-kebab");
    if (kebab) {
      kebab.addEventListener("click", (e) => {
        e.stopPropagation();
        Card._openSheetMenu(kebab, { isFav, onFavorite, onDownload, onDelete });
      });
    }

    btn.addEventListener("click", () =>
      Router.go("materia", { subjectId, sheetId: sh.id, viewSheet: true }),
    );
    return btn;
  },

  _openSheetMenu(anchor, { isFav, onFavorite, onDownload, onDelete }) {
    const existing = document.querySelector(".sc-menu");
    if (existing) {
      existing.remove();
      if (
        existing.dataset.anchorId &&
        existing.dataset.anchorId === anchor.dataset.menuId
      ) {
        anchor.setAttribute("aria-expanded", "false");
        return;
      }
    }

    const menuId = "kb_" + Date.now().toString(36);
    anchor.dataset.menuId = menuId;
    anchor.setAttribute("aria-expanded", "true");

    const menu = document.createElement("div");
    menu.className = "sc-menu";
    menu.dataset.anchorId = menuId;
    menu.setAttribute("role", "menu");

    const items = [];
    if (onFavorite)
      items.push({
        label: isFav ? "Remover favorito" : "Favoritar",
        action: onFavorite,
      });
    if (onDownload)
      items.push({ label: "Baixar PDF", action: () => onDownload("pdf") });
    if (onDownload)
      items.push({ label: "Baixar DOC", action: () => onDownload("doc") });
    if (onDelete)
      items.push({ label: "Excluir", action: onDelete, danger: true });

    menu.innerHTML = items
      .map(
        (it, i) =>
          `<button class="sc-menu-item${it.danger ? " danger" : ""}" data-idx="${i}" role="menuitem">${it.label}</button>`,
      )
      .join("");

    document.body.appendChild(menu);

    const r = anchor.getBoundingClientRect();
    const menuWidth = menu.offsetWidth;
    const vw = window.innerWidth;
    let left = r.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > vw - 8) left = vw - menuWidth - 8;
    menu.style.top = `${r.bottom + 6 + window.scrollY}px`;
    menu.style.left = `${left + window.scrollX}px`;

    const close = () => {
      menu.remove();
      anchor.setAttribute("aria-expanded", "false");
      document.removeEventListener("click", onDoc, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };

    const onDoc = (e) => {
      if (!menu.contains(e.target) && e.target !== anchor) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };

    setTimeout(() => {
      document.addEventListener("click", onDoc, true);
      document.addEventListener("keydown", onKey);
      window.addEventListener("resize", close);
      window.addEventListener("scroll", close, true);
    }, 0);

    menu.querySelectorAll(".sc-menu-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx, 10);
        const it = items[idx];
        close();
        if (it && typeof it.action === "function") it.action();
      });
    });
  },

  topicRow({ txt, on = true, index, aviso = null, onToggle, onRemove }) {
    const row = document.createElement("div");
    row.className = "topic-row" + (aviso ? " topic-row--warn" : "");
    row.style.animationDelay = `${index * 0.06}s`;

    row.innerHTML = `
      <div class="tchk ${on ? "on" : ""}">${on ? CardIcons.check : ""}</div>
      <span class="ttxt">${txt}</span>
      <button class="trem" title="Remover">${CardIcons.close}</button>`;

    if (aviso) {
      const warn = document.createElement("div");
      warn.className = "topic-warn";
      warn.innerHTML = `<span class="topic-warn-icon" style="display:inline-flex;vertical-align:middle;width:14px;height:14px">${CardIcons.warn}</span> ${aviso}`;
      row.appendChild(warn);
    }

    const chk = row.querySelector(".tchk");
    chk.addEventListener("click", () => {
      if (onToggle) onToggle(index, chk);
    });

    const rem = row.querySelector(".trem");
    rem.addEventListener("click", () => onRemove && onRemove(index));

    return row;
  },
};
