/* ═══════════════════════════════════════
   FOLIUM — pages/folhas.js
   Biblioteca pessoal: matérias, recentes, favoritas.
   Animações: hero/toolbar entram com fadeUp,
   stats fazem count-up, cards sobem em stagger.
═══════════════════════════════════════ */

const FolhasPage = {
  /* estado: 'subjects' | 'recent' | 'fav' */
  _tab:        'subjects',
  _query:      '',
  _subjects:   [],
  /* Controla se já rodou a animação de entrada da página
     (hero/toolbar fadeUp + count-up) — trocar de aba só
     reanima os cards, não o hero. */
  _heroAnimated: false,

  init() {
    if (!Router.requireAuth()) return;

    Navbar.renderTop({ title: '<em>Minhas Folhas</em>' });
    Navbar.renderBottom('folhas');
    Sidebar.init();

    this._subjects = Storage.getSubjects() || [];
    this._heroAnimated = false;
    this._buildShell();
    this._renderContent();
    this._runEntryAnimations();
  },

  /* ═══════════════════════════════════════
     ENTRY ANIMATIONS — count-up nos stats
     (cards animam dentro de _renderContent)
  ═══════════════════════════════════════ */
  _runEntryAnimations() {
    if (this._heroAnimated) return;
    this._heroAnimated = true;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll('.fh-stat-num').forEach((el) => {
      const target = parseInt(el.dataset.target || el.textContent, 10) || 0;
      el.textContent = '0';
      // delay para começar depois do fadeUp do hero terminar
      setTimeout(() => this._countUp(el, target), 260);
    });
  },

  _countUp(el, target) {
    if (target <= 0) { el.textContent = '0'; return; }
    // Ease out-cubic — sensação de chegada suave no valor final.
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

  /* ─────────────────────────────────────────
     SHELL — hero + toolbar + container
  ───────────────────────────────────────── */
  _buildShell() {
    const page = DOM.$('.page-folhas');
    if (!page) return;

    /* limpa qualquer conteúdo prévio (re-render) */
    let body = page.querySelector('.folhas-body');
    if (body) DOM.clear(body);
    else {
      body = document.createElement('div');
      body.className = 'folhas-body page-body';
      page.appendChild(body);
    }

    const shell = document.createElement('div');
    shell.className = 'fh-shell';

    shell.appendChild(this._buildHero());
    shell.appendChild(this._buildToolbar());

    const content = document.createElement('div');
    content.className = 'fh-content';
    content.id = 'fh-content';
    shell.appendChild(content);

    body.appendChild(shell);
  },

  _buildHero() {
    const totals = this._getTotals();

    const hero = document.createElement('section');
    hero.className = 'fh-hero au';
    hero.innerHTML = `
      <span class="fh-eyebrow">Biblioteca pessoal</span>
      <h1 class="fh-title">Sua <em>biblioteca</em> de folhas</h1>
      <p class="fh-lede">
        Revise seus resumos organizados por matéria, encontre o que precisa
        em segundos e retome os estudos de onde parou.
      </p>

      <div class="fh-stats" role="list">
        <div class="fh-stat" role="listitem">
          <div class="fh-stat-num" data-target="${totals.sheets}">${totals.sheets}</div>
          <div class="fh-stat-lbl">Folhas</div>
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
    const bar = document.createElement('section');
    bar.className = 'fh-toolbar au au1';
    bar.innerHTML = `
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

      <div class="fh-tabs" role="tablist">
        <button class="fh-tab" role="tab" data-tab="subjects">Matérias</button>
        <button class="fh-tab" role="tab" data-tab="recent">Recentes</button>
        <button class="fh-tab" role="tab" data-tab="fav">Favoritas</button>
      </div>

      <button class="btn btn-primary fh-cta" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="width:16px;height:16px">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>Criar folha</span>
      </button>
    `;

    bar.querySelector('.fh-cta').addEventListener('click', () => Router.go('criar'));

    bar.querySelectorAll('.fh-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this._tab = btn.dataset.tab;
        this._renderContent();
      });
    });

    const input = bar.querySelector('#fh-search-input');
    input.addEventListener('input', (e) => {
      this._query = (e.target.value || '').trim().toLowerCase();
      this._renderContent();
    });

    return bar;
  },

  _syncTabs() {
    document.querySelectorAll('.fh-tab').forEach(t => {
      const isActive = t.dataset.tab === this._tab;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  },

  /* ─────────────────────────────────────────
     CONTEÚDO por aba
  ───────────────────────────────────────── */
  _renderContent() {
    this._syncTabs();
    const box = DOM.$('#fh-content');
    if (!box) return;
    DOM.clear(box);

    if (!this._subjects.length) {
      box.appendChild(this._emptyStateGlobal());
      return;
    }

    if (this._tab === 'subjects') return this._renderSubjects(box);
    if (this._tab === 'recent')   return this._renderRecent(box);
    if (this._tab === 'fav')      return this._renderFavorites(box);
  },

  /* ───── Aba 1: Matérias ───── */
  _renderSubjects(box) {
    const q = this._query;
    const list = this._subjects.filter(s =>
      !q || (s.nomeNormalizado || '').toLowerCase().includes(q) ||
            (s.folhas || []).some(f =>
              (f.titulo || '').toLowerCase().includes(q) ||
              (f.tema   || '').toLowerCase().includes(q)
            )
    );

    const header = document.createElement('div');
    header.className = 'fh-section-head au au2';
    header.innerHTML = `
      <div>
        <span class="t-label">Matérias</span>
        <h2 class="fh-section-title">Organizadas por tema</h2>
      </div>
      <span class="fh-count">${list.length}</span>
    `;
    box.appendChild(header);

    if (!list.length) {
      box.appendChild(this._emptyStateFiltered('Nenhuma matéria encontrada.'));
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'fh-grid';
    list.forEach((s, i) => {
      const card = Card.subject(s);
      this._staggerCard(card, i);
      grid.appendChild(card);
    });
    box.appendChild(grid);
  },

  /* ───── Aba 2: Recentes ───── */
  _renderRecent(box) {
    const flat = this._flattenSheets();
    flat.sort((a, b) =>
      new Date(b.folha.criadaEm || 0) - new Date(a.folha.criadaEm || 0)
    );

    const list = this._filterFlat(flat).slice(0, 30);

    const header = document.createElement('div');
    header.className = 'fh-section-head au au2';
    header.innerHTML = `
      <div>
        <span class="t-label">Últimas atividades</span>
        <h2 class="fh-section-title">Folhas recentes</h2>
      </div>
      <span class="fh-count">${list.length}</span>
    `;
    box.appendChild(header);

    if (!list.length) {
      box.appendChild(this._emptyStateFiltered('Nada por aqui ainda.'));
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'fh-list';
    list.forEach((entry, i) => {
      const card = this._makeSheetCard(entry);
      this._staggerCard(card, i);
      wrap.appendChild(card);
    });
    box.appendChild(wrap);
  },

  /* ───── Aba 3: Favoritas ───── */
  _renderFavorites(box) {
    const flat = this._flattenSheets().filter(e => e.folha.favorita);
    flat.sort((a, b) =>
      new Date(b.folha.criadaEm || 0) - new Date(a.folha.criadaEm || 0)
    );

    const list = this._filterFlat(flat);

    const header = document.createElement('div');
    header.className = 'fh-section-head au au2';
    header.innerHTML = `
      <div>
        <span class="t-label">Guardadas por você</span>
        <h2 class="fh-section-title">Folhas favoritas</h2>
      </div>
      <span class="fh-count">${list.length}</span>
    `;
    box.appendChild(header);

    if (!list.length) {
      box.appendChild(this._emptyStateFiltered(
        'Favorite folhas para encontrá-las rapidamente aqui.'
      ));
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'fh-list';
    list.forEach((entry, i) => {
      const card = this._makeSheetCard(entry);
      this._staggerCard(card, i);
      wrap.appendChild(card);
    });
    box.appendChild(wrap);
  },

  /* Aplica fadeUp em stagger nos cards (após o hero/toolbar terem entrado).
     Mesmo padrão de materia.js — base 0.18s + i * 0.05s. */
  _staggerCard(card, i) {
    if (!card) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    card.classList.add('au');
    card.style.animationDelay = `${0.18 + i * 0.05}s`;
  },

  /* ─────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────── */
  _flattenSheets() {
    const out = [];
    (this._subjects || []).forEach(subject => {
      (subject.folhas || []).forEach(folha => {
        out.push({ subject, folha });
      });
    });
    return out;
  },

  _filterFlat(flat) {
    const q = this._query;
    if (!q) return flat;
    return flat.filter(({ subject, folha }) =>
      (folha.titulo  || '').toLowerCase().includes(q) ||
      (folha.tema    || '').toLowerCase().includes(q) ||
      (subject.nomeNormalizado || '').toLowerCase().includes(q)
    );
  },

  _makeSheetCard({ subject, folha }) {
    const card = Card.sheet({
      ...folha,
      subjectId:  subject.id,
      onFavorite: () => this._toggleFavorite(subject.id, folha.id),
      onDelete:   () => this._deleteSheet(subject.id, folha.id),
    });

    /* rótulo com a matéria — contexto visual */
    const meta = card.querySelector('.sc-meta');
    if (meta) {
      const tag = document.createElement('span');
      tag.className = 'sc-subject-tag';
      tag.textContent = subject.nomeNormalizado || 'Matéria';
      meta.insertBefore(tag, meta.firstChild);
    }

    return card;
  },

  _toggleFavorite(subjectId, sheetId) {
    const subjects = Storage.getSubjects();
    const s = subjects.find(x => x.id === subjectId);
    if (!s) return;
    const f = (s.folhas || []).find(x => x.id === sheetId);
    if (!f) return;
    f.favorita = !f.favorita;
    Storage.setSubjects(subjects);
    this._subjects = subjects;
    this._renderContent();
    this._refreshHeroStats();
  },

  _deleteSheet(subjectId, sheetId) {
    const subjects = Storage.getSubjects();
    const subj = subjects.find(x => x.id === subjectId);
    if (!subj) return;
    const folha = (subj.folhas || []).find(x => x.id === sheetId);
    const title = folha?.titulo || 'esta folha';

    const run = () => {
      const all = Storage.getSubjects();
      const s = all.find(x => x.id === subjectId);
      if (!s) return;
      s.folhas = (s.folhas || []).filter(x => x.id !== sheetId);
      /* Matéria sem folhas — remove também, espelhando materia.js */
      const next = s.folhas.length ? all : all.filter(x => x.id !== subjectId);
      Storage.setSubjects(next);
      this._subjects = next;
      this._renderContent();
      this._refreshHeroStats();
    };

    if (typeof Confirm !== 'undefined' && typeof Confirm.show === 'function') {
      Confirm.show({
        title:        'Apagar folha?',
        text:         `"${title}" será removida permanentemente.`,
        confirmLabel: 'Apagar',
        onConfirm:    run,
      });
    } else if (window.confirm(`Apagar "${title}"?`)) {
      run();
    }
  },

  _refreshHeroStats() {
    const totals = this._getTotals();
    const nums = document.querySelectorAll('.fh-stats .fh-stat-num');
    if (nums.length >= 3) {
      nums[0].textContent = totals.sheets;
      nums[1].textContent = totals.subjects;
      nums[2].textContent = totals.favorites;
    }
  },

  _getTotals() {
    const subjects = this._subjects || [];
    let sheets = 0, favorites = 0;
    subjects.forEach(s => {
      const fs = s.folhas || [];
      sheets    += fs.length;
      favorites += fs.filter(f => f.favorita).length;
    });
    return { sheets, subjects: subjects.length, favorites };
  },

  /* ─────────────────────────────────────────
     EMPTY STATES
  ───────────────────────────────────────── */
  _emptyStateGlobal() {
    const el = document.createElement('div');
    el.className = 'fh-empty fh-empty-global au au2';
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
    el.querySelector('.fh-empty-cta').addEventListener('click', () => Router.go('criar'));
    return el;
  },

  _emptyStateFiltered(message) {
    const el = document.createElement('div');
    el.className = 'fh-empty fh-empty-filtered au au3';
    el.innerHTML = `
      <div class="fh-empty-dot" aria-hidden="true"></div>
      <p class="fh-empty-sub">${message}</p>
    `;
    return el;
  },
};

document.addEventListener('DOMContentLoaded', () => FolhasPage.init());
