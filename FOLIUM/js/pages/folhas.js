const FolhasPage = {
  _tab: "subjects",
  _type: "folhas", // "folhas" | "mapas"
  _query: "",
  _subjects: [],
  _heroAnimated: false,

  init() {
    if (!Router.requireAuth()) return;

    Navbar.renderTop({ title: "<em>Minha Biblioteca</em>" });
    Navbar.renderBottom("folhas");
    Sidebar.init();

    this._subjects = Storage.getSubjects() || [];

    // Restore active type from navigation context (e.g. from mapa save or materia back)
    const libTab = Storage.getContext("libTab");
    if (libTab === "mapas") this._type = "mapas";
    Storage.clearContext("libTab");

    this._heroAnimated = false;
    this._buildShell();
    this._renderContent();
    this._runEntryAnimations();
  },

  _runEntryAnimations() {
    if (this._heroAnimated) return;
    this._heroAnimated = true;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.querySelectorAll(".fh-stat-num").forEach((el) => {
      const target = parseInt(el.dataset.target || el.textContent, 10) || 0;
      el.textContent = "0";
      setTimeout(() => this._countUp(el, target), 260);
    });
  },

  _countUp(el, target) {
    if (target <= 0) { el.textContent = "0"; return; }
    const duration = 1200;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = Math.round(target * ease(t));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  _buildShell() {
    const page = DOM.$(".page-folhas");
    if (!page) return;

    let body = page.querySelector(".folhas-body");
    if (body) DOM.clear(body);
    else {
      body = document.createElement("div");
      body.className = "folhas-body page-body";
      page.appendChild(body);
    }

    const shell = document.createElement("div");
    shell.className = "fh-shell";

    shell.appendChild(this._buildHero());
    shell.appendChild(this._buildToolbar());

    const content = document.createElement("div");
    content.className = "fh-content";
    content.id = "fh-content";
    shell.appendChild(content);

    body.appendChild(shell);
  },

  _buildHero() {
    const totals = this._getTotals();

    const hero = document.createElement("section");
    hero.className = "fh-hero au";
    hero.innerHTML = `
      <span class="fh-eyebrow">Biblioteca pessoal</span>
      <h1 class="fh-title">Sua <em>biblioteca</em> de folhas e mapas</h1>
      <p class="fh-lede">
        Revise seus resumos e mapas mentais organizados por matéria,
        encontre o que precisa em segundos e retome os estudos de onde parou.
      </p>

      <div class="fh-stats" role="list">
        <div class="fh-stat" role="listitem">
          <div class="fh-stat-num" data-target="${totals.sheets}">${totals.sheets}</div>
          <div class="fh-stat-lbl">Folhas</div>
        </div>
        <div class="fh-stat" role="listitem">
          <div class="fh-stat-num" data-target="${totals.mapas}">${totals.mapas}</div>
          <div class="fh-stat-lbl">Mapas</div>
        </div>
        <div class="fh-stat" role="listitem">
          <div class="fh-stat-num" data-target="${totals.subjects}">${totals.subjects}</div>
          <div class="fh-stat-lbl">Matérias</div>
        </div>
        <div class="fh-stat" role="listitem">
          <div class="fh-stat-num" data-target="${totals.favorites}">${totals.favorites}</div>
          <div class="fh-stat-lbl">Favoritas</div>
        </div>
      </div>

      <svg class="fh-leaf" viewBox="0 0 120 120" aria-hidden="true"
           fill="none" stroke="currentColor" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M100 20c0 36-22 60-58 64 0-34 22-58 58-64z"/>
        <path d="M100 20C64 44 48 68 42 84"/>
      </svg>
    `;
    return hero;
  },

  _buildToolbar() {
    const bar = document.createElement("section");
    bar.className = "fh-toolbar au au1";

    const folhaSvg = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;stroke:currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>`;
    const mapaSvg = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;stroke:currentColor"><circle cx="12" cy="5" r="2"/><circle cx="4" cy="19" r="2"/><circle cx="20" cy="19" r="2"/><line x1="12" y1="7" x2="4" y2="17"/><line x1="12" y1="7" x2="20" y2="17"/></svg>`;
    const plusSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

    bar.innerHTML = `
      <!-- Type toggle pill -->
      <div class="fh-type-toggle" role="radiogroup" aria-label="Tipo de conteúdo">
        <button class="fh-type-btn active" data-type="folhas" role="radio" aria-checked="true">
          ${folhaSvg} Folhas
        </button>
        <button class="fh-type-btn" data-type="mapas" role="radio" aria-checked="false">
          ${mapaSvg} Mapas
        </button>
      </div>

      <!-- Search + CTA row -->
      <div class="fh-toolbar-main">
        <div class="fh-search">
          <svg class="fh-search-icon" viewBox="0 0 24 24" fill="none"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            id="fh-search-input"
            class="fh-search-input"
            type="search"
            autocomplete="off"
            placeholder="Buscar matéria, tema ou folha…"
            aria-label="Buscar"
          />
        </div>
        <button class="btn btn-primary fh-cta" type="button">
          ${plusSvg}
          <span>Criar folha</span>
        </button>
      </div>

      <!-- Tabs row -->
      <div class="fh-tabs" role="tablist">
        <button class="fh-tab" role="tab" data-tab="subjects">Matérias</button>
        <button class="fh-tab" role="tab" data-tab="recent">Recentes</button>
        <button class="fh-tab" role="tab" data-tab="fav">Favoritas</button>
      </div>
    `;

    // Type toggle events
    bar.querySelectorAll(".fh-type-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this._type = btn.dataset.type;
        this._renderContent();
      });
    });

    // CTA click — route depends on type
    bar.querySelector(".fh-cta").addEventListener("click", () => {
      Router.go(this._type === "mapas" ? "mapa" : "criar");
    });

    // Tab events
    bar.querySelectorAll(".fh-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        this._tab = btn.dataset.tab;
        this._renderContent();
      });
    });

    // Search input
    const input = bar.querySelector("#fh-search-input");
    input.addEventListener("input", (e) => {
      this._query = (e.target.value || "").trim().toLowerCase();
      this._renderContent();
    });

    return bar;
  },

  // ── Sync helpers ──────────────────────────────────────────

  _syncTabs() {
    document.querySelectorAll(".fh-tab").forEach((t) => {
      const isActive = t.dataset.tab === this._tab;
      t.classList.toggle("active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  },

  _syncType() {
    const shell = document.querySelector(".fh-shell");
    if (shell) {
      shell.classList.toggle("type-mapas", this._type === "mapas");
    }

    document.querySelectorAll(".fh-type-btn").forEach((btn) => {
      const isActive = btn.dataset.type === this._type;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-checked", isActive ? "true" : "false");
    });

    // CTA label + placeholder
    const ctaSpan = document.querySelector(".fh-cta span");
    if (ctaSpan) ctaSpan.textContent = this._type === "mapas" ? "Criar mapa" : "Criar folha";
    const input = document.querySelector(".fh-search-input");
    if (input) input.placeholder = this._type === "mapas"
      ? "Buscar mapa ou matéria…"
      : "Buscar matéria, tema ou folha…";
  },

  // ── Main render ───────────────────────────────────────────

  _renderContent() {
    this._syncTabs();
    this._syncType();

    const box = DOM.$("#fh-content");
    if (!box) return;
    DOM.clear(box);

    if (this._type === "folhas") {
      if (!this._subjects.length) {
        box.appendChild(this._emptyStateGlobal());
        return;
      }
      if (this._tab === "subjects") return this._renderSubjects(box);
      if (this._tab === "recent") return this._renderRecent(box);
      if (this._tab === "fav") return this._renderFavorites(box);
    } else {
      // ── Mapas mode ──
      const withMapas = this._subjects.filter((s) => (s.mapas || []).length > 0);
      if (!withMapas.length) {
        box.appendChild(this._emptyStateMapas());
        return;
      }
      if (this._tab === "subjects") return this._renderMapasSubjects(box, withMapas);
      if (this._tab === "recent") return this._renderMapasRecent(box);
      if (this._tab === "fav") return this._renderMapasFavorites(box);
    }
  },

  // ── Folhas renderers (unchanged logic) ───────────────────

  _renderSubjects(box) {
    const q = this._query;
    const list = this._subjects.filter(
      (s) =>
        !q ||
        (s.nomeNormalizado || "").toLowerCase().includes(q) ||
        (s.folhas || []).some(
          (f) =>
            (f.titulo || "").toLowerCase().includes(q) ||
            (f.tema || "").toLowerCase().includes(q),
        ),
    );

    box.appendChild(this._sectionHead("Matérias", "Organizadas por tema", list.length));

    if (!list.length) { box.appendChild(this._emptyStateFiltered("Nenhuma matéria encontrada.")); return; }

    const grid = document.createElement("div");
    grid.className = "fh-grid";
    list.forEach((s, i) => {
      const card = Card.subject(s);
      this._staggerCard(card, i);
      grid.appendChild(card);
    });
    box.appendChild(grid);
  },

  _renderRecent(box) {
    const flat = this._flattenSheets();
    flat.sort((a, b) => new Date(b.folha.criadaEm || 0) - new Date(a.folha.criadaEm || 0));
    const list = this._filterFlat(flat).slice(0, 30);

    box.appendChild(this._sectionHead("Últimas atividades", "Folhas recentes", list.length));

    if (!list.length) { box.appendChild(this._emptyStateFiltered("Nada por aqui ainda.")); return; }

    const wrap = document.createElement("div");
    wrap.className = "fh-list";
    list.forEach((entry, i) => {
      const card = this._makeSheetCard(entry);
      this._staggerCard(card, i);
      wrap.appendChild(card);
    });
    box.appendChild(wrap);
  },

  _renderFavorites(box) {
    const flat = this._flattenSheets().filter((e) => e.folha.favorita);
    flat.sort((a, b) => new Date(b.folha.criadaEm || 0) - new Date(a.folha.criadaEm || 0));
    const list = this._filterFlat(flat);

    box.appendChild(this._sectionHead("Guardadas por você", "Folhas favoritas", list.length));

    if (!list.length) {
      box.appendChild(this._emptyStateFiltered("Favorite folhas para encontrá-las rapidamente aqui."));
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "fh-list";
    list.forEach((entry, i) => {
      const card = this._makeSheetCard(entry);
      this._staggerCard(card, i);
      wrap.appendChild(card);
    });
    box.appendChild(wrap);
  },

  // ── Mapas renderers ───────────────────────────────────────

  _renderMapasSubjects(box, subjects) {
    const q = this._query;
    const list = subjects.filter(
      (s) =>
        !q ||
        (s.nomeNormalizado || "").toLowerCase().includes(q) ||
        (s.mapas || []).some((m) => (m.titulo || "").toLowerCase().includes(q)),
    );

    box.appendChild(this._sectionHead("Matérias", "Mapas por tema", list.length));

    if (!list.length) { box.appendChild(this._emptyStateFiltered("Nenhuma matéria encontrada.")); return; }

    const grid = document.createElement("div");
    grid.className = "fh-grid";
    list.forEach((s, i) => {
      const card = Card.subjectMapas(s);
      this._staggerCard(card, i);
      grid.appendChild(card);
    });
    box.appendChild(grid);
  },

  _renderMapasRecent(box) {
    const flat = this._flattenMapas();
    flat.sort((a, b) => new Date(b.criadaEm || 0) - new Date(a.criadaEm || 0));
    const list = this._filterFlatMapas(flat).slice(0, 30);

    box.appendChild(this._sectionHead("Últimas atividades", "Mapas recentes", list.length));

    if (!list.length) { box.appendChild(this._emptyStateFiltered("Nenhum mapa ainda.")); return; }

    const wrap = document.createElement("div");
    wrap.className = "fh-list";
    list.forEach((mapa, i) => {
      const card = this._makeMapCard(mapa);
      this._staggerCard(card, i);
      wrap.appendChild(card);
    });
    box.appendChild(wrap);
  },

  _renderMapasFavorites(box) {
    const flat = this._flattenMapas().filter((m) => m.favorita);
    flat.sort((a, b) => new Date(b.criadaEm || 0) - new Date(a.criadaEm || 0));
    const list = this._filterFlatMapas(flat);

    box.appendChild(this._sectionHead("Guardados por você", "Mapas favoritos", list.length));

    if (!list.length) {
      box.appendChild(this._emptyStateFiltered("Favorite mapas para encontrá-los rapidamente aqui."));
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "fh-list";
    list.forEach((mapa, i) => {
      const card = this._makeMapCard(mapa);
      this._staggerCard(card, i);
      wrap.appendChild(card);
    });
    box.appendChild(wrap);
  },

  // ── Card factories ────────────────────────────────────────

  _makeSheetCard({ subject, folha }) {
    const card = Card.sheet({
      ...folha,
      subjectId: subject.id,
      onFavorite: () => this._toggleFavorite(subject.id, folha.id),
      onDelete: () => this._deleteSheet(subject.id, folha.id),
    });

    const meta = card.querySelector(".sc-meta");
    if (meta) {
      const tag = document.createElement("span");
      tag.className = "sc-subject-tag";
      tag.textContent = subject.nomeNormalizado || "Matéria";
      meta.insertBefore(tag, meta.firstChild);
    }
    return card;
  },

  _makeMapCard(mapa) {
    return Card.mindMap({
      ...mapa,
      onFavorite: () => {
        Storage.toggleMapFavorite(mapa.subjectId, mapa.id);
        this._subjects = Storage.getSubjects();
        this._renderContent();
        this._refreshHeroStats();
      },
      onDelete: () => this._deleteMap(mapa.subjectId, mapa.id, mapa.titulo),
      onDownload: () => {
        Storage.setContext("mapaId", mapa.id);
        Storage.setContext("subjectId_mapa", mapa.subjectId);
        Storage.setContext("mapaOrigin", "biblioteca");
        Storage.setContext("downloadOnLoad", "1");
        Router.go("mapa");
      },
    });
  },

  // ── Data helpers ──────────────────────────────────────────

  _flattenSheets() {
    const out = [];
    (this._subjects || []).forEach((subject) => {
      (subject.folhas || []).forEach((folha) => out.push({ subject, folha }));
    });
    return out;
  },

  _filterFlat(flat) {
    const q = this._query;
    if (!q) return flat;
    return flat.filter(
      ({ subject, folha }) =>
        (folha.titulo || "").toLowerCase().includes(q) ||
        (folha.tema || "").toLowerCase().includes(q) ||
        (subject.nomeNormalizado || "").toLowerCase().includes(q),
    );
  },

  _flattenMapas() {
    return Storage.getMindMaps();
  },

  _filterFlatMapas(mapas) {
    const q = this._query;
    if (!q) return mapas;
    return mapas.filter(
      (m) =>
        (m.titulo || "").toLowerCase().includes(q) ||
        (m.subjectName || "").toLowerCase().includes(q),
    );
  },

  _staggerCard(card, i) {
    if (!card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    card.classList.add("au");
    card.style.animationDelay = `${0.18 + i * 0.05}s`;
  },

  _sectionHead(label, title, count) {
    const el = document.createElement("div");
    el.className = "fh-section-head au au2";
    el.innerHTML = `
      <div>
        <span class="t-label">${label}</span>
        <h2 class="fh-section-title">${title}</h2>
      </div>
      <span class="fh-count">${count}</span>
    `;
    return el;
  },

  // ── Mutations ─────────────────────────────────────────────

  _toggleFavorite(subjectId, sheetId) {
    const subjects = Storage.getSubjects();
    const s = subjects.find((x) => x.id === subjectId);
    if (!s) return;
    const f = (s.folhas || []).find((x) => x.id === sheetId);
    if (!f) return;
    f.favorita = !f.favorita;
    Storage.setSubjects(subjects);
    this._subjects = subjects;
    this._renderContent();
    this._refreshHeroStats();
  },

  _deleteSheet(subjectId, sheetId) {
    const subjects = Storage.getSubjects();
    const subj = subjects.find((x) => x.id === subjectId);
    if (!subj) return;
    const folha = (subj.folhas || []).find((x) => x.id === sheetId);
    const title = folha?.titulo || "esta folha";

    const run = () => {
      const all = Storage.getSubjects();
      const s = all.find((x) => x.id === subjectId);
      if (!s) return;
      s.folhas = (s.folhas || []).filter((x) => x.id !== sheetId);
      const next = (s.folhas.length || (s.mapas || []).length) ? all : all.filter((x) => x.id !== subjectId);
      Storage.setSubjects(next);
      this._subjects = next;
      this._renderContent();
      this._refreshHeroStats();
    };

    if (typeof Confirm !== "undefined" && typeof Confirm.show === "function") {
      Confirm.show({ title: "Apagar folha?", text: `"${title}" será removida permanentemente.`, confirmLabel: "Apagar", onConfirm: run });
    } else if (window.confirm(`Apagar "${title}"?`)) {
      run();
    }
  },

  _deleteMap(subjectId, mapaId, titulo) {
    const title = titulo || "este mapa";
    const run = () => {
      Storage.deleteMap(subjectId, mapaId);
      this._subjects = Storage.getSubjects();
      this._renderContent();
      this._refreshHeroStats();
    };

    if (typeof Confirm !== "undefined" && typeof Confirm.show === "function") {
      Confirm.show({ title: "Apagar mapa?", text: `"${title}" será removido permanentemente.`, confirmLabel: "Apagar", onConfirm: run });
    } else if (window.confirm(`Apagar "${title}"?`)) {
      run();
    }
  },

  // ── Stats ─────────────────────────────────────────────────

  _refreshHeroStats() {
    const totals = this._getTotals();
    const nums = document.querySelectorAll(".fh-stats .fh-stat-num");
    if (nums.length >= 4) {
      nums[0].textContent = totals.sheets;
      nums[1].textContent = totals.mapas;
      nums[2].textContent = totals.subjects;
      nums[3].textContent = totals.favorites;
    }
  },

  _getTotals() {
    const subjects = this._subjects || [];
    let sheets = 0, mapas = 0, favorites = 0;
    subjects.forEach((s) => {
      const fs = s.folhas || [];
      const ms = s.mapas || [];
      sheets += fs.length;
      mapas += ms.length;
      favorites += fs.filter((f) => f.favorita).length + ms.filter((m) => m.favorita).length;
    });
    return { sheets, mapas, subjects: subjects.length, favorites };
  },

  // ── Empty states ──────────────────────────────────────────

  _emptyStateGlobal() {
    const el = document.createElement("div");
    el.className = "fh-empty fh-empty-global au au2";
    el.innerHTML = `
      <div class="fh-empty-art" aria-hidden="true">
        <svg viewBox="0 0 120 120" fill="none" stroke="var(--tan)"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="28" y="22" width="64" height="82" rx="10"/>
          <line x1="40" y1="42" x2="80" y2="42"/>
          <line x1="40" y1="58" x2="80" y2="58"/>
          <line x1="40" y1="74" x2="70" y2="74"/>
        </svg>
      </div>
      <h3 class="fh-empty-title">Nenhuma folha ainda</h3>
      <p class="fh-empty-sub">
        Crie sua primeira folha de estudos e ela aparecerá aqui,
        organizada por matéria.
      </p>
      <button class="btn btn-primary fh-empty-cta" type="button">
        Criar minha primeira folha
      </button>
    `;
    el.querySelector(".fh-empty-cta").addEventListener("click", () => Router.go("criar"));
    return el;
  },

  _emptyStateMapas() {
    const el = document.createElement("div");
    el.className = "fh-empty fh-empty-global au au2";
    el.innerHTML = `
      <div class="fh-empty-art fh-empty-art--forest" aria-hidden="true">
        <svg viewBox="0 0 120 120" fill="none" stroke="var(--forest-mid, #5a8f6c)"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="60" cy="30" r="14"/>
          <circle cx="24" cy="90" r="14"/>
          <circle cx="96" cy="90" r="14"/>
          <line x1="60" y1="44" x2="24" y2="76"/>
          <line x1="60" y1="44" x2="96" y2="76"/>
        </svg>
      </div>
      <h3 class="fh-empty-title">Nenhum mapa ainda</h3>
      <p class="fh-empty-sub">
        Crie seu primeiro mapa mental e ele aparecerá aqui,
        organizado por matéria.
      </p>
      <button class="btn fh-empty-cta fh-empty-cta--forest" type="button">
        Criar meu primeiro mapa
      </button>
    `;
    el.querySelector(".fh-empty-cta").addEventListener("click", () => Router.go("mapa"));
    return el;
  },

  _emptyStateFiltered(message) {
    const el = document.createElement("div");
    el.className = "fh-empty fh-empty-filtered au au3";
    el.innerHTML = `
      <div class="fh-empty-dot" aria-hidden="true"></div>
      <p class="fh-empty-sub">${message}</p>
    `;
    return el;
  },
};

document.addEventListener("DOMContentLoaded", () => FolhasPage.init());
