/* ════════════════════════════════════════════════════════════════
   FOLIUM — pages/suporte.js (redesign)
   Gerencia FAQ accordion, filtros por categoria, busca e navegação
   dos topic cards para a seção correspondente.
   ════════════════════════════════════════════════════════════════ */

const SuportePage = {
  /* estado */
  state: {
    filter: 'todas',
    query:  '',
  },

  init() {
    if (!Router.requireAuth()) return;

    // Top nav padronizado (título personalizado)
    Navbar.renderTop({ title: '<em>Central de Ajuda</em>' });
    Navbar.renderBottom('suporte');
    Sidebar.init();

    this._bindFAQ();
    this._bindChips();
    this._bindSearch();
    this._bindTopicCards();
    this._bindQuickIdeas();
    this._updateTopicCounts();
    this._apply();
  },

  /* ───────── FAQ accordion ───────── */
  _bindFAQ() {
    DOM.$$('.sup-faq .sup-faq__q').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.sup-faq');
        this._toggleFaq(item);
      });
    });
  },

  _toggleFaq(item) {
    const wasOpen = item.classList.contains('open');
    DOM.$$('.sup-faq.open').forEach(el => {
      el.classList.remove('open');
      const q = el.querySelector('.sup-faq__q');
      if (q) q.setAttribute('aria-expanded', 'false');
    });
    if (!wasOpen) {
      item.classList.add('open');
      const q = item.querySelector('.sup-faq__q');
      if (q) q.setAttribute('aria-expanded', 'true');
    }
  },

  /* ───────── Chips (filtro por categoria) ───────── */
  _bindChips() {
    DOM.$$('.sup-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        DOM.$$('.sup-chip').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-selected', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-selected', 'true');
        this.state.filter = chip.dataset.filter || 'todas';
        this._apply();
      });
    });
  },

  /* ───────── Busca ───────── */
  _bindSearch() {
    const input = document.getElementById('sup-search-input');
    const clear = document.getElementById('sup-search-clear');
    if (!input) return;

    input.addEventListener('input', () => {
      this.state.query = (input.value || '').trim().toLowerCase();
      if (this.state.query && clear) clear.hidden = false;
      else if (clear) clear.hidden = true;
      this._apply();
    });

    if (clear) {
      clear.addEventListener('click', () => {
        input.value = '';
        this.state.query = '';
        clear.hidden = true;
        input.focus();
        this._apply();
      });
    }

    // Empty-state: limpar filtros
    const emptyClear = document.getElementById('sup-empty-clear');
    if (emptyClear) {
      emptyClear.addEventListener('click', () => {
        input.value = '';
        this.state.query = '';
        this.state.filter = 'todas';
        if (clear) clear.hidden = true;
        DOM.$$('.sup-chip').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-selected', 'false');
        });
        const allChip = document.querySelector('.sup-chip[data-filter="todas"]');
        if (allChip) {
          allChip.classList.add('active');
          allChip.setAttribute('aria-selected', 'true');
        }
        this._apply();
      });
    }
  },

  submitSearch() {
    // Submit não faz nada especial (o input já filtra ao digitar);
    // apenas rola até a lista FAQ pra dar feedback.
    const list = document.getElementById('sup-faq-list');
    if (list) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  /* ───────── Topic cards ───────── */
  _bindTopicCards() {
    DOM.$$('.sup-topic').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.dataset.scroll;
        if (!cat) return;

        if (cat === 'contato') {
          const el = document.getElementById('contato');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }

        // Aplica filtro na chip correspondente
        this.state.filter = cat;
        this.state.query = '';
        const input = document.getElementById('sup-search-input');
        if (input) input.value = '';
        const clear = document.getElementById('sup-search-clear');
        if (clear) clear.hidden = true;

        DOM.$$('.sup-chip').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-selected', 'false');
        });
        const chip = document.querySelector(`.sup-chip[data-filter="${cat}"]`);
        if (chip) {
          chip.classList.add('active');
          chip.setAttribute('aria-selected', 'true');
        }
        this._apply();

        // rola até a lista
        const list = document.getElementById('sup-faq-list');
        if (list) {
          list.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  },

  /* ───────── Quick ideas (chips "Tente:") ───────── */
  _bindQuickIdeas() {
    DOM.$$('.sup-qi').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = btn.dataset.q || '';
        const input = document.getElementById('sup-search-input');
        if (input) {
          input.value = q;
          input.focus();
        }
        this.state.query = q.toLowerCase();
        // reset filter para 'todas' para que o termo busque em todas as
        // categorias, e não só na categoria atualmente selecionada.
        this.state.filter = 'todas';
        const clear = document.getElementById('sup-search-clear');
        if (clear) clear.hidden = !q;
        DOM.$$('.sup-chip').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-selected', 'false');
        });
        const allChip = document.querySelector('.sup-chip[data-filter="todas"]');
        if (allChip) {
          allChip.classList.add('active');
          allChip.setAttribute('aria-selected', 'true');
        }
        this._apply();
        const list = document.getElementById('sup-faq-list');
        if (list) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  },

  /* ───────── Atualiza contadores dos topic cards ───────── */
  _updateTopicCounts() {
    const cats = ['primeiros-passos', 'ia-resumos', 'conta-dados'];
    cats.forEach(cat => {
      const count = document.querySelectorAll(`.sup-faq[data-cat="${cat}"]`).length;
      const el = document.querySelector(`[data-count="${cat}"]`);
      if (el) el.textContent = `${count} ${count === 1 ? 'guia' : 'guias'}`;
    });
  },

  /* ───────── Aplica filtro + busca atual ───────── */
  _apply() {
    const { filter, query } = this.state;
    let visible = 0;

    DOM.$$('.sup-faq').forEach(item => {
      const matchCat = filter === 'todas' || item.dataset.cat === filter;
      const txt = (
        (item.querySelector('.sup-faq__t')?.textContent || '') + ' ' +
        (item.dataset.terms || '') + ' ' +
        (item.querySelector('.sup-faq__a')?.textContent || '')
      ).toLowerCase();
      const matchQuery = !query || txt.includes(query);

      const show = matchCat && matchQuery;
      item.classList.toggle('hidden', !show);
      if (show) visible++;
      // fecha itens escondidos
      if (!show && item.classList.contains('open')) {
        item.classList.remove('open');
        const q = item.querySelector('.sup-faq__q');
        if (q) q.setAttribute('aria-expanded', 'false');
      }
    });

    // contador
    const countEl = document.getElementById('sup-visible-count');
    if (countEl) countEl.textContent = String(visible);
    const pluralEl = document.getElementById('sup-visible-plural');
    if (pluralEl) pluralEl.textContent = visible === 1 ? '' : 's';

    // empty state
    const empty = document.getElementById('sup-empty');
    if (empty) empty.hidden = visible !== 0;
  },
};

document.addEventListener('DOMContentLoaded', () => SuportePage.init());
