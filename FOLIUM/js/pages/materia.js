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
      backLabel: '‹ Matérias',
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
        <div class="ei">📄</div>
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

    /* ── Header com badges + botão de favoritar ──
     *
     * FIX CRÍTICO: AI2.renderFolha(container) faz container.innerHTML = ''
     * Se passarmos body diretamente, o header seria apagado.
     * Solução: appendamos o header em body, criamos um contentDiv filho
     * separado e passamos ESSE div para AI2.renderFolha. Assim o header
     * permanece intacto.
     */
    const isFav = !!this.sheet.favorita;

    const header = document.createElement('div');
    header.className = 'sheet-view-header';
    header.innerHTML = `
      <div class="shv-badges">
        <span class="badge badge-accent">${this.subject.emoji} ${this.subject.nomeNormalizado}</span>
        ${this.sheet.nivelLabel ? `<span class="badge badge-nivel">${this.sheet.nivelLabel}</span>` : ''}
        <button class="fav-btn-header ${isFav ? 'on' : ''}" id="fav-header-btn"
                title="${isFav ? 'Remover favorito' : 'Favoritar'}">
          ${isFav ? '⭐' : '☆'}
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
        favBtn.textContent = folha.favorita ? '⭐' : '☆';
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
        this.sheet.resultado
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