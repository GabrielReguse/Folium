const MOCK_MAP_CONTENT = {
  gerarConteudoPorTopico(topico, areaPixels) {
    const density = areaPixels > 60000 ? 'grande' : areaPixels > 25000 ? 'medio' : 'pequeno';
    const tpls = {
      grande: [
        topico + ' é um conceito central que abrange múltiplas dimensões. Sua compreensão exige análise de causas, consequências e inter-relações com outros elementos do campo de estudo. Exemplos práticos ajudam a consolidar o aprendizado e tornar o conhecimento aplicável no dia a dia.',
        'O estudo de ' + topico + ' revela padrões importantes para o entendimento do tema. Identifique os elementos principais, suas funções e como se relacionam entre si. Aplicar o conhecimento em situações concretas é essencial para fixar o conteúdo.',
      ],
      medio: [
        topico + ': conceito que descreve características ou processos específicos. Compreendê-lo é essencial para dominar o tema e suas ramificações.',
        'Aspecto fundamental do tema — ' + topico + ' relaciona-se diretamente com os demais nós do mapa. Atenção às suas particularidades.',
      ],
      pequeno: [
        'Conceito-chave: ' + topico + '.',
        'Elemento essencial: ' + topico + '.',
      ],
    };
    const set = tpls[density];
    return set[Math.floor(Math.random() * set.length)];
  },
};

const TPL_LAYOUTS = {
  radial(nodes, cx, cy, W, H) {
    nodes[0].x = cx - nodes[0].w / 2;
    nodes[0].y = cy - nodes[0].h / 2;
    const r = Math.min(W, H) * 0.32;
    nodes.slice(1).forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.slice(1).length - Math.PI / 2;
      n.x = mpClamp(cx + r * Math.cos(angle) - n.w / 2, 8, W - n.w - 8);
      n.y = mpClamp(cy + r * Math.sin(angle) - n.h / 2, 8, H - n.h - 8);
    });
  },
  linear(nodes, cx, cy, W, H) {
    nodes[0].x = cx - nodes[0].w / 2; nodes[0].y = 28;
    const topics = nodes.slice(1);
    const cols = Math.ceil(Math.sqrt(topics.length));
    const topicW = Math.min(160, (W - 16) / cols - 10);
    const topicH = nodes[0].h;
    const startY = nodes[0].y + nodes[0].h + 60;
    const totalW = cols * (topicW + 10) - 10;
    const startX = (W - totalW) / 2;
    topics.forEach((n, i) => {
      n.w = topicW; n.h = topicH;
      n.x = mpClamp(startX + (i % cols) * (topicW + 10), 8, W - n.w - 8);
      n.y = mpClamp(startY + Math.floor(i / cols) * (topicH + 40), 8, H - n.h - 8);
    });
  },
  organico(nodes, cx, cy, W, H) {
    nodes[0].x = cx - nodes[0].w / 2; nodes[0].y = cy - nodes[0].h / 2;
    const angles = [-2.2, -1.1, -0.1, 0.8, 1.6, 2.5, 3.3, 4.1, 5.0, 5.9];
    const radii = [200, 230, 180, 220, 200, 210, 190, 215, 205, 195];
    nodes.slice(1).forEach((n, i) => {
      const a = angles[i % angles.length];
      const r = radii[i % radii.length];
      n.x = mpClamp(cx + r * Math.cos(a) - n.w / 2, 8, W - n.w - 8);
      n.y = mpClamp(cy + r * Math.sin(a) - n.h / 2, 8, H - n.h - 8);
    });
  },
  livre(nodes, cx, cy, W, H) {
    nodes[0].x = cx - nodes[0].w / 2; nodes[0].y = cy - nodes[0].h / 2;
    nodes.slice(1).forEach((n, i) => { n.x = 20 + (i % 4) * 50; n.y = 20 + Math.floor(i / 4) * 40; });
  },
};

function mpClamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

const MapaAI = {
  async gerarConteudo(materia, titulo, topicos) {
    try {
      const resultado = await AI2.gerarFolha(materia, titulo, 'medio',
        topicos.map(t => ({ txt: t, plano_pesquisa: null })));
      const map = {};
      (resultado.blocos || []).forEach(b => { map[b.titulo] = b.explicacao || ''; });
      return map;
    } catch (err) {
      console.error('[MapaAI] gerarConteudo:', err.message);
      throw err;
    }
  },
};

const MapaPage = {
  step: 1, modo: 'ia', materia: '', titulo: '', numTopics: 5,
  topicos: [], template: null, nodes: [], editorMode: 'ordem',
  aiContent: null, _canvasScale: 1,
  _drag: null, _resize: null, _dropdownNodeId: null,
  _boundMove: null, _boundUp: null,

  init() {
    if (!Router.requireAuth()) return;
    Navbar.renderTop({
      backRoute: 'escolher',
      backLabel: 'Escolher',
      title: '<em>Mapa Mental</em>',
    });
    Navbar.renderBottom('escolher');
    Sidebar.init();

    this._boundMove = (e) => this._onDocMove(e);
    this._boundUp = (e) => this._onDocUp(e);
    document.addEventListener('pointermove', this._boundMove, { passive: false });
    document.addEventListener('pointerup', this._boundUp);
    document.addEventListener('pointercancel', this._boundUp);

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.mp-node')) this._closeDropdown();
    });

    window.addEventListener('resize', () => {
      if (this.step === 4) this._scaleCanvas('mp-canvas', 'mp-canvas-wrap');
      if (this.step === 5) this._scaleCanvas('mp-result-canvas', 'mp-result-wrap');
    });

    this.goStep(1);
    this._runStepperIntro();
    Config.warmInBackground();
  },

  _runStepperIntro() {
    const stepper = document.getElementById('mapa-stepper');
    if (!stepper) return;
    if (stepper.dataset.introDone === '1') return;
    stepper.dataset.introDone = '1';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const schedule = [
      { sel: '#mdot1 .cs-label', start: 750,  charDelay: 80 },
      { sel: '#mdot2 .cs-label', start: 2050, charDelay: 80 },
      { sel: '#mdot3 .cs-label', start: 3300, charDelay: 85 },
      { sel: '#mdot4 .cs-label', start: 4550, charDelay: 85 },
      { sel: '#mdot5 .cs-label', start: 5800, charDelay: 85 },
    ];

    const labels = schedule.map(s => {
      const el = document.querySelector(s.sel);
      if (!el) return null;
      const txt = el.textContent;
      el.textContent = '';
      return { el, text: txt, ...s };
    }).filter(Boolean);

    stepper.classList.add('cs-anim-init');

    labels.forEach(({ el, text, start, charDelay }) => {
      setTimeout(() => {
        let i = 0;
        const tick = () => {
          if (i < text.length) {
            el.textContent += text[i++];
            setTimeout(tick, charDelay);
          }
        };
        tick();
      }, start);
    });

    setTimeout(() => { stepper.classList.remove('cs-anim-init'); }, 7000);
  },

  goStep(n) {
    this.step = n;
    for (let i = 1; i <= 5; i++) {
      const dot = document.getElementById('mdot' + i);
      const pane = document.getElementById('mpane' + i);
      if (!dot || !pane) continue;
      dot.classList.remove('active', 'done');
      if (i < n) dot.classList.add('done');
      else if (i === n) dot.classList.add('active');
      pane.classList.toggle('active', i === n);
    }
    for (let i = 1; i <= 4; i++) {
      const ln = document.getElementById('mln' + i);
      if (ln) ln.classList.toggle('done', i < n);
    }
    DOM.scrollTop();
    if (n === 4) setTimeout(() => this._initEditor(), 50);
    if (n === 5) setTimeout(() => this._renderResult(), 50);
  },

  changeNum(delta) {
    const inp = document.getElementById('mp-num');
    inp.value = mpClamp(parseInt(inp.value) + delta, 2, 10);
    this.numTopics = parseInt(inp.value);
    if (this.modo === 'manual') this._renderManualFields();
  },

  setModo(m) {
    this.modo = m;
    document.getElementById('mp-modo-ia').classList.toggle('active', m === 'ia');
    document.getElementById('mp-modo-manual').classList.toggle('active', m === 'manual');
    const fields = document.getElementById('mp-manual-fields');
    const btnTxt = document.getElementById('mp-btn-avancar-txt');
    if (m === 'manual') {
      fields.style.display = 'flex'; btnTxt.textContent = 'Continuar';
      this._renderManualFields();
    } else {
      fields.style.display = 'none'; btnTxt.textContent = 'Gerar sugestões com IA';
    }
  },

  _renderManualFields() {
    const container = document.getElementById('mp-manual-fields');
    container.innerHTML = '';
    const n = parseInt(document.getElementById('mp-num').value) || 5;
    for (let i = 0; i < n; i++) {
      const row = document.createElement('div');
      row.className = 'mp-manual-field';
      row.innerHTML = '<span class="mp-field-num">' + (i + 1) + '</span>' +
        '<input type="text" class="inp" data-idx="' + i + '" placeholder="Nome do tópico ' + (i + 1) + '…" value="' + (this.topicos[i]?.txt || '') + '" autocomplete="off">';
      container.appendChild(row);
    }
  },

  async avancar1() {
    const materiaEl = document.getElementById('mp-materia');
    const tituloEl = document.getElementById('mp-titulo');
    if (!materiaEl.value.trim()) { DOM.markError(materiaEl); return; }
    if (!tituloEl.value.trim()) { DOM.markError(tituloEl); return; }
    this.materia = Helpers.titleCase(materiaEl.value.trim());
    this.titulo = tituloEl.value.trim();
    this.numTopics = parseInt(document.getElementById('mp-num').value) || 5;

    if (this.modo === 'manual') {
      const inputs = document.querySelectorAll('#mp-manual-fields input');
      const vals = []; let ok = true;
      inputs.forEach(inp => {
        if (!inp.value.trim()) { DOM.markError(inp); ok = false; }
        else vals.push(inp.value.trim());
      });
      if (!ok) return;
      this.topicos = vals.map(txt => ({ txt, on: true }));
      this.goStep(3); return;
    }

    const btn = document.getElementById('mp-btn-avancar');
    if (btn) btn.disabled = true;
    Modal.showLoading('Conectando ao servidor…', 'Pode levar até 1 min na primeira vez');
    const online = await Config.wake();
    if (!online) { Modal.hideLoading(); if (btn) btn.disabled = false; return; }
    Modal.showLoading('IA analisando o tema…', 'Mapeando tópicos para "' + this.titulo + '"');
    try {
      this.topicos = await AI1.gerarTopicos(this.materia, this.titulo, 'medio');
      this._renderTopicos();
      this.goStep(2);
    } catch (err) {
      console.error('[MapaAI] gerarTopicos:', err.message);
      alert('Erro ao gerar tópicos: ' + err.message);
    } finally {
      Modal.hideLoading();
      if (btn) btn.disabled = false;
    }
  },

  _renderTopicos() {
    const list = document.getElementById('mp-topics-list');
    if (!list) return;
    list.innerHTML = '';
    this.topicos.forEach((t, i) => {
      const row = Card.topicRow({
        txt: t.txt, on: t.on, index: i, aviso: null,
        onToggle: (idx, chkEl) => {
          this.topicos[idx].on = !this.topicos[idx].on;
          chkEl.classList.toggle('on', this.topicos[idx].on);
          chkEl.innerHTML = this.topicos[idx].on
            ? '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;stroke:white"><polyline points="20 6 9 17 4 12"/></svg>'
            : '';
          this._updateTopicMeter(); this._checkTopicsWarning();
        },
        onRemove: (idx) => { this.topicos.splice(idx, 1); this._renderTopicos(); },
      });
      list.appendChild(row);
    });
    this._updateTopicMeter(); this._checkTopicsWarning();
  },

  _updateTopicMeter() {
    const sel = this.topicos.filter(t => t.on).length;
    const e1 = document.getElementById('mp-topic-count');
    const e2 = document.getElementById('mp-topic-total');
    if (e1) e1.textContent = sel;
    if (e2) e2.textContent = this.topicos.length;
    const btn = document.getElementById('mp-btn-aprovar');
    if (btn) btn.disabled = sel < 2;
  },

  _checkTopicsWarning() {
    const sel = this.topicos.filter(t => t.on).length;
    const av = document.getElementById('mp-topics-aviso');
    if (!av) return;
    if (sel < 2) { av.style.display = 'block'; av.textContent = 'Selecione pelo menos 2 tópicos para continuar.'; }
    else if (sel > 10) { av.style.display = 'block'; av.textContent = sel + ' tópicos — recomendamos no máximo 10.'; }
    else av.style.display = 'none';
  },

  async addTopico() {
    const inp = document.getElementById('mp-new-topic');
    const txt = inp.value.trim();
    if (!txt) { DOM.markError(inp); return; }
    const btn = document.getElementById('mp-btn-add');
    if (btn) btn.disabled = true;
    Modal.showLoading('IA verificando…', 'Analisando "' + txt + '"');
    try { await AI1.verificarTopico(txt, this.materia, this.titulo, this.topicos, 'medio'); } catch (err) { console.warn('[MapaAI] verificarTopico:', err.message); }
    Modal.hideLoading();
    if (btn) btn.disabled = false;
    this.topicos.push({ txt, on: true });
    this._renderTopicos();
    inp.value = '';
  },

  selectTemplate(tpl) {
    this.template = tpl;
    document.querySelectorAll('.mp-tpl-card').forEach(c =>
      c.classList.toggle('selected', c.dataset.tpl === tpl)
    );
    const btn = document.getElementById('mp-btn-usar-tpl');
    if (btn) btn.disabled = false;
  },

  /* ── Canvas scale — sem scrollbar horizontal ── */
  _scaleCanvas(canvasId, wrapId) {
    const wrap = document.getElementById(wrapId);
    const canvas = document.getElementById(canvasId);
    if (!wrap || !canvas) return;
    const pad = 24;
    const scale = (wrap.clientWidth - pad) / 900;
    canvas.style.transform = 'scale(' + scale + ')';
    canvas.style.marginLeft = ((wrap.clientWidth - 900 * scale) / 2) + 'px';
    canvas.style.marginTop = (pad / 2) + 'px';
    wrap.style.height = (636 * scale + pad) + 'px';
    this._canvasScale = scale;
  },

  _initEditor() {
    const canvas = document.getElementById('mp-canvas');
    if (!canvas) return;
    canvas.querySelectorAll('.mp-node').forEach(el => el.remove());

    const W = 900, H = 636, cx = W / 2, cy = H / 2;
    const selected = this.topicos.filter(t => t.on);
    const nodeW = mpClamp(Math.floor(W / (selected.length + 1.5)), 90, 175);
    const nodeH = 72;

    this.nodes = [
      { id: 'center', label: this.titulo, x: 0, y: 0, w: nodeW + 30, h: nodeH + 8, isCenter: true },
      ...selected.map((t, i) => ({
        id: 'node_' + i, label: t.txt, x: 0, y: 0, w: nodeW, h: nodeH, isCenter: false,
      })),
    ];

    (TPL_LAYOUTS[this.template] || TPL_LAYOUTS.radial)(this.nodes, cx, cy, W, H);
    this.nodes.forEach(n => this._createNodeEl(canvas, n));
    this._redrawLines('mp-canvas-svg');
    canvas.className = 'mp-canvas mp-editor--' + this.editorMode;
    this._updateHint();
    this._scaleCanvas('mp-canvas', 'mp-canvas-wrap');
  },

  _createNodeEl(canvas, node) {
    const el = document.createElement('div');
    el.className = 'mp-node' + (node.isCenter ? ' mp-node--center' : '');
    el.dataset.nodeId = node.id;
    el.style.cssText = 'left:' + node.x + 'px;top:' + node.y + 'px;width:' + node.w + 'px;height:' + node.h + 'px';

    if (node.isCenter) {
      /* Centro: sem header separado — apenas label centralizado no nó inteiro */
      el.innerHTML =
        '<div class="mp-node__center-label">' + node.label + '</div>';
    } else {
      el.innerHTML =
        '<div class="mp-node__header">' + node.label + '</div>' +
        '<div class="mp-node__body"></div>' +
        '<div class="mp-resize-handle mp-resize-handle--se" data-dir="se"></div>' +
        '<div class="mp-resize-handle mp-resize-handle--sw" data-dir="sw"></div>' +
        '<div class="mp-resize-handle mp-resize-handle--ne" data-dir="ne"></div>' +
        '<div class="mp-resize-handle mp-resize-handle--nw" data-dir="nw"></div>';
    }

    /* CLICK → dropdown (modo Ordem) */
    el.addEventListener('click', (e) => {
      if (this.editorMode !== 'ordem' || node.isCenter) return;
      e.stopPropagation();
      if (this._dropdownNodeId === node.id) { this._closeDropdown(); return; }
      this._openOrdemDropdown(node.id, el);
    });

    /* POINTERDOWN → drag / resize (modo Layout) */
    el.addEventListener('pointerdown', (e) => {
      if (this.editorMode !== 'layout') return;
      const handle = e.target.closest('.mp-resize-handle');
      e.preventDefault();
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);

      if (handle) {
        this._resize = {
          nodeId: node.id, dir: handle.dataset.dir,
          startX: e.clientX, startY: e.clientY,
          origX: node.x, origY: node.y, origW: node.w, origH: node.h,
        };
      } else {
        const scale = this._canvasScale || 1;
        const rect = canvas.getBoundingClientRect();
        this._drag = {
          nodeId: node.id,
          offsetX: (e.clientX - rect.left) / scale - node.x,
          offsetY: (e.clientY - rect.top) / scale - node.y,
        };
        el.classList.add('dragging');
      }
    });

    canvas.appendChild(el);
  },

  _onDocMove(e) {
    if (!this._drag && !this._resize) return;
    e.preventDefault();
    const canvas = document.getElementById('mp-canvas');
    if (!canvas) return;
    const scale = this._canvasScale || 1;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / scale;
    const my = (e.clientY - rect.top) / scale;
    const W = 900, H = 636;

    if (this._drag) {
      const node = this.nodes.find(n => n.id === this._drag.nodeId);
      if (!node) return;
      node.x = mpClamp(mx - this._drag.offsetX, 0, W - node.w);
      node.y = mpClamp(my - this._drag.offsetY, 0, H - node.h);
      const el = canvas.querySelector('[data-node-id="' + node.id + '"]');
      if (el) { el.style.left = node.x + 'px'; el.style.top = node.y + 'px'; }
      this._redrawLines('mp-canvas-svg');
    }

    if (this._resize) {
      const r = this._resize;
      const node = this.nodes.find(n => n.id === r.nodeId);
      if (!node) return;
      const dx = (e.clientX - r.startX) / scale;
      const dy = (e.clientY - r.startY) / scale;
      const MIN_W = 80, MIN_H = 50;
      let nx = r.origX, ny = r.origY, nw = r.origW, nh = r.origH;

      if (r.dir.includes('e')) nw = Math.max(MIN_W, r.origW + dx);
      if (r.dir.includes('s')) nh = Math.max(MIN_H, r.origH + dy);
      if (r.dir.includes('w')) { const d = Math.min(dx, r.origW - MIN_W); nx = r.origX + d; nw = r.origW - d; }
      if (r.dir.includes('n')) { const d = Math.min(dy, r.origH - MIN_H); ny = r.origY + d; nh = r.origH - d; }

      node.x = mpClamp(nx, 0, W - MIN_W);
      node.y = mpClamp(ny, 0, H - MIN_H);
      node.w = mpClamp(nw, MIN_W, W - node.x);
      node.h = mpClamp(nh, MIN_H, H - node.y);

      const el = canvas.querySelector('[data-node-id="' + node.id + '"]');
      if (el) {
        el.style.left = node.x + 'px'; el.style.top = node.y + 'px';
        el.style.width = node.w + 'px'; el.style.height = node.h + 'px';
      }
      this._redrawLines('mp-canvas-svg');
    }
  },

  _onDocUp(e) {
    const canvas = document.getElementById('mp-canvas');
    if (this._drag && canvas) {
      const el = canvas.querySelector('[data-node-id="' + this._drag.nodeId + '"]');
      if (el) { el.classList.remove('dragging'); try { el.releasePointerCapture(e.pointerId); } catch (_) { } }
      this._drag = null;
    }
    if (this._resize && canvas) {
      const el = canvas.querySelector('[data-node-id="' + this._resize.nodeId + '"]');
      if (el) { try { el.releasePointerCapture(e.pointerId); } catch (_) { } }
      this._resize = null;
    }
    if (canvas) this._checkWarnings();
  },

  _redrawLines(svgId) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    svg.innerHTML = '';
    const center = this.nodes.find(n => n.isCenter);
    if (!center) return;
    const cx = center.x + center.w / 2;
    const cy = center.y + center.h / 2;

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = '<marker id="arr-' + svgId + '" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="rgba(155,107,66,0.5)"/></marker>';
    svg.appendChild(defs);

    this.nodes.filter(n => !n.isCenter).forEach(n => {
      const tx = n.x + n.w / 2, ty = n.y + n.h / 2;
      const ang = Math.atan2(ty - cy, tx - cx);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', cx); line.setAttribute('y1', cy);
      line.setAttribute('x2', tx - Math.cos(ang) * (n.w / 2 + 2));
      line.setAttribute('y2', ty - Math.sin(ang) * (n.h / 2 + 2));
      line.setAttribute('stroke', 'rgba(155,107,66,0.45)');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('marker-end', 'url(#arr-' + svgId + ')');
      svg.appendChild(line);
    });
  },

  _checkOverlaps() {
    const canvas = document.getElementById('mp-canvas');
    if (!canvas) return;
    this.nodes.forEach(a => {
      const ov = this.nodes.some(b => b.id !== a.id &&
        a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
      canvas.querySelector('[data-node-id="' + a.id + '"]')?.classList.toggle('mp-node--warn-overlap', ov);
    });
  },

  _checkWarnings() {
    const canvas = document.getElementById('mp-canvas');
    if (!canvas) return;
    const W = 900, H = 636, warns = [];
    this.nodes.forEach(n => {
      const out = n.x < 0 || n.y < 0 || n.x + n.w > W || n.y + n.h > H;
      canvas.querySelector('[data-node-id="' + n.id + '"]')?.classList.toggle('mp-node--warn-overflow', out);
      if (out) warns.push({ type: 'red', msg: '"' + n.label + '" está fora da área imprimível.' });
    });
    this._checkOverlaps();
    const hasOv = this.nodes.some(a => this.nodes.some(b => b.id !== a.id &&
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y));
    if (hasOv) warns.push({ type: 'orange', msg: 'Sobreposição detectada. Ajuste as posições.' });
    const wEl = document.getElementById('mp-editor-warnings');
    if (wEl) wEl.innerHTML = warns.map(w => '<div class="mp-warn-item mp-warn-item--' + w.type + '">' + w.msg + '</div>').join('');
  },

  setEditorMode(mode) {
    this.editorMode = mode;
    document.getElementById('mp-mode-ordem').classList.toggle('active', mode === 'ordem');
    document.getElementById('mp-mode-layout').classList.toggle('active', mode === 'layout');
    const canvas = document.getElementById('mp-canvas');
    if (canvas) canvas.className = 'mp-canvas mp-editor--' + mode;
    this._updateHint();
    this._closeDropdown();
  },

  _updateHint() {
    const hint = document.getElementById('mp-editor-hint');
    if (!hint) return;
    hint.textContent = this.editorMode === 'ordem'
      ? 'Clique em um nó para atribuir um tópico'
      : 'Arraste para mover · Handles nos cantos para redimensionar';
  },

  _openOrdemDropdown(nodeId, anchorEl) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node || node.isCenter) return;
    document.querySelectorAll('.mp-node--selected-ordem').forEach(x => x.classList.remove('mp-node--selected-ordem'));
    anchorEl.classList.add('mp-node--selected-ordem');
    this._dropdownNodeId = nodeId;

    const dd = document.getElementById('mp-ordem-dropdown');
    const inner = document.getElementById('mp-ordem-list');
    inner.innerHTML = '<div class="mp-ordem-header">Escolha o tópico</div>';

    this.topicos.filter(t => t.on).forEach(t => {
      const inOther = this.nodes.some(n => !n.isCenter && n.id !== nodeId && n.label === t.txt);
      const opt = document.createElement('div');
      opt.className = 'mp-ordem-opt' + (inOther ? ' assigned' : '');
      opt.innerHTML = '<span class="mp-ordem-opt__dot"></span>' + t.txt;
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        this._assignTopic(nodeId, t.txt);
        this._closeDropdown();
      });
      inner.appendChild(opt);
    });

    /* Posição do dropdown — abaixo do nó (já está escalado, usar getBoundingClientRect) */
    const rect = anchorEl.getBoundingClientRect();
    dd.style.display = 'block';
    dd.style.top = (rect.bottom + 6) + 'px';
    dd.style.left = mpClamp(rect.left, 8, window.innerWidth - 250) + 'px';
  },

  _closeDropdown() {
    const dd = document.getElementById('mp-ordem-dropdown');
    if (dd) dd.style.display = 'none';
    this._dropdownNodeId = null;
    document.querySelectorAll('.mp-node--selected-ordem').forEach(x => x.classList.remove('mp-node--selected-ordem'));
  },

  _assignTopic(nodeId, txt) {
    const target = this.nodes.find(n => n.id === nodeId);
    const other = this.nodes.find(n => n.label === txt && n.id !== nodeId && !n.isCenter);
    if (!target) return;
    if (other) {
      other.label = target.label;
      const oEl = document.querySelector('[data-node-id="' + other.id + '"] .mp-node__header');
      if (oEl) oEl.textContent = other.label;
    }
    target.label = txt;
    const el = document.querySelector('[data-node-id="' + nodeId + '"] .mp-node__header');
    if (el) el.textContent = txt;
  },

  async gerarMapa() {
    this._checkWarnings();
    Modal.showLoading('Conectando ao servidor…', 'Pode levar até 1 min');
    const online = await Config.wake();
    if (!online) { Modal.hideLoading(); return; }
    Modal.showLoading('IA gerando conteúdo…', 'Preenchendo cada nó do mapa');
    const topicos = this.nodes.filter(n => !n.isCenter).map(n => n.label);
    try {
      this.aiContent = await MapaAI.gerarConteudo(this.materia, this.titulo, topicos);
      this.goStep(5);
    } catch (err) {
      alert('Erro ao gerar conteúdo: ' + err.message);
    } finally {
      Modal.hideLoading();
    }
  },

  _renderResult() {
    const resCanvas = document.getElementById('mp-result-canvas');
    if (!resCanvas) return;
    resCanvas.querySelectorAll('.mp-node').forEach(el => el.remove());

    const header = document.getElementById('mp-result-header');
    if (header) {
      header.className = 'mp-result-header';
      header.innerHTML =
        '<span class="badge badge-accent" style="font-size:11px">Gerado por IA</span>' +
        '<h2 style="font-family:var(--font-serif);font-size:22px;font-weight:600;color:var(--text);margin:8px 0 4px">' +
        this.titulo + ' <em style="font-size:16px;color:var(--caramel)">(' + this.materia + ')</em></h2>' +
        '<p style="font-size:13px;color:var(--text-mid);margin:0">' +
        this.nodes.filter(n => !n.isCenter).length + ' nós · ' +
        new Date().toLocaleDateString('pt-BR') + ' · Template: ' + this.template + '</p>';
    }

    this.nodes.forEach(n => {
      const el = document.createElement('div');
      el.className = 'mp-node mp-node--result' + (n.isCenter ? ' mp-node--center' : '');
      el.dataset.nodeId = n.id;
      el.style.cssText = 'left:' + n.x + 'px;top:' + n.y + 'px;width:' + n.w + 'px;height:' + n.h + 'px';

      let body;
      if (n.isCenter) {
        /* Apenas o label centralizado — sem header separado */
        body = '<div class="mp-node__center-label">' + n.label + '</div>';
      } else if ((n.w * n.h) < 4000) {
        body = '<div class="mp-node__header">' + n.label + '</div>' +
          '<div class="mp-node__body mp-node--result-insufficient">Espaço insuf.</div>';
      } else {
        /* Truncagem baseada no espaço visual real:
           header ~30px, corpo = H-30, line-height ~16px, charWidth ~6px */
        const bodyH = Math.max(0, n.h - 30);
        const lines = Math.floor(bodyH / 16);
        const charsPerLine = Math.floor(n.w / 6.2);
        const maxChars = Math.max(10, lines * charsPerLine);

        let texto = (this.aiContent && this.aiContent[n.label])
          ? this.aiContent[n.label]
          : MOCK_MAP_CONTENT.gerarConteudoPorTopico(n.label, n.w * n.h);
        if (texto.length > maxChars) {
          const trecho = texto.slice(0, maxChars);
          // Tenta terminar na última frase completa (. ! ?)
          const ultimaFrase = Math.max(
            trecho.lastIndexOf('. '),
            trecho.lastIndexOf('! '),
            trecho.lastIndexOf('? '),
            trecho.lastIndexOf('.'),
            trecho.lastIndexOf('!'),
            );
          if (ultimaFrase > maxChars * 0.4) {
            // Inclui o ponto final da frase
            texto = trecho.slice(0, ultimaFrase + 1);
          } else {
            // Fallback: corta na última palavra completa
            const ultimaVirgula = trecho.lastIndexOf(', ');
            const ultimoEspaco = trecho.lastIndexOf(' ');
            const corte = ultimaVirgula > maxChars * 0.5 ? ultimaVirgula + 1 : ultimoEspaco;
            texto = trecho.slice(0, corte > 0 ? corte : maxChars).trimEnd();
          }
        }

        body = '<div class="mp-node__header">' + n.label + '</div>' +
          '<div class="mp-node__body" contenteditable="true" title="Duplo clique para editar">' + texto + '</div>';
      }

      el.innerHTML = body;
      el.addEventListener('dblclick', () => el.classList.toggle('mp-node--editing'));
      el.addEventListener('blur', () => el.classList.remove('mp-node--editing'), true);
      resCanvas.appendChild(el);
    });

    this._redrawLines('mp-result-svg');
    this._scaleCanvas('mp-result-canvas', 'mp-result-wrap');
  },

  async salvarMapa() {
    Modal.showLoading('Salvando…', 'Adicionando à biblioteca');
    try {
      const subjects = Storage.getSubjects();
      const nomaNorm = Helpers.normalizeSubjectName(this.materia);
      let subject = subjects.find(s => s.nomeNormalizado?.toLowerCase() === nomaNorm.toLowerCase());
      if (!subject) {
        subject = {
          id: 'sub_' + Date.now(), nomeOriginal: this.materia, nomeNormalizado: nomaNorm,
          favorita: false, criadaEm: new Date().toISOString(), folhas: [], mapas: []
        };
        subjects.push(subject);
      }
      if (!subject.mapas) subject.mapas = [];
      subject.mapas.unshift({
        id: 'mp_' + Date.now(), titulo: this.titulo, tipo: 'mapa', template: this.template,
        topicos: this.nodes.filter(n => !n.isCenter).map(n => n.label),
        nodes: this.nodes, aiContent: this.aiContent, favorita: false,
        criadaEm: new Date().toISOString(), dataFormatada: new Date().toLocaleDateString('pt-BR'),
      });
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
};

document.addEventListener('DOMContentLoaded', () => MapaPage.init());
