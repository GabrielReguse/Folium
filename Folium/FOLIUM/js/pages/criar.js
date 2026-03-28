/* ═══════════════════════════════════════
   FOLIUM — pages/criar.js
   Fluxo de 3 etapas para criação de folha
═══════════════════════════════════════ */

const CriarPage = {
  currentStep: 1,
  topicList:   [],     /* [{ txt, on }] */
  materia:     '',
  tema:        '',

  init() {
    if (!Router.requireAuth()) return;
    Navbar.renderTop({ backRoute: 'home', backLabel: '‹ Voltar' });
    this.goStep(1);
  },

  /* ═══════════
     STEP BAR
  ════════════ */
  goStep(n) {
    this.currentStep = n;

    for (let i = 1; i <= 3; i++) {
      const dot  = DOM.$(`#dot${i}`);
      const pane = DOM.$(`#pane${i}`);
      dot.classList.remove('active', 'done');
      if (i < n)       dot.classList.add('done');
      else if (i === n) dot.classList.add('active');
      pane.classList.toggle('active', i === n);
    }
    for (let i = 1; i <= 2; i++) {
      DOM.$(`#ln${i}`).classList.toggle('done', i < n);
    }
    DOM.scrollTop();
  },

  /* ═══════════
     ETAPA 1 — Entrada
  ════════════ */
  async gerarSugestoes() {
    const materiaEl = DOM.$('#inp-materia');
    const temaEl    = DOM.$('#inp-tema');

    if (!materiaEl.value.trim()) { DOM.markError(materiaEl); return; }

    this.materia = Helpers.titleCase(materiaEl.value.trim());
    this.tema    = temaEl.value.trim();

    await Modal.simulate(
      'Analisando tema...',
      'A IA está mapeando os melhores tópicos',
      1900,
      () => {
        this.topicList = Mock.topicSuggestions.map((txt, i) => ({ txt, on: i < 5 }));
        this._renderTopics();
        this.goStep(2);
      }
    );
  },

  /* ═══════════
     ETAPA 2 — Edição de tópicos
  ════════════ */
  _renderTopics() {
    const list = DOM.$('#topics-list');
    DOM.clear(list);

    this.topicList.forEach((t, i) => {
      const row = Card.topicRow({
        txt:      t.txt,
        on:       t.on,
        index:    i,
        onToggle: (idx, chkEl) => this._toggleTopic(idx, chkEl),
        onRemove: (idx)        => this._removeTopic(idx),
      });
      list.appendChild(row);
    });
  },

  _toggleTopic(i, chkEl) {
    this.topicList[i].on = !this.topicList[i].on;
    chkEl.classList.toggle('on', this.topicList[i].on);
    chkEl.textContent = this.topicList[i].on ? '✓' : '';
  },

  _removeTopic(i) {
    this.topicList.splice(i, 1);
    this._renderTopics();
  },

  async addTopic() {
    const inp = DOM.$('#inp-new-topic');
    const txt = inp.value.trim();
    if (!txt) { DOM.markError(inp); return; }

    await Modal.simulate('Pesquisando...', 'Verificando o novo tópico', 900, () => {
      this.topicList.push({ txt, on: true });
      this._renderTopics();
      inp.value = '';
    });
  },

  /* ═══════════
     ETAPA 3 — Folha gerada
  ════════════ */
  async gerarFolha() {
    const selecionados = this.topicList.filter(t => t.on);
    if (!selecionados.length) {
      alert('Selecione ao menos um tópico.');
      return;
    }

    await Modal.simulate(
      'Gerando sua folha...',
      'A IA está criando seu resumo personalizado',
      2400,
      () => {
        this._renderSheetOutput(selecionados);
        this.goStep(3);
      }
    );
  },

  _renderSheetOutput(topics) {
    const out = DOM.$('#sheet-out');
    DOM.clear(out);

    /* Cabeçalho */
    const header = document.createElement('div');
    header.className = 'sheet-header';
    header.innerHTML = `
      <span class="badge badge-accent">✨ Gerada por IA</span>
      <h2 class="t-section" style="margin-top:10px;margin-bottom:5px">${this.materia}</h2>
      <p class="t-sub">${topics.length} tópico${topics.length !== 1 ? 's' : ''} · ${Helpers.formatDate(new Date())}</p>`;
    out.appendChild(header);

    /* Seções por tópico */
    topics.forEach(t => {
      out.appendChild(Card.sheetSection({ topic: t.txt, subject: this.materia }));
    });

    /* Resumo geral */
    out.appendChild(Card.sheetSummary({ title: this.tema || this.materia, subject: this.materia }));
  },

  async salvarFolha() {
    await Modal.simulate('Salvando...', 'Adicionando à sua coleção', 900, () => {
      Router.go('folhas');
    });
  },
};

document.addEventListener('DOMContentLoaded', () => CriarPage.init());
