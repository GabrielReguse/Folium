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

    this.subject = Mock.getSubject(subjectId);
    if (!this.subject) { Router.go('folhas'); return; }

    if (viewSheet && sheetId) {
      this.sheet = Mock.getSheet(subjectId, sheetId);
      this._renderSheetView();
    } else {
      this._renderSheetList();
    }
  },

  /* ── Lista de folhas da matéria ── */
  _renderSheetList() {
    Navbar.renderTop({
      backRoute: 'folhas',
      backLabel: '‹ Matérias',
      title: `<em>${this.subject.name}</em>`
    });

    const body = DOM.$('#materia-body');
    if (!body) return;

    /* Label de contagem */
    const lbl = document.createElement('p');
    lbl.className = 't-label mb-16';
    lbl.textContent = `${this.subject.sheets.length} folha${this.subject.sheets.length !== 1 ? 's' : ''}`;
    body.appendChild(lbl);

    if (!this.subject.sheets.length) {
      body.innerHTML += `
        <div class="empty-state">
          <div class="ei">📄</div>
          <h3>Nenhuma folha aqui</h3>
          <p>Crie uma folha para esta matéria.</p>
        </div>`;
      return;
    }

    this.subject.sheets.forEach((sh, i) => {
      const card = Card.sheet({ ...sh, subjectId: this.subject.id });
      card.style.animationDelay = `${i * 0.07}s`;
      card.classList.add('au');
      body.appendChild(card);
    });
  },

  /* ── Visualização completa da folha ── */
  _renderSheetView() {
    Navbar.renderTop({
      backRoute: null,
      backLabel: null,
      title: `<em>${this.subject.name}</em>`
    });

    /* Botão voltar manual para a lista */
    const nav = DOM.$('.top-nav');
    if (nav) {
      const backBtn = document.createElement('button');
      backBtn.className = 'nav-back';
      backBtn.textContent = `‹ ${this.subject.name}`;
      backBtn.addEventListener('click', () =>
        Router.go('materia', { subjectId: this.subject.id })
      );
      nav.replaceChild(backBtn, nav.firstElementChild);
    }

    const body = DOM.$('#materia-body');
    if (!body) return;

    /* Cabeçalho */
    const header = document.createElement('div');
    header.className = 'sheet-view-header';
    header.innerHTML = `
      <span class="badge badge-accent">${this.subject.emoji} ${this.subject.name}</span>
      <h2 class="t-section" style="margin-top:10px;margin-bottom:6px">${this.sheet.title}</h2>
      <p class="t-sub">Criada em ${this.sheet.date} · ${this.sheet.topics.length} tópicos</p>`;
    body.appendChild(header);

    /* Seções de conteúdo */
    this.sheet.topics.forEach(tp => {
      body.appendChild(Card.sheetSection({ topic: tp, subject: this.subject.name }));
    });

    /* Resumo final */
    body.appendChild(Card.sheetSummary({
      title:   this.sheet.title,
      subject: this.subject.name
    }));

    const spacer = document.createElement('div');
    spacer.style.height = '40px';
    body.appendChild(spacer);
  }
};

document.addEventListener('DOMContentLoaded', () => MateriaPage.init());
