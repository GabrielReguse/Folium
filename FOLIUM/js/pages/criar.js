/* ═══════════════════════════════════════
   FOLIUM — pages/criar.js
   Fluxo de 3 etapas para criação de folha
═══════════════════════════════════════ */

const CriarPage = {
  currentStep: 1,

  /*
   * Cada item da lista:
   * { txt: string, on: boolean, plano_pesquisa: object|null, aviso: string|null }
   *
   * plano_pesquisa é preparado pela IA 1 e consumido futuramente pela IA 2.
   */
  topicList: [],
  materia:   '',
  tema:      '',

  init() {
    if (!Router.requireAuth()) return;
    Navbar.renderTop({ backRoute: 'home', backLabel: '‹ Voltar' });
    this.goStep(1);
  },

  /* ─── STEP BAR ─────────────────────────────────────────── */
  goStep(n) {
    this.currentStep = n;

    for (let i = 1; i <= 3; i++) {
      const dot  = DOM.$(`#dot${i}`);
      const pane = DOM.$(`#pane${i}`);
      dot.classList.remove('active', 'done');
      if (i < n)        dot.classList.add('done');
      else if (i === n) dot.classList.add('active');
      pane.classList.toggle('active', i === n);
    }
    for (let i = 1; i <= 2; i++) {
      DOM.$(`#ln${i}`).classList.toggle('done', i < n);
    }
    DOM.scrollTop();
  },

  /* ─── ETAPA 1 — Entrada ────────────────────────────────── */
  async gerarSugestoes() {
    const materiaEl = DOM.$('#inp-materia');
    const temaEl    = DOM.$('#inp-tema');

    if (!materiaEl.value.trim()) { DOM.markError(materiaEl); return; }

    this.materia = Helpers.titleCase(materiaEl.value.trim());
    this.tema    = temaEl.value.trim();

    Modal.showLoading(
      'IA analisando o tema…',
      'Mapeando os melhores tópicos para seu estudo'
    );

    try {
      /* ── IA 1: gerar tópicos reais ── */
      this.topicList = await AI1.gerarTopicos(this.materia, this.tema);
    } catch (err) {
      console.error('[AI1] gerarTopicos falhou:', err);
      /* Fallback para mock caso a API falhe */
      this.topicList = Mock.topicSuggestions.map((txt, i) => ({
        txt,
        on:             i < 5,
        plano_pesquisa: null,
        aviso:          null,
      }));
    } finally {
      Modal.hideLoading();
    }

    this._renderTopics();
    this.goStep(2);
  },

  /* ─── ETAPA 2 — Edição de tópicos ─────────────────────── */
  _renderTopics() {
    const list = DOM.$('#topics-list');
    DOM.clear(list);

    this.topicList.forEach((t, i) => {
      const row = Card.topicRow({
        txt:      t.txt,
        on:       t.on,
        index:    i,
        aviso:    t.aviso,
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

  /* ─── ADICIONAR TÓPICO MANUAL (com verificação da IA 1) ── */
  async addTopic() {
    const inp = DOM.$('#inp-new-topic');
    const txt = inp.value.trim();
    if (!txt) { DOM.markError(inp); return; }

    const btn = DOM.$('#btn-add-topic');
    if (btn) btn.disabled = true;

    Modal.showLoading(
      'IA verificando compatibilidade…',
      `Analisando "${txt}" com os temas de ${this.materia}`
    );

    let resultado = { compativel: true, aviso: null, plano_pesquisa: null };

    try {
      /* ── IA 1: verificar se o novo tópico faz sentido ── */
      resultado = await AI1.verificarTopico(
        txt,
        this.materia,
        this.tema,
        this.topicList
      );
    } catch (err) {
      console.error('[AI1] verificarTopico falhou:', err);
    } finally {
      Modal.hideLoading();
      if (btn) btn.disabled = false;
    }

    /* Sempre adiciona — nunca bloqueia o usuário */
    this.topicList.push({
      txt,
      on:             true,
      plano_pesquisa: resultado.plano_pesquisa,
      aviso:          resultado.compativel
        ? resultado.aviso
        : (resultado.aviso ||
           `"${txt}" pode estar fora do tema principal de ${this.materia}. Você pode mantê-lo se quiser.`),
    });

    this._renderTopics();
    inp.value = '';
  },

  /* ─── ETAPA 3 — Folha gerada ────────────────────────────── */
  async gerarFolha() {
    const selecionados = this.topicList.filter(t => t.on);
    if (!selecionados.length) {
      alert('Selecione ao menos um tópico.');
      return;
    }

    /*
     * Exporta o plano de pesquisa para a IA 2.
     * Salvo em sessionStorage — a próxima IA lê este objeto.
     */
    const plano = AI1.exportarPlano(this.topicList);
    sessionStorage.setItem('folium_plano_ia2', JSON.stringify({
      materia:  this.materia,
      tema:     this.tema,
      topicos:  plano,
      geradoEm: new Date().toISOString(),
    }));

    await Modal.simulate(
      'Preparando sua folha…',
      'Organizando os tópicos selecionados',
      1800,
      () => {
        this._renderSheetOutput(selecionados);
        this.goStep(3);
      }
    );
  },

  _renderSheetOutput(topics) {
    const out = DOM.$('#sheet-out');
    DOM.clear(out);

    const header = document.createElement('div');
    header.className = 'sheet-header';
    header.innerHTML = `
      <span class="badge badge-accent">✨ Gerada por IA</span>
      <h2 class="t-section" style="margin-top:10px;margin-bottom:5px">${this.materia}</h2>
      <p class="t-sub">${topics.length} tópico${topics.length !== 1 ? 's' : ''} · ${Helpers.formatDate(new Date())}</p>`;
    out.appendChild(header);

    /* Conteúdo ainda mockado — IA 2 preencherá com base no plano_pesquisa */
    topics.forEach(t => {
      out.appendChild(Card.sheetSection({ topic: t.txt, subject: this.materia }));
    });

    out.appendChild(Card.sheetSummary({ title: this.tema || this.materia, subject: this.materia }));
  },

  async salvarFolha() {
    await Modal.simulate('Salvando…', 'Adicionando à sua coleção', 900, () => {
      Router.go('folhas');
    });
  },
};

document.addEventListener('DOMContentLoaded', () => CriarPage.init());