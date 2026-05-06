/* ═══════════════════════════════════════════════════════════════
   FOLIUM — pages/mapa.js
   Fluxo completo de criação de Mapa Mental
   Etapas: 1=Configurar · 2=Tópicos · 3=Template · 4=Editor · 5=Resultado
═══════════════════════════════════════════════════════════════ */

/* ─── MOCK DATA para fallback quando backend não tem o endpoint ─── */
const MOCK_MAP_CONTENT = {
  gerarConteudoPorTopico(topico, areaPixels) {
    const density = areaPixels > 60000 ? 'grande' : areaPixels > 25000 ? 'medio' : 'pequeno';
    const templates = {
      grande: [
        `${topico} é um conceito central que abrange múltiplas dimensões. Sua compreensão exige análise de causas, consequências e inter-relações com outros elementos do campo de estudo. Exemplos práticos ajudam a consolidar o aprendizado.`,
        `O estudo de ${topico} revela padrões importantes para o entendimento do tema. Identifique os elementos principais, suas funções e como se relacionam entre si. Aplique o conhecimento em situações concretas para fixar melhor.`,
      ],
      medio: [
        `${topico}: conceito que descreve um conjunto de características ou processos específicos. Compreendê-lo é essencial para o domínio do tema.`,
        `Aspecto fundamental do tema, ${topico} relaciona-se diretamente com os demais nós do mapa. Atenção às suas particularidades.`,
      ],
      pequeno: [
        `Definição: ${topico} — elemento-chave do tema.`,
        `Conceito essencial: ${topico}.`,
      ],
    };
    const set = templates[density];
    return set[Math.floor(Math.random() * set.length)];
  },
};

/* ─── TEMPLATE LAYOUTS ───────────────────────────────────────────── */
const TPL_LAYOUTS = {
  radial(nodes, cx, cy, W, H) {
    /* Centro no meio; tópicos ao redor em círculo */
    nodes[0].x = cx - nodes[0].w / 2;
    nodes[0].y = cy - nodes[0].h / 2;
    const r = Math.min(W, H) * 0.32;
    const topics = nodes.slice(1);
    topics.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / topics.length - Math.PI / 2;
      n.x = Math.max(8, Math.min(W - n.w - 8, cx + r * Math.cos(angle) - n.w / 2));
      n.y = Math.max(8, Math.min(H - n.h - 8, cy + r * Math.sin(angle) - n.h / 2));
    });
  },
  linear(nodes, cx, cy, W, H) {
    /* Centro no topo, tópicos em grid abaixo */
    nodes[0].x = cx - nodes[0].w / 2;
    nodes[0].y = 28;
    const topics = nodes.slice(1);
    const cols   = Math.ceil(Math.sqrt(topics.length));
    const rows   = Math.ceil(topics.length / cols);
    const topicW = Math.min(160, (W - 16) / cols - 10);
    const topicH = nodes[0].h;
    const startY = nodes[0].y + nodes[0].h + 60;
    const totalW = cols * (topicW + 10) - 10;
    const startX = (W - totalW) / 2;
    topics.forEach((n, i) => {
      n.w = topicW;
      n.h = topicH;
      const col = i % cols;
      const row = Math.floor(i / cols);
      n.x = Math.max(8, startX + col * (topicW + 10));
      n.y = Math.max(8, Math.min(H - n.h - 8, startY + row * (topicH + 40)));
    });
  },
  organico(nodes, cx, cy, W, H) {
    /* Assimétrico com offsets variados */
    nodes[0].x = cx - nodes[0].w / 2;
    nodes[0].y = cy - nodes[0].h / 2;
    const topics = nodes.slice(1);
    const angles = [
      -2.2, -1.1, -0.1, 0.8, 1.6, 2.5, 3.3, 4.1, 5.0, 5.9,
    ];
    const radii = [200, 230, 180, 220, 200, 210, 190, 215, 205, 195];
    topics.forEach((n, i) => {
      const angle = angles[i % angles.length];
      const r = radii[i % radii.length];
      n.x = Math.max(8, Math.min(W - n.w - 8, cx + r * Math.cos(angle) - n.w / 2));
      n.y = Math.max(8, Math.min(H - n.h - 8, cy + r * Math.sin(angle) - n.h / 2));
    });
  },
  livre(nodes, cx, cy, W, H) {
    /* Todos empilhados no centro — usuário posiciona */
    nodes[0].x = cx - nodes[0].w / 2;
    nodes[0].y = cy - nodes[0].h / 2;
    const topics = nodes.slice(1);
    topics.forEach((n, i) => {
      n.x = 20 + (i % 4) * 50;
      n.y = 20 + Math.floor(i / 4) * 40;
    });
  },
};

/* ─── HELPERS: conteúdo gerado pela IA para cada tópico ─────────── */
const MapaAI = {
  /* Tenta reutilizar AI2 para gerar conteúdo; fallback inteligente */
  async gerarConteudo(materia, titulo, topicos, nivel) {
    try {
      /* Re-usa o endpoint de folha da IA2 — extrai as explicações */
      const resultado = await AI2.gerarFolha(
        materia,
        titulo,
        nivel || 'medio',
        topicos.map(t => ({ txt: t, plano_pesquisa: null }))
      );
      /* Mapeia tópico → conteúdo */
      const map = {};
      (resultado.blocos || []).forEach(b => {
        map[b.titulo] = b.explicacao || '';
      });
      return map;
    } catch (err) {
      console.warn('[MapaAI] gerarConteudo falhou, usando mock:', err.message);
      return null; /* sinal para usar mock */
    }
  },
};

/* ══════════════════════════════════════════════════════════════
   OBJETO PRINCIPAL
══════════════════════════════════════════════════════════════ */
const MapaPage = {
  /* Estado */
  step:      1,
  modo:      'ia',          /* 'ia' | 'manual' */
  materia:   '',
  titulo:    '',
  numTopics: 5,
  topicos:   [],            /* [{txt, on}] */
  template:  null,          /* 'radial'|'linear'|'organico'|'livre' */
  nodes:     [],            /* [{id, label, x, y, w, h, isCenter}] */
  editorMode:'ordem',       /* 'ordem' | 'layout' */
  aiContent: null,          /* map topic→texto gerado pela IA */

  /* Editor state */
  _drag:     null,
  _resize:   null,
  _selectedNodeId: null,
  _dropdownNodeId: null,

  /* ── INIT ─────────────────────────────────────────────────── */
  init() {
    if (!Router.requireAuth()) return;
    Navbar.renderTop({ title: '<em>Mapa Mental</em>' });
    Navbar.renderBottom('escolher');
    Sidebar.init();
    this.goStep(1);
    Config.warmInBackground();

    /* Fecha dropdown ao clicar fora */
    document.addEventListener('click', (e) => {
      const dd = document.getElementById('mp-ordem-dropdown');
      if (dd && !dd.contains(e.target)) {
        dd.style.display = 'none';
        this._dropdownNodeId = null;
        /* remove seleção visual */
        document.querySelectorAll('.mp-node--selected-ordem').forEach(
          el => el.classList.remove('mp-node--selected-ordem')
        );
      }
    });
  },

  /* ── STEPPER ──────────────────────────────────────────────── */
  goStep(n) {
    this.step = n;
    /* Ajuste: se modo=manual, não há pane2 (tópicos), step 2 é template */
    const totalSteps = 5;
    for (let i = 1; i <= totalSteps; i++) {
      const dot  = document.getElementById(`mdot${i}`);
      const pane = document.getElementById(`mpane${i}`);
      if (!dot || !pane) continue;
      dot.classList.remove('active', 'done');
      if (i < n)        dot.classList.add('done');
      else if (i === n) dot.classList.add('active');
      pane.classList.toggle('active', i === n);
    }
    for (let i = 1; i <= 4; i++) {
      const ln = document.getElementById(`mln${i}`);
      if (ln) ln.classList.toggle('done', i < n);
    }
    DOM.scrollTop();
    /* Ações especiais por step */
    if (n === 4) this._initEditor();
    if (n === 5) this._renderResult();
  },

  /* ── STEP 1 — Configurar ──────────────────────────────────── */
  changeNum(delta) {
    const inp = document.getElementById('mp-num');
    let v = parseInt(inp.value) + delta;
    v = Math.max(2, Math.min(10, v));
    inp.value = v;
    this.numTopics = v;
    if (this.modo === 'manual') this._renderManualFields();
  },

  setModo(m) {
    this.modo = m;
    document.getElementById('mp-modo-ia').classList.toggle('active', m === 'ia');
    document.getElementById('mp-modo-manual').classList.toggle('active', m === 'manual');
    const fields = document.getElementById('mp-manual-fields');
    const btnTxt = document.getElementById('mp-btn-avancar-txt');
    if (m === 'manual') {
      fields.style.display = 'flex';
      btnTxt.textContent = 'Continuar';
      this._renderManualFields();
    } else {
      fields.style.display = 'none';
      btnTxt.textContent = 'Gerar sugestões com IA';
    }
  },

  _renderManualFields() {
    const container = document.getElementById('mp-manual-fields');
    container.innerHTML = '';
    const n = parseInt(document.getElementById('mp-num').value) || 5;
    for (let i = 0; i < n; i++) {
      const prev = this.topicos[i]?.txt || '';
      const row  = document.createElement('div');
      row.className = 'mp-manual-field';
      row.innerHTML = `
        <span class="mp-field-num">${i + 1}</span>
        <input type="text" class="inp" data-idx="${i}"
               placeholder="Nome do tópico ${i + 1}…"
               value="${prev}"
               autocomplete="off">`;
      container.appendChild(row);
    }
  },

  async avancar1() {
    const materiaEl = document.getElementById('mp-materia');
    const tituloEl  = document.getElementById('mp-titulo');
    const numEl     = document.getElementById('mp-num');

    if (!materiaEl.value.trim()) { DOM.markError(materiaEl); return; }
    if (!tituloEl.value.trim())  { DOM.markError(tituloEl);  return; }

    this.materia   = Helpers.titleCase(materiaEl.value.trim());
    this.titulo    = tituloEl.value.trim();
    this.numTopics = parseInt(numEl.value) || 5;

    if (this.modo === 'manual') {
      /* Valida campos manuais */
      const inputs = document.querySelectorAll('#mp-manual-fields input');
      const vals   = [];
      let allFilled = true;
      inputs.forEach(inp => {
        if (!inp.value.trim()) { DOM.markError(inp); allFilled = false; }
        else vals.push(inp.value.trim());
      });
      if (!allFilled) return;
      this.topicos = vals.map(txt => ({ txt, on: true }));
      /* Manual pula step 2 → step 3 direto */
      this.goStep(3);
      return;
    }

    /* Modo IA — vai para step 2 gerando sugestões */
    const btn = document.getElementById('mp-btn-avancar');
    if (btn) btn.disabled = true;

    Modal.showLoading('Conectando ao servidor…', 'Pode levar até 1 minuto na primeira vez');
    const online = await Config.wake();
    if (!online) {
      Modal.hideLoading();
      if (btn) btn.disabled = false;
      this._showMsg('pane1-msg', 'Servidor indisponível. Tente novamente.', 'warn');
      return;
    }

    Modal.showLoading('IA analisando o tema…', `Mapeando tópicos para "${this.titulo}"`);

    let usouFallback = false;
    try {
      this.topicos = await AI1.gerarTopicos(this.materia, this.titulo, 'medio');
      /* Limita/ajusta ao numTopics desejado (soft limit) */
    } catch (err) {
      console.warn('[MapaAI] gerarTopicos falhou:', err.message);
      usouFallback = true;
      this.topicos = Mock.topicSuggestions.slice(0, this.numTopics).map(txt => ({ txt, on: true }));
    } finally {
      Modal.hideLoading();
      if (btn) btn.disabled = false;
    }

    this._renderTopicos();
    if (usouFallback) this._showMsg('mpane2-msg', 'IA indisponível — exibindo sugestões genéricas.', 'warn');
    this.goStep(2);
  },

  /* ── STEP 2 — Tópicos (IA) ─────────────────────────────────── */
  _renderTopicos() {
    const list = document.getElementById('mp-topics-list');
    if (!list) return;
    list.innerHTML = '';

    this.topicos.forEach((t, i) => {
      const row = Card.topicRow({
        txt:      t.txt,
        on:       t.on,
        index:    i,
        aviso:    null,
        onToggle: (idx, chkEl) => {
          this.topicos[idx].on = !this.topicos[idx].on;
          chkEl.classList.toggle('on', this.topicos[idx].on);
          chkEl.innerHTML = this.topicos[idx].on
            ? '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;stroke:white"><polyline points="20 6 9 17 4 12"/></svg>'
            : '';
          this._updateTopicMeter();
          this._checkTopicsWarning();
        },
        onRemove: (idx) => {
          this.topicos.splice(idx, 1);
          this._renderTopicos();
        },
      });
      list.appendChild(row);
    });

    this._updateTopicMeter();
    this._checkTopicsWarning();
  },

  _updateTopicMeter() {
    const selected = this.topicos.filter(t => t.on).length;
    const total    = this.topicos.length;
    const c = document.getElementById('mp-topic-count');
    const t = document.getElementById('mp-topic-total');
    if (c) c.textContent = selected;
    if (t) t.textContent = total;
    const btn = document.getElementById('mp-btn-aprovar');
    if (btn) btn.disabled = selected < 2;
  },

  _checkTopicsWarning() {
    const selected = this.topicos.filter(t => t.on).length;
    const aviso = document.getElementById('mp-topics-aviso');
    if (!aviso) return;
    if (selected < 2) {
      aviso.style.display = 'block';
      aviso.textContent = 'Selecione pelo menos 2 tópicos para continuar.';
    } else if (selected > 10) {
      aviso.style.display = 'block';
      aviso.textContent = `Você tem ${selected} tópicos — recomendamos no máximo 10 para melhor visualização.`;
    } else {
      aviso.style.display = 'none';
    }
  },

  async addTopico() {
    const inp = document.getElementById('mp-new-topic');
    const txt = inp.value.trim();
    if (!txt) { DOM.markError(inp); return; }

    const btn = document.getElementById('mp-btn-add');
    if (btn) btn.disabled = true;

    Modal.showLoading('IA verificando…', `Analisando "${txt}" no contexto de ${this.materia}`);

    try {
      await AI1.verificarTopico(txt, this.materia, this.titulo, this.topicos, 'medio');
    } catch (_) { /* ignora erros de verificação */ }

    Modal.hideLoading();
    if (btn) btn.disabled = false;

    this.topicos.push({ txt, on: true });
    this._renderTopicos();
    inp.value = '';
  },

  /* ── STEP 3 — Template ─────────────────────────────────────── */
  selectTemplate(tpl) {
    this.template = tpl;
    document.querySelectorAll('.mp-tpl-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.tpl === tpl);
    });
    const btn = document.getElementById('mp-btn-usar-tpl');
    if (btn) btn.disabled = false;
  },

  /* ── STEP 4 — Editor ───────────────────────────────────────── */
  _initEditor() {
    const canvas = document.getElementById('mp-canvas');
    if (!canvas) return;

    /* Limpa nós anteriores (exceto SVG) */
    canvas.querySelectorAll('.mp-node').forEach(el => el.remove());

    const W = canvas.offsetWidth  || 900;
    const H = canvas.offsetHeight || 636;
    const cx = W / 2, cy = H / 2;

    /* Tópicos selecionados */
    const selected = this.topicos.filter(t => t.on);

    /* Default: usar numTopics como guia de tamanho */
    const nodeW = Math.max(120, Math.min(200, W / (selected.length + 1)));
    const nodeH = Math.max(60, Math.min(90, H / 5));

    /* Constrói lista de nós: [centro, ...tópicos] */
    this.nodes = [
      { id: 'center', label: this.titulo, x: 0, y: 0, w: nodeW + 20, h: nodeH + 10, isCenter: true },
      ...selected.map((t, i) => ({
        id:       `node_${i}`,
        label:    t.txt,
        x: 0, y: 0,
        w: nodeW,
        h: nodeH,
        isCenter: false,
      })),
    ];

    /* Aplica template */
    const layoutFn = TPL_LAYOUTS[this.template] || TPL_LAYOUTS.radial;
    layoutFn(this.nodes, cx, cy, W, H);

    /* Renderiza nós */
    this.nodes.forEach(n => this._createNodeEl(canvas, n));

    /* Linhas iniciais */
    this._redrawLines('mp-canvas-svg');

    /* Aplica modo */
    canvas.className = 'mp-canvas mp-editor--' + this.editorMode;

    /* Hint */
    this._updateHint();
  },

  _createNodeEl(canvas, node) {
    const el = document.createElement('div');
    el.className = 'mp-node' + (node.isCenter ? ' mp-node--center' : '');
    el.dataset.nodeId = node.id;
    el.style.cssText = `left:${node.x}px;top:${node.y}px;width:${node.w}px;height:${node.h}px`;

    el.innerHTML = `
      <div class="mp-node__header">${node.label}</div>
      <div class="mp-node__body"></div>
      ${!node.isCenter ? `
        <div class="mp-resize-handle mp-resize-handle--se" data-dir="se"></div>
        <div class="mp-resize-handle mp-resize-handle--sw" data-dir="sw"></div>
        <div class="mp-resize-handle mp-resize-handle--ne" data-dir="ne"></div>
        <div class="mp-resize-handle mp-resize-handle--nw" data-dir="nw"></div>
      ` : ''}`;

    /* Evento de drag */
    el.addEventListener('pointerdown', (e) => this._onPointerDown(e, node.id, canvas));

    canvas.appendChild(el);
  },

  /* ─── DRAG & RESIZE ─────────────────────────────────────── */
  _onPointerDown(e, nodeId, canvas) {
    const resizeHandle = e.target.closest('.mp-resize-handle');

    if (this.editorMode === 'ordem') {
      /* Modo ordem: clique abre dropdown */
      if (!resizeHandle) {
        e.stopPropagation();
        this._openOrdemDropdown(nodeId, e.currentTarget);
      }
      return;
    }

    /* Modo layout */
    if (resizeHandle) {
      /* Resize */
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return;
      this._resize = {
        nodeId,
        dir:    resizeHandle.dataset.dir,
        startX: e.clientX, startY: e.clientY,
        origX:  node.x,    origY:  node.y,
        origW:  node.w,    origH:  node.h,
      };
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    /* Drag */
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const el = e.currentTarget;
    this._drag = {
      nodeId,
      offsetX: e.clientX - node.x - canvas.getBoundingClientRect().left,
      offsetY: e.clientY - node.y - canvas.getBoundingClientRect().top,
    };
    el.classList.add('dragging');
    e.preventDefault();
    el.setPointerCapture(e.pointerId);

    el.addEventListener('pointermove', this._onPointerMove.bind(this), { passive: false });
    el.addEventListener('pointerup',   this._onPointerUp.bind(this),   { once: true });
  },

  _onPointerMove(e) {
    const canvas = document.getElementById('mp-canvas');
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    if (this._drag) {
      const node = this.nodes.find(n => n.id === this._drag.nodeId);
      if (!node) return;
      const rect = canvas.getBoundingClientRect();
      node.x = Math.max(0, Math.min(W - node.w, e.clientX - rect.left - this._drag.offsetX));
      node.y = Math.max(0, Math.min(H - node.h, e.clientY - rect.top  - this._drag.offsetY));
      const el = canvas.querySelector(`[data-node-id="${node.id}"]`);
      if (el) { el.style.left = node.x + 'px'; el.style.top = node.y + 'px'; }
      this._redrawLines('mp-canvas-svg');
      this._checkOverlaps();
    }

    if (this._resize) {
      const r = this._resize;
      const node = this.nodes.find(n => n.id === r.nodeId);
      if (!node) return;
      const dx = e.clientX - r.startX;
      const dy = e.clientY - r.startY;
      const MIN_W = 80, MIN_H = 50;
      let newX = node.x, newY = node.y, newW = node.w, newH = node.h;

      if (r.dir.includes('e')) newW = Math.max(MIN_W, r.origW + dx);
      if (r.dir.includes('s')) newH = Math.max(MIN_H, r.origH + dy);
      if (r.dir.includes('w')) {
        const delta = Math.min(dx, r.origW - MIN_W);
        newX = r.origX + delta;
        newW = r.origW - delta;
      }
      if (r.dir.includes('n')) {
        const delta = Math.min(dy, r.origH - MIN_H);
        newY = r.origY + delta;
        newH = r.origH - delta;
      }

      node.x = Math.max(0, newX); node.y = Math.max(0, newY);
      node.w = Math.min(W - node.x, newW);
      node.h = Math.min(H - node.y, newH);

      const el = canvas.querySelector(`[data-node-id="${node.id}"]`);
      if (el) {
        el.style.left = node.x + 'px'; el.style.top = node.y + 'px';
        el.style.width = node.w + 'px'; el.style.height = node.h + 'px';
      }
      this._redrawLines('mp-canvas-svg');
      this._checkWarnings();
    }
  },

  _onPointerUp(e) {
    const canvas = document.getElementById('mp-canvas');
    if (this._drag) {
      const el = canvas.querySelector(`[data-node-id="${this._drag.nodeId}"]`);
      if (el) el.classList.remove('dragging');
      this._drag = null;
    }
    if (this._resize) {
      this._resize = null;
    }
    this._checkWarnings();

    /* Remove listeners */
    e.currentTarget.removeEventListener('pointermove', this._onPointerMove.bind(this));
  },

  /* ─── LINHAS DE CONEXÃO ─────────────────────────────────── */
  _redrawLines(svgId) {
    const svg    = document.getElementById(svgId);
    if (!svg)    return;
    svg.innerHTML = '';

    const center = this.nodes.find(n => n.isCenter);
    if (!center) return;

    const cx = center.x + center.w / 2;
    const cy = center.y + center.h / 2;

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="arrowhead-${svgId}" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="rgba(155,107,66,0.5)"/>
      </marker>`;
    svg.appendChild(defs);

    this.nodes.filter(n => !n.isCenter).forEach(n => {
      const tx = n.x + n.w / 2;
      const ty = n.y + n.h / 2;

      /* Ponto na borda do nó destino */
      const angle = Math.atan2(ty - cy, tx - cx);
      const edgeX = tx - Math.cos(angle) * (n.w / 2 + 2);
      const edgeY = ty - Math.sin(angle) * (n.h / 2 + 2);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', cx);
      line.setAttribute('y1', cy);
      line.setAttribute('x2', edgeX);
      line.setAttribute('y2', edgeY);
      line.setAttribute('stroke', 'rgba(155,107,66,0.45)');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('marker-end', `url(#arrowhead-${svgId})`);
      svg.appendChild(line);
    });
  },

  /* ─── VALIDAÇÕES VISUAIS ────────────────────────────────── */
  _checkOverlaps() {
    /* Marca nós sobrepostos em laranja */
    const canvas = document.getElementById('mp-canvas');
    this.nodes.forEach(a => {
      const overlapsWith = this.nodes.some(b => {
        if (a.id === b.id) return false;
        return a.x < b.x + b.w && a.x + a.w > b.x &&
               a.y < b.y + b.h && a.y + a.h > b.y;
      });
      const el = canvas.querySelector(`[data-node-id="${a.id}"]`);
      if (el) el.classList.toggle('mp-node--warn-overlap', overlapsWith);
    });
  },

  _checkWarnings() {
    const canvas = document.getElementById('mp-canvas');
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const warnings = [];

    this.nodes.forEach(n => {
      const el = canvas.querySelector(`[data-node-id="${n.id}"]`);
      if (!el) return;
      const outOfBounds = n.x < 0 || n.y < 0 || n.x + n.w > W || n.y + n.h > H;
      el.classList.toggle('mp-node--warn-overflow', outOfBounds);
      if (outOfBounds) warnings.push({ type: 'red', msg: `"${n.label}" está fora da área imprimível.` });
    });

    this._checkOverlaps();
    const overlapping = this.nodes.filter(a => this.nodes.some(b => {
      if (a.id === b.id) return false;
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }));
    if (overlapping.length > 0) {
      warnings.push({ type: 'orange', msg: 'Sobreposição detectada entre nós. Ajuste as posições.' });
    }

    const warnEl = document.getElementById('mp-editor-warnings');
    if (warnEl) {
      warnEl.innerHTML = warnings.map(w =>
        `<div class="mp-warn-item mp-warn-item--${w.type}">${w.msg}</div>`
      ).join('');
    }
  },

  /* ─── MODO EDITOR ───────────────────────────────────────── */
  setEditorMode(mode) {
    this.editorMode = mode;
    document.getElementById('mp-mode-ordem').classList.toggle('active', mode === 'ordem');
    document.getElementById('mp-mode-layout').classList.toggle('active', mode === 'layout');
    const canvas = document.getElementById('mp-canvas');
    if (canvas) canvas.className = 'mp-canvas mp-editor--' + mode;
    this._updateHint();
    /* Fecha dropdown */
    const dd = document.getElementById('mp-ordem-dropdown');
    if (dd) dd.style.display = 'none';
  },

  _updateHint() {
    const hint = document.getElementById('mp-editor-hint');
    if (!hint) return;
    hint.textContent = this.editorMode === 'ordem'
      ? 'Clique em um nó para atribuir um tópico'
      : 'Arraste para mover · Handles para redimensionar';
  },

  /* ─── DROPDOWN MODO ORDEM ───────────────────────────────── */
  _openOrdemDropdown(nodeId, el) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node || node.isCenter) return;

    /* Remove seleção anterior */
    document.querySelectorAll('.mp-node--selected-ordem').forEach(
      e => e.classList.remove('mp-node--selected-ordem')
    );
    el.classList.add('mp-node--selected-ordem');
    this._selectedNodeId = nodeId;
    this._dropdownNodeId = nodeId;

    const selected = this.topicos.filter(t => t.on);
    const dd       = document.getElementById('mp-ordem-dropdown');
    const inner    = document.getElementById('mp-ordem-list');

    inner.innerHTML = `<div class="mp-ordem-header">Escolha o tópico</div>`;
    selected.forEach(t => {
      const alreadyAssigned = this.nodes.some(n => !n.isCenter && n.id !== nodeId && n.label === t.txt);
      const opt = document.createElement('div');
      opt.className = 'mp-ordem-opt' + (alreadyAssigned ? ' assigned' : '');
      opt.innerHTML = `<span class="mp-ordem-opt__dot"></span>${t.txt}`;
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        this._assignTopic(nodeId, t.txt);
        dd.style.display = 'none';
        this._dropdownNodeId = null;
        document.querySelectorAll('.mp-node--selected-ordem').forEach(
          x => x.classList.remove('mp-node--selected-ordem')
        );
      });
      inner.appendChild(opt);
    });

    /* Posiciona o dropdown */
    const rect = el.getBoundingClientRect();
    dd.style.display = 'block';
    dd.style.top  = (rect.bottom + 6) + 'px';
    dd.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
  },

  _assignTopic(nodeId, topicTxt) {
    /* Se o tópico já está em outro nó, troca (swap) */
    const other = this.nodes.find(n => n.label === topicTxt && n.id !== nodeId && !n.isCenter);
    const target = this.nodes.find(n => n.id === nodeId);
    if (!target) return;

    if (other) {
      const oldLabel = target.label;
      other.label    = oldLabel;
      const otherEl  = document.querySelector(`[data-node-id="${other.id}"] .mp-node__header`);
      if (otherEl) otherEl.textContent = oldLabel;
    }

    target.label = topicTxt;
    const el = document.querySelector(`[data-node-id="${nodeId}"] .mp-node__header`);
    if (el) el.textContent = topicTxt;
  },

  /* ── STEP 5 — Gerar Mapa (IA) ──────────────────────────────── */
  async gerarMapa() {
    this._checkWarnings();

    Modal.showLoading('Conectando ao servidor…', 'Pode levar até 1 minuto');
    const online = await Config.wake();
    if (!online) {
      Modal.hideLoading();
      this._showMsg('mpane4-msg', 'Servidor indisponível. Tente novamente.', 'warn');
      return;
    }

    Modal.showLoading('IA gerando conteúdo…', 'Preenchendo cada nó do mapa');

    const topicos = this.nodes.filter(n => !n.isCenter).map(n => n.label);
    this.aiContent = await MapaAI.gerarConteudo(this.materia, this.titulo, topicos, 'medio');

    Modal.hideLoading();
    this.goStep(5);
  },

  /* ─── RENDERIZAR RESULTADO ─────────────────────────────────── */
  _renderResult() {
    /* Copia layout do editor para o canvas de resultado */
    const resCanvas = document.getElementById('mp-result-canvas');
    if (!resCanvas) return;
    resCanvas.querySelectorAll('.mp-node').forEach(el => el.remove());

    const W = 900, H = 636;
    resCanvas.style.width  = W + 'px';
    resCanvas.style.height = H + 'px';

    /* Header */
    const header = document.getElementById('mp-result-header');
    if (header) {
      header.className = 'mp-result-header';
      header.innerHTML = `
        <span class="badge badge-accent">
          <svg style="width:13px;height:13px;stroke:var(--caramel);fill:none;stroke-width:1.8;vertical-align:middle;margin-right:3px" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>Gerado por IA
        </span>
        <h2>${this.titulo} <em style="font-size:18px;color:var(--caramel)">(${this.materia})</em></h2>
        <p>${this.nodes.filter(n => !n.isCenter).length} nós · ${new Date().toLocaleDateString('pt-BR')} · Template: ${this.template}</p>`;
    }

    /* Renderiza cada nó */
    this.nodes.forEach(n => {
      const el = document.createElement('div');
      el.className = 'mp-node mp-node--result' + (n.isCenter ? ' mp-node--center' : '');
      el.dataset.nodeId = n.id;
      el.style.cssText = `left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px`;

      const area = n.w * n.h;
      let bodyContent = '';

      if (n.isCenter) {
        bodyContent = `<div class="mp-node__body" style="text-align:center;display:flex;align-items:center;justify-content:center;font-family:var(--font-serif);font-size:13px;font-weight:600;color:var(--text)">${n.label}</div>`;
      } else if (area < 5000) {
        bodyContent = `<div class="mp-node__body mp-node--result-insufficient">Espaço insuf.</div>`;
      } else {
        /* Busca conteúdo gerado pela IA ou usa mock */
        let texto = '';
        if (this.aiContent && this.aiContent[n.label]) {
          texto = this.aiContent[n.label];
        } else {
          texto = MOCK_MAP_CONTENT.gerarConteudoPorTopico(n.label, area);
        }

        /* Trunca baseado no espaço disponível */
        const approxChars = Math.floor((area / 12) * 0.7);
        if (texto.length > approxChars) texto = texto.slice(0, approxChars) + '…';

        bodyContent = `<div class="mp-node__body" contenteditable="true"
          title="Clique duas vezes para editar"
          ondblclick="this.focus()">${texto}</div>`;
      }

      el.innerHTML = `<div class="mp-node__header">${n.label}</div>${bodyContent}`;

      /* Double click = edit mode */
      el.addEventListener('dblclick', () => el.classList.toggle('mp-node--editing'));
      el.addEventListener('blur', () => el.classList.remove('mp-node--editing'), true);

      resCanvas.appendChild(el);
    });

    /* Linhas */
    this._redrawLines('mp-result-svg');
  },

  /* ── SALVAR ─────────────────────────────────────────────────── */
  async salvarMapa() {
    Modal.showLoading('Salvando…', 'Adicionando à biblioteca');

    try {
      const subjects = Storage.getSubjects();
      const nomaNorm = Helpers.normalizeSubjectName(this.materia);
      let subject = subjects.find(s => s.nomeNormalizado?.toLowerCase() === nomaNorm.toLowerCase());

      if (!subject) {
        subject = {
          id:              `sub_${Date.now()}`,
          nomeOriginal:    this.materia,
          nomeNormalizado: nomaNorm,
          favorita:        false,
          criadaEm:        new Date().toISOString(),
          folhas:          [],
          mapas:           [],
        };
        subjects.push(subject);
      }

      if (!subject.mapas) subject.mapas = [];

      const novoMapa = {
        id:            `mp_${Date.now()}`,
        titulo:        this.titulo,
        tipo:          'mapa',
        template:      this.template,
        topicos:       this.nodes.filter(n => !n.isCenter).map(n => n.label),
        nodes:         this.nodes,
        aiContent:     this.aiContent,
        favorita:      false,
        criadaEm:      new Date().toISOString(),
        dataFormatada: new Date().toLocaleDateString('pt-BR'),
      };

      subject.mapas.unshift(novoMapa);
      Storage.setSubjects(subjects);

      await Helpers.wait(600);
      Modal.hideLoading();
      Router.go('materia', { subjectId: subject.id });

    } catch (err) {
      Modal.hideLoading();
      console.error('[salvarMapa]', err);
      alert('Erro ao salvar. Tente novamente.');
    }
  },

  /* ── HELPERS ─────────────────────────────────────────────────── */
  _showMsg(id, texto, tipo = 'info') {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      const m = id.match(/^mpane(\d+)-msg$/);
      if (m) {
        const pane = document.getElementById(`mpane${m[1]}`);
        if (pane) pane.insertBefore(el, pane.firstChild);
      }
    }
    el.className = `step-msg step-msg--${tipo}`;
    el.textContent = texto;
  },
};

document.addEventListener('DOMContentLoaded', () => MapaPage.init());
