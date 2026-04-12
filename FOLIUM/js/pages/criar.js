/* ═══════════════════════════════════════
   FOLIUM — pages/criar.js
   Fluxo de 3 etapas para criação de folha
═══════════════════════════════════════ */

const CriarPage = {
  currentStep: 1,

  /*
   * Cada item da lista:
   * { txt, on, plano_pesquisa, aviso }
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

    /* Desabilita botão durante a chamada */
    const btn = DOM.$('#btn-gerar');
    if (btn) btn.disabled = true;

    Modal.showLoading(
      'IA analisando o tema…',
      'Mapeando os melhores tópicos para seu estudo'
    );

    let usouFallback = false;

    try {
      this.topicList = await AI1.gerarTopicos(this.materia, this.tema);
    } catch (err) {
      console.error('[AI1] gerarTopicos falhou:', err.message);
      usouFallback = true;
      /* Fallback: mock genérico para não travar o fluxo */
      this.topicList = Mock.topicSuggestions.map((txt, i) => ({
        txt,
        on:             i < 5,
        plano_pesquisa: null,
        aviso:          null,
      }));
    } finally {
      Modal.hideLoading();
      if (btn) btn.disabled = false;
    }

    this._renderTopics();

    /* Avisa o usuário se caiu no fallback */
    if (usouFallback) {
      this._showStepMsg(
        'pane2-msg',
        '⚠️ IA indisponível no momento — exibindo sugestões genéricas. Edite à vontade.',
        'warn'
      );
    }

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
      `Analisando "${txt}" no contexto de ${this.materia}`
    );

    let resultado = { compativel: true, aviso: null, plano_pesquisa: null };

    try {
      resultado = await AI1.verificarTopico(
        txt, this.materia, this.tema, this.topicList
      );
    } catch (err) {
      console.error('[AI1] verificarTopico falhou:', err.message);
      /* Se a verificação falhar, adiciona sem aviso — nunca bloqueia */
    } finally {
      Modal.hideLoading();
      if (btn) btn.disabled = false;
    }

    this.topicList.push({
      txt,
      on:             true,
      plano_pesquisa: resultado.plano_pesquisa,
      aviso:          resultado.compativel
        ? resultado.aviso
        : (resultado.aviso ||
           `"${txt}" pode estar fora do tema de ${this.materia}. Você pode mantê-lo.`),
    });

    this._renderTopics();
    inp.value = '';
  },

  /* ─── HELPER: mensagem contextual dentro do pane ────────── */
  _showStepMsg(id, texto, tipo = 'info') {
    let el = DOM.$(`#${id}`);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      const pane2 = DOM.$('#pane2');
      if (pane2) pane2.insertBefore(el, pane2.firstChild);
    }
    el.className = `step-msg step-msg--${tipo}`;
    el.textContent = texto;
  },

  /* ─── ETAPA 3 — Folha gerada ────────────────────────────── */
  async gerarFolha() {
    const selecionados = this.topicList.filter(t => t.on);
    if (!selecionados.length) {
      alert('Selecione ao menos um tópico.');
      return;
    }

    /* Salva o plano para a futura IA 2 */
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
      1400,
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