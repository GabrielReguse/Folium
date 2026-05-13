const MOCK_MAP_CONTENT = {
  gerarConteudoPorTopico(topico, areaPixels) {
    const density =
      areaPixels > 60000 ? "grande" : areaPixels > 25000 ? "medio" : "pequeno";
    const tpls = {
      grande: [
        topico +
          " é um conceito central que abrange múltiplas dimensões. Sua compreensão exige análise de causas, consequências e inter-relações com outros elementos do campo de estudo. Exemplos práticos ajudam a consolidar o aprendizado e tornar o conhecimento aplicável no dia a dia.",
        "O estudo de " +
          topico +
          " revela padrões importantes para o entendimento do tema. Identifique os elementos principais, suas funções e como se relacionam entre si. Aplicar o conhecimento em situações concretas é essencial para fixar o conteúdo.",
      ],
      medio: [
        topico +
          ": conceito que descreve características ou processos específicos. Compreendê-lo é essencial para dominar o tema e suas ramificações.",
        "Aspecto fundamental do tema — " +
          topico +
          " relaciona-se diretamente com os demais nós do mapa. Atenção às suas particularidades.",
      ],
      pequeno: [
        "Conceito-chave: " + topico + ".",
        "Elemento essencial: " + topico + ".",
      ],
    };
    const set = tpls[density];
    return set[Math.floor(Math.random() * set.length)];
  },
};

const MP_CANVAS_W = 900;
const MP_CANVAS_H = 636;
const MP_CONNECTOR_GAP = 10;
const MP_ROUTE_STEP = 10;
const MP_NODE_MIN_W = 158;
const MP_NODE_MAX_W = 220;
const MP_NODE_DEFAULT_H = 96;

const TPL_LAYOUTS = {
  radial(nodes, cx, cy, W, H) {
    nodes[0].x = cx - nodes[0].w / 2;
    nodes[0].y = cy - nodes[0].h / 2;
    const r = Math.min(W, H) * 0.36;
    nodes.slice(1).forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.slice(1).length - Math.PI / 2;
      n.x = mpClamp(cx + r * Math.cos(angle) - n.w / 2, 8, W - n.w - 8);
      n.y = mpClamp(cy + r * Math.sin(angle) - n.h / 2, 8, H - n.h - 8);
    });
  },
  linear(nodes, cx, cy, W, H) {
    nodes[0].x = cx - nodes[0].w / 2;
    nodes[0].y = 28;
    const topics = nodes.slice(1);
    const cols = Math.ceil(Math.sqrt(topics.length));
    const gapX = 36;
    const gapY = 54;
    const topicW = mpClamp(
      Math.floor((W - 16 - (cols - 1) * gapX) / cols),
      150,
      210,
    );
    const topicH = Math.max(MP_NODE_DEFAULT_H, nodes[0].h - 10);
    const startY = nodes[0].y + nodes[0].h + 72;
    const totalW = cols * topicW + (cols - 1) * gapX;
    const startX = (W - totalW) / 2;
    topics.forEach((n, i) => {
      n.w = topicW;
      n.h = topicH;
      n.x = mpClamp(startX + (i % cols) * (topicW + gapX), 8, W - n.w - 8);
      n.y = mpClamp(
        startY + Math.floor(i / cols) * (topicH + gapY),
        8,
        H - n.h - 8,
      );
    });
  },
  organico(nodes, cx, cy, W, H) {
    nodes[0].x = cx - nodes[0].w / 2;
    nodes[0].y = cy - nodes[0].h / 2;
    const topics = nodes.slice(1);
    const rxBase = Math.min(W * 0.34, 310);
    const ryBase = Math.min(H * 0.34, 230);
    const wobble = [0, 28, -22, 18, -14, 25, -18, 12, -26, 20];
    topics.forEach((n, i) => {
      const count = Math.max(1, topics.length);
      const a =
        -Math.PI / 2 +
        (2 * Math.PI * i) / count +
        (i % 2 === 0 ? -0.08 : 0.12);
      const rx = rxBase + wobble[i % wobble.length];
      const ry = ryBase + wobble[(i + 3) % wobble.length] * 0.45;
      n.x = mpClamp(cx + rx * Math.cos(a) - n.w / 2, 8, W - n.w - 8);
      n.y = mpClamp(cy + ry * Math.sin(a) - n.h / 2, 8, H - n.h - 8);
    });
  },
  livre(nodes, cx, cy, W, H) {
    nodes[0].x = cx - nodes[0].w / 2;
    nodes[0].y = cy - nodes[0].h / 2;
    const topics = nodes.slice(1);
    const pad = 24;
    const rows = Math.max(1, Math.ceil(topics.length / 2));
    topics.forEach((n, i) => {
      const row = Math.floor(i / 2);
      const rightSide = i % 2 === 1;
      const availableY = H - pad * 2 - n.h;
      const stepY = rows > 1 ? Math.min(n.h + 40, availableY / (rows - 1)) : 0;
      n.x = rightSide ? W - pad - n.w : pad;
      n.y = mpClamp(pad + row * stepY, 8, H - n.h - 8);
    });
  },
};

function mpClamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

const MapaAI = {
  async gerarConteudo(materia, titulo, topicos) {
    try {
      const resultado = await AI2.gerarFolha(
        materia,
        titulo,
        "medio",
        topicos.map((t) => ({ txt: t, plano_pesquisa: null })),
      );
      const map = {};
      (resultado.blocos || []).forEach((b) => {
        map[b.titulo] = b.explicacao || "";
      });
      return map;
    } catch (err) {
      console.error("[MapaAI] gerarConteudo:", err.message);
      throw err;
    }
  },
};

const MapaPage = {
  step: 1,
  modo: "ia",
  materia: "",
  titulo: "",
  numTopics: 5,
  topicos: [],
  template: null,
  nodes: [],
  editorMode: "ordem",
  aiContent: null,
  _canvasScale: 1,
  _drag: null,
  _resize: null,
  _dropdownNodeId: null,
  _boundMove: null,
  _boundUp: null,

  init() {
    if (!Router.requireAuth()) return;
    Navbar.renderTop({
      backRoute: "escolher",
      backLabel: "Escolher",
      title: "<em>Mapa Mental</em>",
    });
    Navbar.renderBottom("escolher");
    Sidebar.init();

    this._boundMove = (e) => this._onDocMove(e);
    this._boundUp = (e) => this._onDocUp(e);
    document.addEventListener("pointermove", this._boundMove, {
      passive: false,
    });
    document.addEventListener("pointerup", this._boundUp);
    document.addEventListener("pointercancel", this._boundUp);

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".mp-node")) this._closeDropdown();
    });

    window.addEventListener("resize", () => {
      if (this.step === 4) this._scaleCanvas("mp-canvas", "mp-canvas-wrap");
      if (this.step === 5)
        this._scaleCanvas("mp-result-canvas", "mp-result-wrap");
    });

    this.goStep(1);
    this._runStepperIntro();
    Config.warmInBackground();
  },

  _runStepperIntro() {
    const stepper = document.getElementById("mapa-stepper");
    if (!stepper) return;
    if (stepper.dataset.introDone === "1") return;
    stepper.dataset.introDone = "1";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const schedule = [
      { sel: "#mdot1 .cs-label", start: 750, charDelay: 80 },
      { sel: "#mdot2 .cs-label", start: 2050, charDelay: 80 },
      { sel: "#mdot3 .cs-label", start: 3300, charDelay: 85 },
      { sel: "#mdot4 .cs-label", start: 4550, charDelay: 85 },
      { sel: "#mdot5 .cs-label", start: 5800, charDelay: 85 },
    ];

    const labels = schedule
      .map((s) => {
        const el = document.querySelector(s.sel);
        if (!el) return null;
        const txt = el.textContent;
        el.textContent = "";
        return { el, text: txt, ...s };
      })
      .filter(Boolean);

    stepper.classList.add("cs-anim-init");

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

    setTimeout(() => {
      stepper.classList.remove("cs-anim-init");
    }, 7000);
  },

  goStep(n) {
    this.step = n;
    for (let i = 1; i <= 5; i++) {
      const dot = document.getElementById("mdot" + i);
      const pane = document.getElementById("mpane" + i);
      if (!dot || !pane) continue;
      dot.classList.remove("active", "done");
      if (i < n) dot.classList.add("done");
      else if (i === n) dot.classList.add("active");
      pane.classList.toggle("active", i === n);
    }
    for (let i = 1; i <= 4; i++) {
      const ln = document.getElementById("mln" + i);
      if (ln) ln.classList.toggle("done", i < n);
    }
    DOM.scrollTop();
    if (n === 4) setTimeout(() => this._initEditor(), 50);
    if (n === 5) setTimeout(() => this._renderResult(), 50);
  },

  changeNum(delta) {
    const inp = document.getElementById("mp-num");
    inp.value = mpClamp(parseInt(inp.value) + delta, 2, 10);
    this.numTopics = parseInt(inp.value);
    if (this.modo === "manual") this._renderManualFields();
  },

  setModo(m) {
    this.modo = m;
    document
      .getElementById("mp-modo-ia")
      .classList.toggle("active", m === "ia");
    document
      .getElementById("mp-modo-manual")
      .classList.toggle("active", m === "manual");
    const fields = document.getElementById("mp-manual-fields");
    const btnTxt = document.getElementById("mp-btn-avancar-txt");
    if (m === "manual") {
      fields.style.display = "flex";
      btnTxt.textContent = "Continuar";
      this._renderManualFields();
    } else {
      fields.style.display = "none";
      btnTxt.textContent = "Gerar sugestões com IA";
    }
  },

  _renderManualFields() {
    const container = document.getElementById("mp-manual-fields");
    container.innerHTML = "";
    const n = parseInt(document.getElementById("mp-num").value) || 5;
    for (let i = 0; i < n; i++) {
      const row = document.createElement("div");
      row.className = "mp-manual-field";
      row.innerHTML =
        '<span class="mp-field-num">' +
        (i + 1) +
        "</span>" +
        '<input type="text" class="inp" data-idx="' +
        i +
        '" placeholder="Nome do tópico ' +
        (i + 1) +
        '…" value="' +
        (this.topicos[i]?.txt || "") +
        '" autocomplete="off">';
      container.appendChild(row);
    }
  },

  async avancar1() {
    const materiaEl = document.getElementById("mp-materia");
    const tituloEl = document.getElementById("mp-titulo");
    if (!materiaEl.value.trim()) {
      DOM.markError(materiaEl);
      return;
    }
    if (!tituloEl.value.trim()) {
      DOM.markError(tituloEl);
      return;
    }
    this.materia = Helpers.titleCase(materiaEl.value.trim());
    this.titulo = tituloEl.value.trim();
    this.numTopics = parseInt(document.getElementById("mp-num").value) || 5;

    if (this.modo === "manual") {
      const inputs = document.querySelectorAll("#mp-manual-fields input");
      const vals = [];
      let ok = true;
      inputs.forEach((inp) => {
        if (!inp.value.trim()) {
          DOM.markError(inp);
          ok = false;
        } else vals.push(inp.value.trim());
      });
      if (!ok) return;
      this.topicos = vals.map((txt) => ({ txt, on: true }));
      this.goStep(3);
      return;
    }

    const btn = document.getElementById("mp-btn-avancar");
    if (btn) btn.disabled = true;
    Modal.showLoading(
      "Conectando ao servidor…",
      "Pode levar até 1 min na primeira vez",
    );
    const online = await Config.wake();
    if (!online) {
      Modal.hideLoading();
      if (btn) btn.disabled = false;
      return;
    }
    Modal.showLoading(
      "IA analisando o tema…",
      'Mapeando tópicos para "' + this.titulo + '"',
    );
    try {
      this.topicos = await AI1.gerarTopicos(this.materia, this.titulo, "medio");
      this._renderTopicos();
      this.goStep(2);
    } catch (err) {
      console.error("[MapaAI] gerarTopicos:", err.message);
      alert("Erro ao gerar tópicos: " + err.message);
    } finally {
      Modal.hideLoading();
      if (btn) btn.disabled = false;
    }
  },

  _renderTopicos() {
    const list = document.getElementById("mp-topics-list");
    if (!list) return;
    list.innerHTML = "";
    this.topicos.forEach((t, i) => {
      const row = Card.topicRow({
        txt: t.txt,
        on: t.on,
        index: i,
        aviso: null,
        onToggle: (idx, chkEl) => {
          this.topicos[idx].on = !this.topicos[idx].on;
          chkEl.classList.toggle("on", this.topicos[idx].on);
          chkEl.innerHTML = this.topicos[idx].on
            ? '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;stroke:white"><polyline points="20 6 9 17 4 12"/></svg>'
            : "";
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
    const sel = this.topicos.filter((t) => t.on).length;
    const e1 = document.getElementById("mp-topic-count");
    const e2 = document.getElementById("mp-topic-total");
    if (e1) e1.textContent = sel;
    if (e2) e2.textContent = this.topicos.length;
    const btn = document.getElementById("mp-btn-aprovar");
    if (btn) btn.disabled = sel < 2;
  },

  _checkTopicsWarning() {
    const sel = this.topicos.filter((t) => t.on).length;
    const av = document.getElementById("mp-topics-aviso");
    if (!av) return;
    if (sel < 2) {
      av.style.display = "block";
      av.textContent = "Selecione pelo menos 2 tópicos para continuar.";
    } else if (sel > 10) {
      av.style.display = "block";
      av.textContent = sel + " tópicos — recomendamos no máximo 10.";
    } else av.style.display = "none";
  },

  async addTopico() {
    const inp = document.getElementById("mp-new-topic");
    const txt = inp.value.trim();
    if (!txt) {
      DOM.markError(inp);
      return;
    }
    const btn = document.getElementById("mp-btn-add");
    if (btn) btn.disabled = true;
    Modal.showLoading("IA verificando…", 'Analisando "' + txt + '"');
    try {
      await AI1.verificarTopico(
        txt,
        this.materia,
        this.titulo,
        this.topicos,
        "medio",
      );
    } catch (err) {
      console.warn("[MapaAI] verificarTopico:", err.message);
    }
    Modal.hideLoading();
    if (btn) btn.disabled = false;
    this.topicos.push({ txt, on: true });
    this._renderTopicos();
    inp.value = "";
  },

  selectTemplate(tpl) {
    this.template = tpl;
    document
      .querySelectorAll(".mp-tpl-card")
      .forEach((c) => c.classList.toggle("selected", c.dataset.tpl === tpl));
    const btn = document.getElementById("mp-btn-usar-tpl");
    if (btn) btn.disabled = false;
  },

  _scaleCanvas(canvasId, wrapId) {
    const wrap = document.getElementById(wrapId);
    const canvas = document.getElementById(canvasId);
    if (!wrap || !canvas) return;
    const pad = 24;
    const scale = (wrap.clientWidth - pad) / MP_CANVAS_W;
    canvas.style.transform = "scale(" + scale + ")";
    canvas.style.marginLeft = (wrap.clientWidth - MP_CANVAS_W * scale) / 2 + "px";
    canvas.style.marginTop = pad / 2 + "px";
    wrap.style.height = MP_CANVAS_H * scale + pad + "px";
    this._canvasScale = scale;
  },

  _initEditor() {
    const canvas = document.getElementById("mp-canvas");
    if (!canvas) return;
    canvas.querySelectorAll(".mp-node").forEach((el) => el.remove());

    const W = MP_CANVAS_W,
      H = MP_CANVAS_H,
      cx = W / 2,
      cy = H / 2;
    const selected = this.topicos.filter((t) => t.on);
    const topicCount = Math.max(1, selected.length);
    const nodeW = mpClamp(
      Math.round(230 - topicCount * 6),
      MP_NODE_MIN_W,
      MP_NODE_MAX_W,
    );
    const nodeH = MP_NODE_DEFAULT_H;

    this.nodes = [
      {
        id: "center",
        label: this.titulo,
        x: 0,
        y: 0,
        w: nodeW + 36,
        h: nodeH + 12,
        isCenter: true,
      },
      ...selected.map((t, i) => ({
        id: "node_" + i,
        label: t.txt,
        x: 0,
        y: 0,
        w: nodeW,
        h: nodeH,
        isCenter: false,
      })),
    ];

    (TPL_LAYOUTS[this.template] || TPL_LAYOUTS.radial)(
      this.nodes,
      cx,
      cy,
      W,
      H,
    );
    this._resolveNodeSpacing(W, H);
    this.nodes.forEach((n) => this._createNodeEl(canvas, n));
    this._redrawLines("mp-canvas-svg");
    canvas.className = "mp-canvas mp-editor--" + this.editorMode;
    this._updateHint();
    this._scaleCanvas("mp-canvas", "mp-canvas-wrap");
  },

  _resolveNodeSpacing(W, H) {
    const margin = MP_CONNECTOR_GAP * 2;
    const roomX = (node, direction) => {
      if (node.isCenter) return 0;
      return direction < 0
        ? node.x - MP_CONNECTOR_GAP
        : W - MP_CONNECTOR_GAP - (node.x + node.w);
    };
    const roomY = (node, direction) => {
      if (node.isCenter) return 0;
      return direction < 0
        ? node.y - MP_CONNECTOR_GAP
        : H - MP_CONNECTOR_GAP - (node.y + node.h);
    };

    for (let iter = 0; iter < 120; iter++) {
      let moved = false;
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const a = this.nodes[i];
          const b = this.nodes[j];
          const acx = a.x + a.w / 2;
          const acy = a.y + a.h / 2;
          const bcx = b.x + b.w / 2;
          const bcy = b.y + b.h / 2;
          const dx = bcx - acx || 0.01;
          const dy = bcy - acy || 0.01;
          const overlapX = a.w / 2 + b.w / 2 + margin - Math.abs(dx);
          const overlapY = a.h / 2 + b.h / 2 + margin - Math.abs(dy);
          if (overlapX <= 0 || overlapY <= 0) continue;

          const xDir = Math.sign(dx);
          const yDir = Math.sign(dy);
          const roomForX = roomX(a, -xDir) + roomX(b, xDir);
          const roomForY = roomY(a, -yDir) + roomY(b, yDir);
          const pushX =
            overlapX < overlapY
              ? roomForX >= overlapX || roomForX >= roomForY
              : !(roomForY >= overlapY || roomForY > roomForX);
          const dir = pushX ? xDir : yDir;
          const amount = (pushX ? overlapX : overlapY) / 2 + 0.5;
          const moveA = a.isCenter ? 0 : b.isCenter ? 1 : 0.5;
          const moveB = b.isCenter ? 0 : a.isCenter ? 1 : 0.5;

          if (pushX) {
            a.x -= dir * amount * moveA;
            b.x += dir * amount * moveB;
          } else {
            a.y -= dir * amount * moveA;
            b.y += dir * amount * moveB;
          }
          moved = true;
        }
      }

      this.nodes.forEach((n) => {
        n.x = mpClamp(n.x, MP_CONNECTOR_GAP, W - n.w - MP_CONNECTOR_GAP);
        n.y = mpClamp(n.y, MP_CONNECTOR_GAP, H - n.h - MP_CONNECTOR_GAP);
      });
      if (!moved) break;
    }
  },

  _createNodeEl(canvas, node) {
    const el = document.createElement("div");
    el.className = "mp-node" + (node.isCenter ? " mp-node--center" : "");
    el.dataset.nodeId = node.id;
    el.style.cssText =
      "left:" +
      node.x +
      "px;top:" +
      node.y +
      "px;width:" +
      node.w +
      "px;height:" +
      node.h +
      "px";

    if (node.isCenter) {
      el.innerHTML =
        '<div class="mp-node__center-label">' + node.label + "</div>";
    } else {
      el.innerHTML =
        '<div class="mp-node__header">' +
        node.label +
        "</div>" +
        '<div class="mp-node__body"></div>' +
        '<div class="mp-resize-handle mp-resize-handle--se" data-dir="se"></div>' +
        '<div class="mp-resize-handle mp-resize-handle--sw" data-dir="sw"></div>' +
        '<div class="mp-resize-handle mp-resize-handle--ne" data-dir="ne"></div>' +
        '<div class="mp-resize-handle mp-resize-handle--nw" data-dir="nw"></div>';
    }

    el.addEventListener("click", (e) => {
      if (this.editorMode !== "ordem" || node.isCenter) return;
      e.stopPropagation();
      if (this._dropdownNodeId === node.id) {
        this._closeDropdown();
        return;
      }
      this._openOrdemDropdown(node.id, el);
    });

    el.addEventListener("pointerdown", (e) => {
      if (this.editorMode !== "layout") return;
      const handle = e.target.closest(".mp-resize-handle");
      e.preventDefault();
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);

      if (handle) {
        this._resize = {
          nodeId: node.id,
          dir: handle.dataset.dir,
          startX: e.clientX,
          startY: e.clientY,
          origX: node.x,
          origY: node.y,
          origW: node.w,
          origH: node.h,
        };
      } else {
        const scale = this._canvasScale || 1;
        const rect = canvas.getBoundingClientRect();
        this._drag = {
          nodeId: node.id,
          offsetX: (e.clientX - rect.left) / scale - node.x,
          offsetY: (e.clientY - rect.top) / scale - node.y,
        };
        el.classList.add("dragging");
      }
    });

    canvas.appendChild(el);
  },

  _onDocMove(e) {
    if (!this._drag && !this._resize) return;
    e.preventDefault();
    const canvas = document.getElementById("mp-canvas");
    if (!canvas) return;
    const scale = this._canvasScale || 1;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / scale;
    const my = (e.clientY - rect.top) / scale;
    const W = MP_CANVAS_W,
      H = MP_CANVAS_H;

    if (this._drag) {
      const node = this.nodes.find((n) => n.id === this._drag.nodeId);
      if (!node) return;
      node.x = mpClamp(
        mx - this._drag.offsetX,
        MP_CONNECTOR_GAP,
        W - node.w - MP_CONNECTOR_GAP,
      );
      node.y = mpClamp(
        my - this._drag.offsetY,
        MP_CONNECTOR_GAP,
        H - node.h - MP_CONNECTOR_GAP,
      );
      const el = canvas.querySelector('[data-node-id="' + node.id + '"]');
      if (el) {
        el.style.left = node.x + "px";
        el.style.top = node.y + "px";
      }
      this._redrawLines("mp-canvas-svg");
    }

    if (this._resize) {
      const r = this._resize;
      const node = this.nodes.find((n) => n.id === r.nodeId);
      if (!node) return;
      const dx = (e.clientX - r.startX) / scale;
      const dy = (e.clientY - r.startY) / scale;
      const MIN_W = 80,
        MIN_H = 50;
      let nx = r.origX,
        ny = r.origY,
        nw = r.origW,
        nh = r.origH;

      if (r.dir.includes("e")) nw = Math.max(MIN_W, r.origW + dx);
      if (r.dir.includes("s")) nh = Math.max(MIN_H, r.origH + dy);
      if (r.dir.includes("w")) {
        const d = Math.min(dx, r.origW - MIN_W);
        nx = r.origX + d;
        nw = r.origW - d;
      }
      if (r.dir.includes("n")) {
        const d = Math.min(dy, r.origH - MIN_H);
        ny = r.origY + d;
        nh = r.origH - d;
      }

      node.x = mpClamp(nx, MP_CONNECTOR_GAP, W - MIN_W - MP_CONNECTOR_GAP);
      node.y = mpClamp(ny, MP_CONNECTOR_GAP, H - MIN_H - MP_CONNECTOR_GAP);
      node.w = mpClamp(nw, MIN_W, W - node.x - MP_CONNECTOR_GAP);
      node.h = mpClamp(nh, MIN_H, H - node.y - MP_CONNECTOR_GAP);

      const el = canvas.querySelector('[data-node-id="' + node.id + '"]');
      if (el) {
        el.style.left = node.x + "px";
        el.style.top = node.y + "px";
        el.style.width = node.w + "px";
        el.style.height = node.h + "px";
      }
      this._redrawLines("mp-canvas-svg");
    }
  },

  _onDocUp(e) {
    const canvas = document.getElementById("mp-canvas");
    if (this._drag && canvas) {
      const el = canvas.querySelector(
        '[data-node-id="' + this._drag.nodeId + '"]',
      );
      if (el) {
        el.classList.remove("dragging");
        try {
          el.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
      this._drag = null;
    }
    if (this._resize && canvas) {
      const el = canvas.querySelector(
        '[data-node-id="' + this._resize.nodeId + '"]',
      );
      if (el) {
        try {
          el.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
      this._resize = null;
    }
    if (canvas) this._checkWarnings();
  },

  _redrawLines(svgId) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    svg.innerHTML = "";
    const center = this.nodes.find((n) => n.isCenter);
    if (!center) return;
    const topics = this.nodes.filter((n) => !n.isCenter);

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML =
      '<marker id="arr-' +
      svgId +
      '" markerWidth="9" markerHeight="7" refX="8.5" refY="3.5" orient="auto"><polygon points="0 0,9 3.5,0 7" fill="rgba(155,107,66,0.58)"/></marker>';
    svg.appendChild(defs);

    const sides = { left: [], right: [], top: [], bottom: [] };
    topics.forEach((node) => {
      const side = this._connectionSide(center, node);
      sides[side].push(node);
    });

    const routeMeta = new Map();
    Object.entries(sides).forEach(([side, nodes]) => {
      const isHorizontal = side === "left" || side === "right";
      nodes
        .sort((a, b) =>
          isHorizontal
            ? a.y + a.h / 2 - (b.y + b.h / 2)
            : a.x + a.w / 2 - (b.x + b.w / 2),
        )
        .forEach((node, idx) => {
          routeMeta.set(node.id, {
            side,
            slot: (idx + 1) / (nodes.length + 1),
          });
        });
    });

    const usedCells = new Set();
    topics.forEach((node) => {
      const meta = routeMeta.get(node.id) || {
        side: this._connectionSide(center, node),
        slot: 0.5,
      };
      const points = this._bestConnectorRoute(
        center,
        node,
        meta.side,
        meta.slot,
        usedCells,
      );

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", this._pathToD(points));
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "rgba(155,107,66,0.46)");
      path.setAttribute("stroke-width", "1.7");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("marker-end", "url(#arr-" + svgId + ")");
      svg.appendChild(path);
      this._markRouteUsage(points, usedCells);
    });
  },

  _connectionSide(source, target) {
    const sx = source.x + source.w / 2;
    const sy = source.y + source.h / 2;
    const tx = target.x + target.w / 2;
    const ty = target.y + target.h / 2;
    const dx = tx - sx;
    const dy = ty - sy;
    const minGap = MP_CONNECTOR_GAP * 2;
    const belowGap = target.y - (source.y + source.h);
    const aboveGap = source.y - (target.y + target.h);
    const rightGap = target.x - (source.x + source.w);
    const leftGap = source.x - (target.x + target.w);
    const hasVerticalGap = belowGap >= minGap || aboveGap >= minGap;
    const hasHorizontalGap = rightGap >= minGap || leftGap >= minGap;
    const preferVertical = Math.abs(dy) >= Math.abs(dx) * 0.55;
    const preferHorizontal = Math.abs(dx) >= Math.abs(dy) * 0.55;

    if (dy >= 0 && belowGap >= minGap && (preferVertical || !hasHorizontalGap)) {
      return "bottom";
    }
    if (dy < 0 && aboveGap >= minGap && (preferVertical || !hasHorizontalGap)) {
      return "top";
    }
    if (dx >= 0 && rightGap >= minGap && (preferHorizontal || !hasVerticalGap)) {
      return "right";
    }
    if (dx < 0 && leftGap >= minGap && (preferHorizontal || !hasVerticalGap)) {
      return "left";
    }
    if (dy >= 0 && belowGap >= minGap) return "bottom";
    if (dy < 0 && aboveGap >= minGap) return "top";
    if (dx >= 0 && rightGap >= minGap) return "right";
    if (dx < 0 && leftGap >= minGap) return "left";
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
    return dy >= 0 ? "bottom" : "top";
  },

  _connectionAnchors(source, target, side, slot) {
    const gap = MP_CONNECTOR_GAP;
    const pad = 14;
    const safeSlot = mpClamp(slot || 0.5, 0.08, 0.92);
    let start;
    let end;

    if (side === "right") {
      start = {
        x: source.x + source.w + gap,
        y: source.y + pad + (source.h - pad * 2) * safeSlot,
      };
      end = {
        x: target.x - gap,
        y: mpClamp(start.y, target.y + pad, target.y + target.h - pad),
      };
    } else if (side === "left") {
      start = {
        x: source.x - gap,
        y: source.y + pad + (source.h - pad * 2) * safeSlot,
      };
      end = {
        x: target.x + target.w + gap,
        y: mpClamp(start.y, target.y + pad, target.y + target.h - pad),
      };
    } else if (side === "bottom") {
      start = {
        x: source.x + pad + (source.w - pad * 2) * safeSlot,
        y: source.y + source.h + gap,
      };
      end = {
        x: mpClamp(start.x, target.x + pad, target.x + target.w - pad),
        y: target.y - gap,
      };
    } else {
      start = {
        x: source.x + pad + (source.w - pad * 2) * safeSlot,
        y: source.y - gap,
      };
      end = {
        x: mpClamp(start.x, target.x + pad, target.x + target.w - pad),
        y: target.y + target.h + gap,
      };
    }

    return {
      start: this._clampConnectorPoint(start),
      end: this._clampConnectorPoint(end),
    };
  },

  _clampConnectorPoint(point) {
    return {
      x: mpClamp(point.x, 2, MP_CANVAS_W - 2),
      y: mpClamp(point.y, 2, MP_CANVAS_H - 2),
    };
  },

  _bestConnectorRoute(source, target, preferredSide, preferredSlot, usedCells) {
    const sideOrder = [preferredSide, "bottom", "top", "right", "left"].filter(
      (side, idx, arr) => side && arr.indexOf(side) === idx,
    );
    const slotOrder = [preferredSlot || 0.5, 0.5, 0.25, 0.75].filter(
      (slot, idx, arr) => arr.indexOf(slot) === idx,
    );
    let best = null;

    sideOrder.forEach((side, sideIdx) => {
      slotOrder.forEach((slot) => {
        const anchors = this._connectionAnchors(source, target, side, slot);
        const path = this._routeConnector(
          anchors.start,
          anchors.end,
          source,
          target,
          usedCells,
        );
        if (!this._pathIsClear(path, source.id, target.id)) return;
        const penalty = this._pathUsagePenalty(path, usedCells);
        const score = this._pathLength(path) + penalty * 3 + sideIdx * 25;
        if (!best || score < best.score) best = { path, score };
      });
    });

    if (best) return best.path;
    const anchors = this._connectionAnchors(
      source,
      target,
      preferredSide || this._connectionSide(source, target),
      preferredSlot || 0.5,
    );
    return this._routeConnector(anchors.start, anchors.end, source, target, usedCells);
  },

  _routeConnector(start, end, source, target, usedCells) {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const railGap = MP_CONNECTOR_GAP * 2;
    const candidates = [
      [start, { x: end.x, y: start.y }, end],
      [start, { x: start.x, y: end.y }, end],
      [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end],
      [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end],
      [start, { x: start.x, y: railGap }, { x: end.x, y: railGap }, end],
      [
        start,
        { x: start.x, y: MP_CANVAS_H - railGap },
        { x: end.x, y: MP_CANVAS_H - railGap },
        end,
      ],
      [start, { x: railGap, y: start.y }, { x: railGap, y: end.y }, end],
      [
        start,
        { x: MP_CANVAS_W - railGap, y: start.y },
        { x: MP_CANVAS_W - railGap, y: end.y },
        end,
      ],
    ];

    const clearCandidates = candidates
      .map((path) => this._simplifyPath(path))
      .filter((path) => this._pathIsClear(path, source.id, target.id));

    const noOverlap = clearCandidates
      .map((path) => ({
        path,
        penalty: this._pathUsagePenalty(path, usedCells),
        length: this._pathLength(path),
      }))
      .sort((a, b) => a.penalty - b.penalty || a.length - b.length);

    if (noOverlap.length && noOverlap[0].penalty === 0) return noOverlap[0].path;

    const gridPath = this._buildGridRoute(start, end, source.id, target.id, usedCells);
    if (gridPath && this._pathIsClear(gridPath, source.id, target.id)) {
      return gridPath;
    }

    if (noOverlap.length) return noOverlap[0].path;
    return this._simplifyPath([start, end]);
  },

  _buildGridRoute(start, end, sourceId, targetId, usedCells) {
    const step = MP_ROUTE_STEP;
    const cols = Math.floor(MP_CANVAS_W / step) + 1;
    const rows = Math.floor(MP_CANVAS_H / step) + 1;
    const toGrid = (p, rect) => {
      const eps = 0.5;
      let gx = Math.round(p.x / step);
      let gy = Math.round(p.y / step);
      if (rect) {
        if (Math.abs(p.x - rect.x) < eps) gx = Math.floor(p.x / step);
        if (Math.abs(p.x - (rect.x + rect.w)) < eps) gx = Math.ceil(p.x / step);
        if (Math.abs(p.y - rect.y) < eps) gy = Math.floor(p.y / step);
        if (Math.abs(p.y - (rect.y + rect.h)) < eps) gy = Math.ceil(p.y / step);
      }
      return {
        gx: mpClamp(gx, 0, cols - 1),
        gy: mpClamp(gy, 0, rows - 1),
      };
    };
    const toPoint = (cell) => ({
      x: mpClamp(cell.gx * step, 0, MP_CANVAS_W),
      y: mpClamp(cell.gy * step, 0, MP_CANVAS_H),
    });

    const sourceNode = this.nodes.find((n) => n.id === sourceId);
    const targetNode = this.nodes.find((n) => n.id === targetId);
    const sourceRect = sourceNode
      ? this._expandedRect(sourceNode, MP_CONNECTOR_GAP)
      : null;
    const targetRect = targetNode
      ? this._expandedRect(targetNode, MP_CONNECTOR_GAP)
      : null;
    const startCell = toGrid(start, sourceRect);
    const endCell = toGrid(end, targetRect);
    const startKey = this._gridKey(startCell.gx, startCell.gy);
    const endKey = this._gridKey(endCell.gx, endCell.gy);
    const blocked = new Set();
    const obstacles = this.nodes.map((n) => this._expandedRect(n, MP_CONNECTOR_GAP));

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const x = gx * step;
        const y = gy * step;
        if (obstacles.some((rect) => this._pointInRect({ x, y }, rect))) {
          blocked.add(this._gridKey(gx, gy));
        }
      }
    }
    blocked.delete(startKey);
    blocked.delete(endKey);

    const heuristic = (gx, gy) => Math.abs(gx - endCell.gx) + Math.abs(gy - endCell.gy);
    const open = [
      {
        gx: startCell.gx,
        gy: startCell.gy,
        key: startKey,
        g: 0,
        f: heuristic(startCell.gx, startCell.gy),
        dir: null,
      },
    ];
    const best = new Map([[startKey, 0]]);
    const parent = new Map();
    const closed = new Set();
    const dirs = [
      { dx: 1, dy: 0, name: "r" },
      { dx: -1, dy: 0, name: "l" },
      { dx: 0, dy: 1, name: "d" },
      { dx: 0, dy: -1, name: "u" },
    ];
    let iterations = 0;

    while (open.length && iterations++ < 12000) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift();
      if (!cur || closed.has(cur.key)) continue;
      if (cur.key === endKey) {
        const cells = [];
        let key = endKey;
        while (key) {
          const [gx, gy] = key.split(",").map(Number);
          cells.push({ gx, gy });
          key = parent.get(key)?.key;
        }
        cells.reverse();
        const gridPoints = cells.map(toPoint);
        const points = [start];
        const first = gridPoints[0];
        if (first && (first.x !== start.x || first.y !== start.y)) {
          if (first.x !== start.x && first.y !== start.y) {
            points.push({ x: first.x, y: start.y });
          }
          points.push(first);
        }
        gridPoints.slice(1, -1).forEach((p) => points.push(p));
        const last = gridPoints[gridPoints.length - 1];
        if (last && (last.x !== end.x || last.y !== end.y)) {
          if (last.x !== end.x && last.y !== end.y) {
            points.push(last);
            points.push({ x: last.x, y: end.y });
          } else {
            points.push(last);
          }
        }
        points.push(end);
        return this._simplifyPath(points);
      }
      closed.add(cur.key);

      dirs.forEach((d) => {
        const nx = cur.gx + d.dx;
        const ny = cur.gy + d.dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return;
        const key = this._gridKey(nx, ny);
        if (blocked.has(key) || closed.has(key)) return;
        const turnCost = cur.dir && cur.dir !== d.name ? 0.38 : 0;
        const usageCost = this._routeCellUsagePenalty(nx, ny, usedCells);
        const g = cur.g + 1 + turnCost + usageCost;
        if (g >= (best.get(key) ?? Infinity)) return;
        best.set(key, g);
        parent.set(key, { key: cur.key, dir: d.name });
        open.push({
          gx: nx,
          gy: ny,
          key,
          g,
          f: g + heuristic(nx, ny),
          dir: d.name,
        });
      });
    }
    return null;
  },

  _expandedRect(node, gap) {
    return {
      x: node.x - gap,
      y: node.y - gap,
      w: node.w + gap * 2,
      h: node.h + gap * 2,
    };
  },

  _pointInRect(point, rect) {
    return (
      point.x > rect.x &&
      point.x < rect.x + rect.w &&
      point.y > rect.y &&
      point.y < rect.y + rect.h
    );
  },

  _pathIsClear(points, sourceId, targetId) {
    const obstacles = this.nodes.map((n) => this._expandedRect(n, MP_CONNECTOR_GAP));
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      if (obstacles.some((rect) => this._segmentIntersectsRect(a, b, rect))) {
        return false;
      }
    }
    return true;
  },

  _segmentIntersectsRect(a, b, rect) {
    const eps = 0.001;
    if (Math.abs(a.x - b.x) < eps) {
      const x = a.x;
      if (x <= rect.x || x >= rect.x + rect.w) return false;
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      return maxY > rect.y && minY < rect.y + rect.h;
    }
    if (Math.abs(a.y - b.y) < eps) {
      const y = a.y;
      if (y <= rect.y || y >= rect.y + rect.h) return false;
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      return maxX > rect.x && minX < rect.x + rect.w;
    }

    const steps = Math.max(
      2,
      Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / (MP_ROUTE_STEP / 2)),
    );
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      if (this._pointInRect(p, rect)) return true;
    }
    return false;
  },

  _pathUsagePenalty(points, usedCells) {
    if (!usedCells || !usedCells.size) return 0;
    let penalty = 0;
    this._samplePathCells(points).forEach((cell) => {
      penalty += this._routeCellUsagePenalty(cell.gx, cell.gy, usedCells);
    });
    return penalty;
  },

  _routeCellUsagePenalty(gx, gy, usedCells) {
    if (!usedCells || !usedCells.size) return 0;
    let penalty = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!usedCells.has(this._gridKey(gx + ox, gy + oy))) continue;
        penalty += ox === 0 && oy === 0 ? 24 : 6;
      }
    }
    return penalty;
  },

  _markRouteUsage(points, usedCells) {
    this._samplePathCells(points).forEach((cell) => {
      usedCells.add(this._gridKey(cell.gx, cell.gy));
    });
  },

  _samplePathCells(points) {
    const cells = [];
    const step = MP_ROUTE_STEP;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const len = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      const samples = Math.ceil(len / (step / 2));
      for (let j = 0; j <= samples; j++) {
        const t = j / samples;
        cells.push({
          gx: Math.round((a.x + (b.x - a.x) * t) / step),
          gy: Math.round((a.y + (b.y - a.y) * t) / step),
        });
      }
    }
    return cells;
  },

  _pathLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return length;
  },

  _simplifyPath(points) {
    const cleaned = [];
    points.forEach((p) => {
      const last = cleaned[cleaned.length - 1];
      if (!last || Math.abs(last.x - p.x) > 0.01 || Math.abs(last.y - p.y) > 0.01) {
        cleaned.push({ x: p.x, y: p.y });
      }
    });

    const simplified = [];
    cleaned.forEach((p) => {
      simplified.push(p);
      while (simplified.length >= 3) {
        const a = simplified[simplified.length - 3];
        const b = simplified[simplified.length - 2];
        const c = simplified[simplified.length - 1];
        const sameX = Math.abs(a.x - b.x) < 0.01 && Math.abs(b.x - c.x) < 0.01;
        const sameY = Math.abs(a.y - b.y) < 0.01 && Math.abs(b.y - c.y) < 0.01;
        if (!sameX && !sameY) break;
        simplified.splice(simplified.length - 2, 1);
      }
    });
    return simplified;
  },

  _pathToD(points) {
    return points
      .map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + " " + p.y.toFixed(1))
      .join(" ");
  },

  _gridKey(gx, gy) {
    return gx + "," + gy;
  },

  _checkOverlaps() {
    const canvas = document.getElementById("mp-canvas");
    if (!canvas) return;
    this.nodes.forEach((a) => {
      const ov = this.nodes.some(
        (b) =>
          b.id !== a.id &&
          a.x < b.x + b.w &&
          a.x + a.w > b.x &&
          a.y < b.y + b.h &&
          a.y + a.h > b.y,
      );
      canvas
        .querySelector('[data-node-id="' + a.id + '"]')
        ?.classList.toggle("mp-node--warn-overlap", ov);
    });
  },

  _checkWarnings() {
    const canvas = document.getElementById("mp-canvas");
    if (!canvas) return;
    const W = MP_CANVAS_W,
      H = MP_CANVAS_H,
      warns = [];
    this.nodes.forEach((n) => {
      const out = n.x < 0 || n.y < 0 || n.x + n.w > W || n.y + n.h > H;
      canvas
        .querySelector('[data-node-id="' + n.id + '"]')
        ?.classList.toggle("mp-node--warn-overflow", out);
      if (out)
        warns.push({
          type: "red",
          msg: '"' + n.label + '" está fora da área imprimível.',
        });
    });
    this._checkOverlaps();
    const hasOv = this.nodes.some((a) =>
      this.nodes.some(
        (b) =>
          b.id !== a.id &&
          a.x < b.x + b.w &&
          a.x + a.w > b.x &&
          a.y < b.y + b.h &&
          a.y + a.h > b.y,
      ),
    );
    if (hasOv)
      warns.push({
        type: "orange",
        msg: "Sobreposição detectada. Ajuste as posições.",
      });
    const wEl = document.getElementById("mp-editor-warnings");
    if (wEl)
      wEl.innerHTML = warns
        .map(
          (w) =>
            '<div class="mp-warn-item mp-warn-item--' +
            w.type +
            '">' +
            w.msg +
            "</div>",
        )
        .join("");
  },

  setEditorMode(mode) {
    this.editorMode = mode;
    document
      .getElementById("mp-mode-ordem")
      .classList.toggle("active", mode === "ordem");
    document
      .getElementById("mp-mode-layout")
      .classList.toggle("active", mode === "layout");
    const canvas = document.getElementById("mp-canvas");
    if (canvas) canvas.className = "mp-canvas mp-editor--" + mode;
    this._updateHint();
    this._closeDropdown();
  },

  _updateHint() {
    const hint = document.getElementById("mp-editor-hint");
    if (!hint) return;
    hint.textContent =
      this.editorMode === "ordem"
        ? "Clique em um nó para atribuir um tópico"
        : "Arraste para mover · Handles nos cantos para redimensionar";
  },

  _openOrdemDropdown(nodeId, anchorEl) {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node || node.isCenter) return;
    document
      .querySelectorAll(".mp-node--selected-ordem")
      .forEach((x) => x.classList.remove("mp-node--selected-ordem"));
    anchorEl.classList.add("mp-node--selected-ordem");
    this._dropdownNodeId = nodeId;

    const dd = document.getElementById("mp-ordem-dropdown");
    const inner = document.getElementById("mp-ordem-list");
    inner.innerHTML = '<div class="mp-ordem-header">Escolha o tópico</div>';

    this.topicos
      .filter((t) => t.on)
      .forEach((t) => {
        const inOther = this.nodes.some(
          (n) => !n.isCenter && n.id !== nodeId && n.label === t.txt,
        );
        const opt = document.createElement("div");
        opt.className = "mp-ordem-opt" + (inOther ? " assigned" : "");
        opt.innerHTML = '<span class="mp-ordem-opt__dot"></span>' + t.txt;
        opt.addEventListener("click", (e) => {
          e.stopPropagation();
          this._assignTopic(nodeId, t.txt);
          this._closeDropdown();
        });
        inner.appendChild(opt);
      });

    const rect = anchorEl.getBoundingClientRect();
    dd.style.display = "block";
    dd.style.top = rect.bottom + 6 + "px";
    dd.style.left = mpClamp(rect.left, 8, window.innerWidth - 250) + "px";
  },

  _closeDropdown() {
    const dd = document.getElementById("mp-ordem-dropdown");
    if (dd) dd.style.display = "none";
    this._dropdownNodeId = null;
    document
      .querySelectorAll(".mp-node--selected-ordem")
      .forEach((x) => x.classList.remove("mp-node--selected-ordem"));
  },

  _assignTopic(nodeId, txt) {
    const target = this.nodes.find((n) => n.id === nodeId);
    const other = this.nodes.find(
      (n) => n.label === txt && n.id !== nodeId && !n.isCenter,
    );
    if (!target) return;
    if (other) {
      other.label = target.label;
      const oEl = document.querySelector(
        '[data-node-id="' + other.id + '"] .mp-node__header',
      );
      if (oEl) oEl.textContent = other.label;
    }
    target.label = txt;
    const el = document.querySelector(
      '[data-node-id="' + nodeId + '"] .mp-node__header',
    );
    if (el) el.textContent = txt;
  },

  async gerarMapa() {
    this._checkWarnings();
    Modal.showLoading("Conectando ao servidor…", "Pode levar até 1 min");
    const online = await Config.wake();
    if (!online) {
      Modal.hideLoading();
      return;
    }
    Modal.showLoading("IA gerando conteúdo…", "Preenchendo cada nó do mapa");
    const topicos = this.nodes.filter((n) => !n.isCenter).map((n) => n.label);
    try {
      this.aiContent = await MapaAI.gerarConteudo(
        this.materia,
        this.titulo,
        topicos,
      );
      this.goStep(5);
    } catch (err) {
      alert("Erro ao gerar conteúdo: " + err.message);
    } finally {
      Modal.hideLoading();
    }
  },

  _renderResult() {
    const resCanvas = document.getElementById("mp-result-canvas");
    if (!resCanvas) return;
    resCanvas.querySelectorAll(".mp-node").forEach((el) => el.remove());

    const header = document.getElementById("mp-result-header");
    if (header) {
      header.className = "mp-result-header";
      header.innerHTML =
        '<span class="badge badge-accent" style="font-size:11px">Gerado por IA</span>' +
        '<h2 style="font-family:var(--font-serif);font-size:22px;font-weight:600;color:var(--text);margin:8px 0 4px">' +
        this.titulo +
        ' <em style="font-size:16px;color:var(--caramel)">(' +
        this.materia +
        ")</em></h2>" +
        '<p style="font-size:13px;color:var(--text-mid);margin:0">' +
        this.nodes.filter((n) => !n.isCenter).length +
        " nós · " +
        new Date().toLocaleDateString("pt-BR") +
        " · Template: " +
        this.template +
        "</p>";
    }

    this.nodes.forEach((n) => {
      const el = document.createElement("div");
      el.className =
        "mp-node mp-node--result" + (n.isCenter ? " mp-node--center" : "");
      el.dataset.nodeId = n.id;
      el.style.cssText =
        "left:" +
        n.x +
        "px;top:" +
        n.y +
        "px;width:" +
        n.w +
        "px;height:" +
        n.h +
        "px";

      let body;
      if (n.isCenter) {
        body = '<div class="mp-node__center-label">' + n.label + "</div>";
      } else if (n.w * n.h < 4000) {
        body =
          '<div class="mp-node__header">' +
          n.label +
          "</div>" +
          '<div class="mp-node__body mp-node--result-insufficient">Espaço insuf.</div>';
      } else {
        const bodyH = Math.max(0, n.h - 30);
        const lines = Math.floor(bodyH / 16);
        const charsPerLine = Math.floor(n.w / 6.2);
        const maxChars = Math.max(10, lines * charsPerLine);

        let texto =
          this.aiContent && this.aiContent[n.label]
            ? this.aiContent[n.label]
            : MOCK_MAP_CONTENT.gerarConteudoPorTopico(n.label, n.w * n.h);
        if (texto.length > maxChars) {
          const trecho = texto.slice(0, maxChars);

          const ultimaFrase = Math.max(
            trecho.lastIndexOf(". "),
            trecho.lastIndexOf("! "),
            trecho.lastIndexOf("? "),
            trecho.lastIndexOf("."),
            trecho.lastIndexOf("!"),
          );
          if (ultimaFrase > maxChars * 0.4) {
            texto = trecho.slice(0, ultimaFrase + 1);
          } else {
            const ultimaVirgula = trecho.lastIndexOf(", ");
            const ultimoEspaco = trecho.lastIndexOf(" ");
            const corte =
              ultimaVirgula > maxChars * 0.5 ? ultimaVirgula + 1 : ultimoEspaco;
            texto = trecho.slice(0, corte > 0 ? corte : maxChars).trimEnd();
          }
        }

        body =
          '<div class="mp-node__header">' +
          n.label +
          "</div>" +
          '<div class="mp-node__body" contenteditable="true" title="Duplo clique para editar">' +
          texto +
          "</div>";
      }

      el.innerHTML = body;
      el.addEventListener("dblclick", () =>
        el.classList.toggle("mp-node--editing"),
      );
      el.addEventListener(
        "blur",
        () => el.classList.remove("mp-node--editing"),
        true,
      );
      resCanvas.appendChild(el);
    });

    this._redrawLines("mp-result-svg");
    this._scaleCanvas("mp-result-canvas", "mp-result-wrap");
  },

  async salvarMapa() {
    Modal.showLoading("Salvando…", "Adicionando à biblioteca");
    try {
      const subjects = Storage.getSubjects();
      const nomaNorm = Helpers.normalizeSubjectName(this.materia);
      let subject = subjects.find(
        (s) => s.nomeNormalizado?.toLowerCase() === nomaNorm.toLowerCase(),
      );
      if (!subject) {
        subject = {
          id: "sub_" + Date.now(),
          nomeOriginal: this.materia,
          nomeNormalizado: nomaNorm,
          favorita: false,
          criadaEm: new Date().toISOString(),
          folhas: [],
          mapas: [],
        };
        subjects.push(subject);
      }
      if (!subject.mapas) subject.mapas = [];
      subject.mapas.unshift({
        id: "mp_" + Date.now(),
        titulo: this.titulo,
        tipo: "mapa",
        template: this.template,
        topicos: this.nodes.filter((n) => !n.isCenter).map((n) => n.label),
        nodes: this.nodes,
        aiContent: this.aiContent,
        favorita: false,
        criadaEm: new Date().toISOString(),
        dataFormatada: new Date().toLocaleDateString("pt-BR"),
      });
      Storage.setSubjects(subjects);
      await Helpers.wait(600);
      Modal.hideLoading();
      Router.go("materia", { subjectId: subject.id });
    } catch (err) {
      Modal.hideLoading();
      console.error("[salvarMapa]", err);
      alert("Erro ao salvar. Tente novamente.");
    }
  },
};

document.addEventListener("DOMContentLoaded", () => MapaPage.init());
