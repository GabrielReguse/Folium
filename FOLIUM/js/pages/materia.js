/* ═══════════════════════════════════════
   FOLIUM — pages/materia.js
   Lista de folhas de uma matéria
   + visualização de folha individual
═══════════════════════════════════════ */

const MateriaPage = {
  subject: null,
  sheet:   null,

  init() {
    if (!Router.requireAuth()) return;

    const subjectId = Storage.getContext('subjectId');
    const sheetId   = Storage.getContext('sheetId');
    const viewSheet = Storage.getContext('viewSheet');

    const subjects = Storage.getSubjects();
    this.subject = subjects.find(s => s.id === subjectId) || null;

    if (!this.subject) { Router.go('folhas'); return; }

    if (viewSheet && sheetId) {
      this.sheet = this.subject.folhas.find(f => f.id === sheetId) || null;
      if (!this.sheet) { this._renderSheetList(); return; }
      this._renderSheetView();
    } else {
      this._renderSheetList();
    }
  },

  /* ── Lista de folhas da matéria ── */
  _renderSheetList() {
    Storage.clearContext('sheetId');
    Storage.clearContext('viewSheet');

    Navbar.renderTop({
      backRoute: 'folhas',
      backLabel: 'Matérias',
      title: `<em>${this.subject.nomeNormalizado}</em>`
    });

    const body = DOM.$('#materia-body');
    if (!body) return;

    /* FIX: limpa antes de renderizar para evitar duplicação em re-renders */
    DOM.clear(body);

    /* Ordenação: favoritas primeiro, depois por data decrescente */
    const folhas = [...this.subject.folhas].sort((a, b) =>
      (b.favorita ? 1 : 0) - (a.favorita ? 1 : 0) ||
      new Date(b.criadaEm) - new Date(a.criadaEm)
    );

    const lbl = document.createElement('p');
    lbl.className = 't-label mb-16';
    lbl.textContent = `${folhas.length} folha${folhas.length !== 1 ? 's' : ''}`;
    body.appendChild(lbl);

    if (!folhas.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <div class="ei"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%;stroke:var(--rose-mid)" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></div>
        <h3>Nenhuma folha aqui</h3>
        <p>Crie uma folha para esta matéria.</p>`;
      body.appendChild(empty);
      return;
    }

    folhas.forEach((sh, i) => {
      const card = Card.sheet({
        ...sh,
        subjectId:  this.subject.id,
        onFavorite: () => this._toggleFavorite(sh.id),
      });
      card.style.animationDelay = `${i * 0.07}s`;
      card.classList.add('au');
      body.appendChild(card);
    });
  },

  /* ── Alternar favorito de uma folha ── */
  _toggleFavorite(sheetId) {
    const subjects = Storage.getSubjects();
    const subj = subjects.find(s => s.id === this.subject.id);
    if (!subj) return;

    const folha = subj.folhas.find(f => f.id === sheetId);
    if (!folha) return;

    folha.favorita = !folha.favorita;
    Storage.setSubjects(subjects);

    this.subject = subj;
    this._renderSheetList();   /* DOM.clear está dentro — sem duplicação */
  },

  /* ── Visualização completa da folha ── */
  _renderSheetView() {
    history.pushState({ foliumSheet: true }, '', window.location.href);
    Navbar.renderTop({
      backRoute: null,
      backLabel: null,
      title: `<em>${this.subject.nomeNormalizado}</em>`
    });

    /* Injeta botão de voltar na navbar */
    const nav = DOM.$('.top-nav');
    if (nav) {
      const wrapper = nav.firstElementChild;
      if (wrapper) {
        const backBtn = document.createElement('button');
        backBtn.className = 'nav-back';
        backBtn.textContent = `‹ ${this.subject.nomeNormalizado}`;
        backBtn.addEventListener('click', () => {
          /* FIX nav circular: limpa contexto ANTES de navegar */
          Storage.clearContext('sheetId');
          Storage.clearContext('viewSheet');
          Router.go('materia', { subjectId: this.subject.id });
        });
        DOM.clear(wrapper);
        wrapper.appendChild(backBtn);
      }
    }

    const body = DOM.$('#materia-body');
    if (!body) return;

    /* FIX: limpa antes de renderizar */
    DOM.clear(body);

    const isFav = !!this.sheet.favorita;

    const header = document.createElement('div');
    header.className = 'sheet-view-header';
    header.innerHTML = `
      <div class="shv-badges">
        <span class="badge badge-accent">${this.subject.nomeNormalizado}</span>
        ${this.sheet.nivelLabel ? `<span class="badge badge-nivel">${this.sheet.nivelLabel}</span>` : ''}
        <button class="fav-btn-header ${isFav ? 'on' : ''}" id="fav-header-btn"
                title="${isFav ? 'Remover favorito' : 'Favoritar'}">
          ${isFav ? '<svg viewBox="0 0 24 24" fill="#f5a623" stroke="#f5a623" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px;stroke:var(--text-light)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'}
        </button>
      </div>
      <h2 class="t-section" style="margin-top:10px;margin-bottom:6px">${this.sheet.titulo}</h2>
      <p class="t-sub">Criada em ${this.sheet.dataFormatada} · ${this.sheet.topicos.length} tópico${this.sheet.topicos.length !== 1 ? 's' : ''}</p>`;
    body.appendChild(header);

    /* Bind do botão de favoritar no header */
    const favBtn = header.querySelector('#fav-header-btn');
    if (favBtn) {
      favBtn.addEventListener('click', () => {
        const subjects = Storage.getSubjects();
        const subj = subjects.find(s => s.id === this.subject.id);
        if (!subj) return;
        const folha = subj.folhas.find(f => f.id === this.sheet.id);
        if (!folha) return;
        folha.favorita = !folha.favorita;
        Storage.setSubjects(subjects);
        this.sheet.favorita = folha.favorita;
        favBtn.innerHTML = folha.favorita ? '<svg viewBox="0 0 24 24" fill="#f5a623" stroke="#f5a623" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px;stroke:var(--text-light)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        favBtn.classList.toggle('on', folha.favorita);
        favBtn.title = folha.favorita ? 'Remover favorito' : 'Favoritar';
      });
    }

    /* Container filho exclusivo para o AI2 — NÃO é o body */
    const contentDiv = document.createElement('div');
    contentDiv.className = 'sheet-view-body';
    body.appendChild(contentDiv);

    /* Renderiza conteúdo da folha */
    if (this.sheet.resultado) {
      /* AI2.renderFolha limpa contentDiv (não body) — header preservado */
      AI2.renderFolha(
        contentDiv,
        this.subject.nomeNormalizado,
        this.sheet.tema,
        this.sheet.nivel,
        this.sheet.resultado,
        false   /* showHeader=false — header já renderizado acima */
      );
    } else {
      /* Folha antiga sem resultado estruturado */
      this.sheet.topicos.forEach(tp => {
        const sec = document.createElement('div');
        sec.className = 'sh-section';
        sec.innerHTML = `<h3 class="t-topic">${tp}</h3>
          <p class="sh-explain t-sub">Conteúdo não disponível — esta folha foi salva sem o resultado completo da IA.</p>`;
        contentDiv.appendChild(sec);
      });
    }

    const spacer = document.createElement('div');
    spacer.style.height = '40px';
    body.appendChild(spacer);
  }
};

document.addEventListener('DOMContentLoaded', () => MateriaPage.init());