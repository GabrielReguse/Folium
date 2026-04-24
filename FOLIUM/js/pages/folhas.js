/*
   FOLIUM — pages/folhas.js  (redesign)
   Lista de matérias com folhas salvas — hero + toolbar + grid
 */

const FolhasPage = {
  _subjects: [],

  init() {
    if (!Router.requireAuth()) return;
    Navbar.renderTop({ title: '<em>Minhas Folhas</em>' });
    Navbar.renderBottom('folhas');
    Sidebar.init();

    this._subjects = Storage.getSubjects() || [];
    this._renderStats();
    this._renderSubjects();
    this._bindSearch();
  },

  /* ── Stats do hero ── */
  _renderStats() {
    const subjects = this._subjects;
    const allFolhas = subjects.flatMap(s => Array.isArray(s.folhas) ? s.folhas : []);
    const totals = {
      subjects: subjects.length,
      sheets:   allFolhas.length,
      favs:     allFolhas.filter(f => f && f.favorita).length,
    };
    const setNum = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };
    setNum('fl-stat-subjects', totals.subjects);
    setNum('fl-stat-sheets',   totals.sheets);
    setNum('fl-stat-fav',      totals.favs);
  },

  /* ── Render da grid ── */
  _renderSubjects(filter = '') {
    const container = DOM.$('#subj-list');
    const toolbar   = document.getElementById('fl-toolbar');
    const noResults = document.getElementById('fl-no-results');
    if (!container) return;

    /* limpa */
    container.innerHTML = '';
    if (noResults) noResults.hidden = true;

    const subjects = this._subjects;

    /* Estado vazio principal — nenhuma matéria criada */
    if (!subjects.length) {
      if (toolbar) toolbar.hidden = true;
      container.appendChild(this._buildEmptyState());
      return;
    }

    /* Mostra a toolbar assim que houver matérias */
    if (toolbar) toolbar.hidden = false;

    /* aplica filtro */
    const term = (filter || '').trim().toLowerCase();
    const filtered = term
      ? subjects.filter(s => {
          const nome = (s.nomeNormalizado || s.name || '').toLowerCase();
          const original = (s.nomeOriginal || '').toLowerCase();
          return nome.includes(term) || original.includes(term);
        })
      : subjects;

    /* atualiza pill com contagem visível */
    const pill = document.getElementById('fl-count-pill');
    if (pill) {
      const n = filtered.length;
      pill.textContent = `${n} matéria${n !== 1 ? 's' : ''}`;
    }

    if (!filtered.length) {
      if (noResults) {
        const strong = document.getElementById('fl-no-results-term');
        if (strong) strong.textContent = `"${filter}"`;
        noResults.hidden = false;
      }
      return;
    }

    /* ordena: favoritas primeiro (se existir flag no subject), depois por
       última atividade desc */
    const byLast = (arr) => {
      if (!Array.isArray(arr) || !arr.length) return 0;
      return Math.max(...arr.map(f => {
        const d = f && (f.criadaEm || f.atualizadaEm || f.date);
        const t = d ? new Date(d).getTime() : 0;
        return Number.isNaN(t) ? 0 : t;
      }));
    };
    const sorted = [...filtered].sort((a, b) =>
      (b.favorita ? 1 : 0) - (a.favorita ? 1 : 0) ||
      byLast(b.folhas) - byLast(a.folhas)
    );

    sorted.forEach((s, i) => {
      const card = Card.subject(s);
      card.style.animationDelay = `${i * 0.06}s`;
      card.classList.add('au');
      container.appendChild(card);
    });
  },

  /* ── Empty state rico (primeira vez) ── */
  _buildEmptyState() {
    const wrap = document.createElement('div');
    wrap.className = 'fl-empty au';
    wrap.innerHTML = `
      <div class="fl-empty-ico">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
          <line x1="9" y1="17" x2="13" y2="17"/>
        </svg>
      </div>
      <h3>Nenhuma folha por aqui</h3>
      <p>Crie sua primeira folha de estudos e ela aparecerá organizada<br>por matéria, pronta pra revisar.</p>
      <button class="btn btn-primary" id="fl-empty-cta">Criar minha primeira folha</button>
    `;
    wrap.querySelector('#fl-empty-cta')?.addEventListener('click', () => {
      if (typeof Router !== 'undefined') Router.go('criar');
    });
    return wrap;
  },

  /* ── Busca ── */
  _bindSearch() {
    const input = document.getElementById('fl-search');
    if (!input) return;
    let t;
    input.addEventListener('input', (e) => {
      clearTimeout(t);
      const val = e.target.value;
      t = setTimeout(() => this._renderSubjects(val), 120);
    });
  },
};

document.addEventListener('DOMContentLoaded', () => FolhasPage.init());
