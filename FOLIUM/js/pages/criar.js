const NIVEL_LABELS = {
  fundamental_1: "Fund. I",
  fundamental_2: "Fund. II",
  medio: "Ensino Médio",
  vestibular: "Vestibular/ENEM",
  tecnico: "Técnico",
  superior: "️ Superior",
  pos: "Pós-graduação",
};

const CriarPage = {
  currentStep: 1,
  topicList: [],
  materia: "",
  tema: "",
  nivel: "",
  _queuePollTimer: null,
  _cooldownTimer: null,

  init() {
    if (!Router.requireAuth()) return;
    Navbar.renderTop({
      backRoute: "escolher",
      backLabel: "Escolher",
      title: "<em>Nova Folha</em>",
    });
    Navbar.renderBottom("escolher");
    Sidebar.init();
    this.goStep(1);
    this._runStepperIntro();

    Config.warmInBackground();
  },

  _runStepperIntro() {
    const stepper = DOM.$(".cr-stepper");
    if (!stepper) return;

    if (stepper.dataset.introDone === "1") return;
    stepper.dataset.introDone = "1";

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const schedule = [
      { sel: "#dot1 .cs-label", start: 750, charDelay: 80 },
      { sel: "#dot2 .cs-label", start: 2050, charDelay: 80 },
      { sel: "#dot3 .cs-label", start: 3300, charDelay: 90 },
    ];

    const labels = schedule
      .map((s) => {
        const el = DOM.$(s.sel);
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
    }, 4600);
  },

  _startQueuePolling(actionLabel) {
    this._stopQueuePolling();
    const token = Storage.getToken();
    let tick = 0;
    let errorCount = 0;
    const DOTS = ["", ".", "..", "..."];
    const MAX_ERRORS = 3;

    this._queuePollTimer = setInterval(async () => {
      try {
        const res = await fetch(`${Config.API}/ai2/queue`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          errorCount++;
          if (errorCount >= MAX_ERRORS) this._stopQueuePolling();
          return;
        }

        errorCount = 0;
        const { waiting } = await res.json();
        tick = (tick + 1) % DOTS.length;

        if (waiting > 0) {
          Modal.updateLoading(
            `⏳ Aguardando na fila${DOTS[tick]}`,
            `${waiting} pessoa${waiting > 1 ? "s" : ""} na sua frente — ${actionLabel} logo`,
          );
        } else {
          Modal.updateLoading(actionLabel, "Processando agora…");
        }
      } catch {
        errorCount++;
        if (errorCount >= MAX_ERRORS) this._stopQueuePolling();
      }
    }, 2000);
  },

  _stopQueuePolling() {
    if (this._queuePollTimer) {
      clearInterval(this._queuePollTimer);
      this._queuePollTimer = null;
    }
  },

  goStep(n) {
    this.currentStep = n;
    if (this._cooldownTimer) {
      clearInterval(this._cooldownTimer);
      this._cooldownTimer = null;
    }
    for (let i = 1; i <= 3; i++) {
      const dot = DOM.$(`#dot${i}`);
      const pane = DOM.$(`#pane${i}`);
      dot.classList.remove("active", "done");
      if (i < n) dot.classList.add("done");
      else if (i === n) dot.classList.add("active");
      pane.classList.toggle("active", i === n);
    }
    for (let i = 1; i <= 2; i++) {
      DOM.$(`#ln${i}`).classList.toggle("done", i < n);
    }
    DOM.scrollTop();
  },

  async gerarSugestoes() {
    const materiaEl = DOM.$("#inp-materia");
    const temaEl = DOM.$("#inp-tema");
    const nivelEl = DOM.$("#inp-nivel");

    if (!materiaEl.value.trim()) {
      DOM.markError(materiaEl);
      return;
    }
    if (!nivelEl.value) {
      DOM.markError(nivelEl);
      return;
    }

    this.materia = Helpers.titleCase(materiaEl.value.trim());
    this.tema = temaEl.value.trim();
    this.nivel = nivelEl.value;

    const btn = DOM.$("#btn-gerar");
    if (btn) btn.disabled = true;

    Modal.showLoading(
      "Conectando ao servidor…",
      "Pode levar até 1 minuto na primeira vez",
    );

    const online = await Config.wake();
    if (!online) {
      Modal.hideLoading();
      if (btn) btn.disabled = false;
      this._showStepMsg(
        "pane1-msg",
        "Servidor indisponível no momento. Tente novamente em instantes.",
        "warn",
      );
      return;
    }

    Modal.showLoading(
      "IA analisando o tema…",
      "Mapeando os melhores tópicos para seu estudo",
    );
    this._startQueuePolling("IA analisando o tema");

    let usouFallback = false;

    try {
      this.topicList = await AI1.gerarTopicos(
        this.materia,
        this.tema,
        this.nivel,
      );
    } catch (err) {
      console.error("[AI1] gerarTopicos falhou:", err.message);

      if (
        err.message.includes("429") ||
        err.message.toLowerCase().includes("limite")
      ) {
        Modal.hideLoading();
        if (btn) btn.disabled = false;
        this._showStepMsg(
          "pane1-msg",
          "⏳ Muitos usuários agora. Aguarde alguns segundos e tente novamente.",
          "warn",
        );
        return;
      }

      usouFallback = true;
      this.topicList = Mock.topicSuggestions.map((txt, i) => ({
        txt,
        on: i < 5,
        plano_pesquisa: null,
        aviso: null,
      }));
    } finally {
      Modal.hideLoading();
      if (btn) btn.disabled = false;
    }

    this._renderTopics();

    if (usouFallback) {
      this._showStepMsg(
        "pane2-msg",
        "IA indisponível no momento — exibindo sugestões genéricas. Edite à vontade.",
        "warn",
      );
    }

    this.goStep(2);
  },

  _renderTopics() {
    const list = DOM.$("#topics-list");
    DOM.clear(list);

    this.topicList.forEach((t, i) => {
      const row = Card.topicRow({
        txt: t.txt,
        on: t.on,
        index: i,
        aviso: t.aviso,
        onToggle: (idx, chkEl) => this._toggleTopic(idx, chkEl),
        onRemove: (idx) => this._removeTopic(idx),
      });
      list.appendChild(row);
    });
    this._updateTopicMeter();
  },

  _updateTopicMeter() {
    const total = this.topicList.length;
    const selected = this.topicList.filter((t) => t.on).length;
    const c = DOM.$("#topic-count");
    const t = DOM.$("#topic-total");
    if (c) c.textContent = selected;
    if (t) t.textContent = total;
  },

  _toggleTopic(i, chkEl) {
    this.topicList[i].on = !this.topicList[i].on;
    chkEl.classList.toggle("on", this.topicList[i].on);
    chkEl.innerHTML = this.topicList[i].on
      ? '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;stroke:white"><polyline points="20 6 9 17 4 12"/></svg>'
      : "";
    this._updateTopicMeter();
  },

  _removeTopic(i) {
    this.topicList.splice(i, 1);
    this._renderTopics();
  },

  async addTopic() {
    const inp = DOM.$("#inp-new-topic");
    const txt = inp.value.trim();
    if (!txt) {
      DOM.markError(inp);
      return;
    }

    const btn = DOM.$("#btn-add-topic");
    if (btn) btn.disabled = true;

    Modal.showLoading(
      "IA verificando compatibilidade…",
      `Analisando "${txt}" no contexto de ${this.materia}`,
    );

    let resultado = { compativel: true, aviso: null, plano_pesquisa: null };

    try {
      resultado = await AI1.verificarTopico(
        txt,
        this.materia,
        this.tema,
        this.topicList,
        this.nivel,
      );
    } catch (err) {
      console.error("[AI1] verificarTopico falhou:", err.message);
    } finally {
      Modal.hideLoading();
      if (btn) btn.disabled = false;
    }

    this.topicList.push({
      txt,
      on: true,
      plano_pesquisa: resultado.plano_pesquisa,
      aviso: resultado.compativel
        ? resultado.aviso
        : resultado.aviso ||
          `"${txt}" pode estar fora do tema de ${this.materia}. Você pode mantê-lo.`,
    });

    this._renderTopics();
    inp.value = "";
  },

  _showStepMsg(id, texto, tipo = "info") {
    let el = DOM.$(`#${id}`);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      const m = id.match(/^pane(\d+)-msg$/);
      const paneSel = m ? `#pane${m[1]}` : "#pane2";
      const pane = DOM.$(paneSel);
      if (pane) pane.insertBefore(el, pane.firstChild);
    }
    el.className = `step-msg step-msg--${tipo}`;
    el.textContent = texto;
  },

  async gerarFolha() {
    const selecionados = this.topicList.filter((t) => t.on);
    if (!selecionados.length) {
      alert("Selecione ao menos um tópico.");
      return;
    }

    Modal.showLoading(
      "Conectando ao servidor…",
      "Pode levar até 1 minuto na primeira vez",
    );
    const online = await Config.wake();
    if (!online) {
      Modal.hideLoading();
      this._showStepMsg(
        "pane3-msg",
        "Servidor indisponível no momento. Tente novamente em instantes.",
        "warn",
      );
      return;
    }

    Modal.showLoading(
      "IA gerando sua folha…",
      "Isso pode levar alguns segundos",
    );
    this._startQueuePolling("Gerando sua folha");

    const out = DOM.$("#sheet-out");
    DOM.clear(out);

    try {
      const resultado = await AI2.gerarFolha(
        this.materia,
        this.tema,
        this.nivel,
        selecionados.map((t) => ({
          txt: t.txt,
          plano_pesquisa: t.plano_pesquisa || null,
        })),
      );

      this._stopQueuePolling();
      Modal.hideLoading();
      AI2.renderFolha(out, this.materia, this.tema, this.nivel, resultado);

      sessionStorage.setItem(
        "folium_plano_ia2",
        JSON.stringify({
          materia: this.materia,
          tema: this.tema,
          nivel: this.nivel,
          topicos: selecionados.map((t) => t.txt),
          resultado,
          geradoEm: new Date().toISOString(),
        }),
      );
    } catch (err) {
      this._stopQueuePolling();
      Modal.hideLoading();
      console.error("[AI2] gerarFolha falhou:", err.message);

      const is429 =
        err.message.includes("429") ||
        err.message.toLowerCase().includes("limite") ||
        err.message.toLowerCase().includes("aguarde");
      if (is429) {
        const match = err.message.match(/(\d+)s/);
        let remaining = match ? parseInt(match[1]) : 45;

        const updateMsg = () => {
          this._showStepMsg(
            "pane2-msg",
            `⏳ Aguarde ${remaining}s antes de gerar outra folha. (Limite: 1 folha a cada 45s por usuário)`,
            "warn",
          );
        };

        updateMsg();

        if (this._cooldownTimer) clearInterval(this._cooldownTimer);
        this._cooldownTimer = setInterval(() => {
          remaining--;
          if (remaining <= 0) {
            clearInterval(this._cooldownTimer);
            this._cooldownTimer = null;
            this._showStepMsg(
              "pane2-msg",
              " Pronto! Você já pode gerar sua folha.",
              "info",
            );
          } else {
            updateMsg();
          }
        }, 1000);

        return;
      }

      this._showStepMsg(
        "pane3-msg",
        "IA indisponível — não foi possível gerar a folha. Tente novamente.",
        "warn",
      );
      return;
    }

    this.goStep(3);
  },

  async salvarFolha() {
    Modal.showLoading("Salvando…", "Adicionando à sua coleção");

    try {
      const raw = sessionStorage.getItem("folium_plano_ia2");
      if (!raw) {
        Modal.hideLoading();
        alert("Nenhuma folha para salvar. Gere uma folha primeiro.");
        return;
      }

      const plano = JSON.parse(raw);
      const { materia: materiaRaw, tema, nivel, topicos, resultado } = plano;

      const nomeNormalizado = Helpers.normalizeSubjectName(materiaRaw);

      const subjects = Storage.getSubjects();
      let subject = subjects.find(
        (s) =>
          s.nomeNormalizado.toLowerCase() === nomeNormalizado.toLowerCase(),
      );

      if (!subject) {
        subject = {
          id: `bio_${Date.now()}`,
          nomeOriginal: materiaRaw,
          nomeNormalizado,

          favorita: false,
          criadaEm: new Date().toISOString(),
          folhas: [],
        };
        subjects.push(subject);
      }

      const nivelLabel = NIVEL_LABELS[nivel] || nivel || "";
      const novaFolha = {
        id: `sh_${Date.now()}`,
        titulo: `${tema || nomeNormalizado}`,
        tema: tema || "",
        nivel: nivel || "",
        nivelLabel,
        topicos: Array.isArray(topicos) ? topicos : [],
        resultado: resultado || null,
        favorita: false,
        criadaEm: new Date().toISOString(),
        dataFormatada: new Date().toLocaleDateString("pt-BR"),
      };

      subject.folhas.unshift(novaFolha);
      Storage.setSubjects(subjects);
      sessionStorage.removeItem("folium_plano_ia2");

      await Helpers.wait(600);
      Modal.hideLoading();

      Router.go("materia", { subjectId: subject.id });
    } catch (err) {
      Modal.hideLoading();
      console.error("[salvarFolha] Erro:", err);
      alert("Erro ao salvar a folha. Tente novamente.");
    }
  },
};

document.addEventListener("DOMContentLoaded", () => CriarPage.init());
