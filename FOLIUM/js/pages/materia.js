const MateriaPage = {
  subject: null,
  sheet: null,
  _fromMapasTab: false,

  init() {
    if (!Router.requireAuth()) return;

    const subjectId = Storage.getContext("subjectId");
    const sheetId = Storage.getContext("sheetId");
    const viewSheet = Storage.getContext("viewSheet");

    const subjects = Storage.getSubjects();
    this.subject = subjects.find((s) => s.id === subjectId) || null;

    if (!this.subject) {
      Router.go("folhas");
      return;
    }

    if (viewSheet && sheetId) {
      this.sheet = this.subject.folhas.find((f) => f.id === sheetId) || null;
      if (!this.sheet) {
        this._renderSheetList();
        return;
      }
      this._renderSheetView();
    } else {
      this._renderSheetList();
    }
  },

  _renderSheetList() {
    Sidebar.init();
    Storage.clearContext("sheetId");
    Storage.clearContext("viewSheet");

    const fromMapasTab = Storage.getContext("fromMapasTab");
    Storage.clearContext("fromMapasTab");
    this._fromMapasTab = !!fromMapasTab;

    Navbar.renderTop({
      onBack: () => MateriaPage._goBack(),
      backLabel: "Matérias",
      title: `<em>${this.subject.nomeNormalizado}</em>`,
    });

    const body = DOM.$("#materia-body");
    if (!body) return;

    DOM.clear(body);

    const bread = document.createElement("div");
    bread.className = "bread-row au";
    bread.innerHTML = `
      <button class="bread-back" onclick="MateriaPage._goBack()">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        ${this._fromMapasTab ? "Mapas" : "Matérias"}
      </button>
      <span class="bread-sep">/</span>
      <span class="bread-current">${this.subject.nomeNormalizado}</span>`;
    body.appendChild(bread);

    const lbl = document.createElement("p");
    lbl.className = "t-label mb-16";

    if (this._fromMapasTab) {
      // ── Mapas-only view ────────────────────────────────────
      const mapas = [...(this.subject.mapas || [])].sort(
        (a, b) => new Date(b.criadaEm || 0) - new Date(a.criadaEm || 0),
      );
      lbl.textContent = `${mapas.length} mapa${mapas.length !== 1 ? "s" : ""} mental${mapas.length !== 1 ? "is" : ""}`;
      body.appendChild(lbl);

      if (!mapas.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.innerHTML = `
          <div class="ei"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%;stroke:var(--forest-mid)"><circle cx="12" cy="5" r="2.5"/><circle cx="4" cy="19" r="2.5"/><circle cx="20" cy="19" r="2.5"/><line x1="12" y1="7.5" x2="4" y2="16.5"/><line x1="12" y1="7.5" x2="20" y2="16.5"/></svg></div>
          <h3>Nenhum mapa aqui</h3>
          <p>Crie um mapa mental para esta matéria.</p>`;
        body.appendChild(empty);
        return;
      }

      mapas.forEach((mp, i) => {
        const card = this._makeMateriaMindMapCard(mp, i);
        body.appendChild(card);
      });
      return;
    }

    // ── Folhas view (default) ──────────────────────────────
    const folhas = [...this.subject.folhas].sort(
      (a, b) =>
        (b.favorita ? 1 : 0) - (a.favorita ? 1 : 0) ||
        new Date(b.criadaEm) - new Date(a.criadaEm),
    );

    lbl.textContent = `${folhas.length} folha${folhas.length !== 1 ? "s" : ""}`;
    body.appendChild(lbl);

    if (!folhas.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `
        <div class="ei"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%;stroke:var(--tan)" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></div>
        <h3>Nenhuma folha aqui</h3>
        <p>Crie uma folha para esta matéria.</p>`;
      body.appendChild(empty);
      return;
    }

    folhas.forEach((sh, i) => {
      const card = Card.sheet({
        ...sh,
        subjectId: this.subject.id,
        onFavorite: () => this._toggleFavorite(sh.id),
        onDelete: () => this._deleteSheet(sh.id),
        onDownload: (format) => this._downloadSheet(sh.id, format),
      });
      card.style.animationDelay = `${i * 0.07}s`;
      card.classList.add("au");
      body.appendChild(card);
    });

    const mapas = this.subject.mapas || [];
    if (mapas.length > 0) {
      const mapaLbl = document.createElement("p");
      mapaLbl.className = "t-label mb-16";
      mapaLbl.style.marginTop = "28px";
      mapaLbl.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;stroke:var(--forest)"><circle cx="12" cy="5" r="2.5"/><circle cx="4" cy="19" r="2.5"/><circle cx="20" cy="19" r="2.5"/><line x1="12" y1="7.5" x2="4" y2="16.5"/><line x1="12" y1="7.5" x2="20" y2="16.5"/></svg>
        ${mapas.length} mapa${mapas.length !== 1 ? "s" : ""} mental${mapas.length !== 1 ? "is" : ""}
      </span>`;
      body.appendChild(mapaLbl);

      mapas.forEach((mp, i) => {
        const card = this._makeMateriaMindMapCard(mp, i);
        body.appendChild(card);
      });
    }
  },

  _makeMateriaMindMapCard(mp, idx) {
    const nodesCount = Array.isArray(mp.topicos)
      ? mp.topicos.length
      : Array.isArray(mp.nodes)
        ? mp.nodes.filter((n) => !n.isCenter).length
        : 0;
    const mapSvg = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;stroke:var(--forest)"><circle cx="12" cy="5" r="2.5"/><circle cx="4" cy="19" r="2.5"/><circle cx="20" cy="19" r="2.5"/><line x1="12" y1="7.5" x2="4" y2="16.5"/><line x1="12" y1="7.5" x2="20" y2="16.5"/></svg>`;
    const arrowSvg = `<svg class="sc-arr" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`;

    const card = document.createElement("button");
    card.className = "sheet-card-item mc-materia-card au";
    card.style.animationDelay = `${idx * 0.07}s`;
    card.type = "button";
    card.innerHTML = `
      <div class="sc-icon sc-icon--forest">${mapSvg}</div>
      <div class="sc-info">
        <div class="sc-title">${mp.titulo}</div>
        <div class="sc-meta">
          Mapa mental${mp.template ? " · " + mp.template.charAt(0).toUpperCase() + mp.template.slice(1) : ""}
          · ${mp.dataFormatada || ""}
          <span class="sc-nivel">${nodesCount} nó${nodesCount !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div class="sc-actions">${arrowSvg}</div>`;

    card.addEventListener("click", () => {
      Storage.setContext("mapaId", mp.id);
      Storage.setContext("subjectId_mapa", this.subject.id);
      Storage.setContext("mapaOrigin", "materia");
      Router.go("mapa");
    });
    return card;
  },

  // Navigate back to biblioteca, activating mapas tab when relevant
  _goBack() {
    const fromMapas = this._fromMapasTab;
    this._fromMapasTab = false;
    Storage.clearContext("fromMapasTab");
    if (fromMapas) {
      Storage.setContext("libTab", "mapas");
    }
    Router.go("folhas");
  },

  async _downloadSheet(sheetId, format) {
    const folha = this.subject.folhas.find((f) => f.id === sheetId);
    if (!folha) return;

    const safeName =
      (folha.titulo || "folha")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_\- ]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 80) || "folha";

    const bodyHTML = await this._buildSheetHTML(folha);

    if (format === "doc") {
      this._downloadDoc(bodyHTML, `${safeName}.doc`, folha.titulo);
    } else {
      await this._downloadPdf(bodyHTML, `${safeName}.pdf`);
    }
  },

  async _buildSheetHTML(folha) {
    const esc = (s) =>
      String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const parts = [];
    parts.push(
      `<h1 style="font-family:Georgia,serif;margin:0 0 4px">${esc(folha.titulo || "Folha")}</h1>`,
    );
    const subtitle = [this.subject.nomeNormalizado, folha.tema]
      .filter(Boolean)
      .map(esc)
      .join(" — ");
    if (subtitle)
      parts.push(
        `<p style="margin:0 0 4px;color:#555"><em>${subtitle}</em></p>`,
      );
    const meta = [folha.dataFormatada, folha.nivelLabel]
      .filter(Boolean)
      .map(esc)
      .join(" · ");
    if (meta)
      parts.push(
        `<p style="margin:0 0 18px;color:#888;font-size:12px">${meta}</p>`,
      );

    const r = folha.resultado;
    if (r && Array.isArray(r.blocos) && r.blocos.length) {
      for (const b of r.blocos) {
        parts.push(
          `<h2 style="font-family:Georgia,serif;margin:18px 0 6px">${esc(b.titulo || "")}</h2>`,
        );
        if (b.explicacao)
          parts.push(
            `<p style="margin:0 0 8px;line-height:1.5">${esc(b.explicacao)}</p>`,
          );

        const ex = b.exemplo;
        if (ex && ex.tipo) {
          const rotulo = esc(
            ex.rotulo ||
              (ex.tipo === "pratico"
                ? "Exemplo"
                : ex.tipo === "tabela"
                  ? "Tabela"
                  : "Resumo"),
          );
          if (ex.tipo === "pratico" && ex.texto) {
            parts.push(
              `<div style="margin:8px 0;padding:10px 12px;background:#f6f2ec;border-left:3px solid #b08a5a"><strong>${rotulo}:</strong> ${esc(ex.texto)}</div>`,
            );
          } else if (
            ex.tipo === "lista" &&
            Array.isArray(ex.itens) &&
            ex.itens.length
          ) {
            parts.push(
              `<div style="margin:8px 0"><strong>${rotulo}</strong><ul>${ex.itens
                .filter(Boolean)
                .map((i) => `<li>${esc(i)}</li>`)
                .join("")}</ul></div>`,
            );
          } else if (
            ex.tipo === "tabela" &&
            Array.isArray(ex.colunas) &&
            Array.isArray(ex.linhas)
          ) {
            const thead = `<tr>${ex.colunas.map((c) => `<th style="border:1px solid #aaa;padding:4px 8px;background:#eee;text-align:left">${esc(c)}</th>`).join("")}</tr>`;
            const tbody = ex.linhas
              .map((row) => {
                const cells = Array.isArray(row) ? row : [];
                return `<tr>${cells.map((c) => `<td style="border:1px solid #aaa;padding:4px 8px">${esc(c)}</td>`).join("")}</tr>`;
              })
              .join("");
            parts.push(
              `<div style="margin:8px 0"><strong>${rotulo}</strong><table style="border-collapse:collapse;margin-top:4px">${thead}${tbody}</table></div>`,
            );
          }
        }

        if (b.dica_prova) {
          parts.push(
            `<div style="margin:8px 0;padding:8px 12px;background:#fff8e1;border-left:3px solid #e0a800"><strong>Dica de prova:</strong> ${esc(b.dica_prova)}</div>`,
          );
        }

        if (b.visual) {
          const visualHTML = await this._buildVisualHTML(b.visual);
          if (visualHTML) parts.push(visualHTML);
        }
      }

      if (r.resumo_geral) {
        parts.push(
          `<h2 style="font-family:Georgia,serif;margin:22px 0 6px">Resumo Geral</h2>`,
        );
        parts.push(
          `<p style="margin:0;line-height:1.5">${esc(r.resumo_geral)}</p>`,
        );
      }
    } else if (Array.isArray(folha.topicos) && folha.topicos.length) {
      parts.push(
        '<h2 style="font-family:Georgia,serif;margin:18px 0 6px">Tópicos</h2>',
      );
      parts.push(
        "<ul>" +
          folha.topicos.map((t) => `<li>${esc(t)}</li>`).join("") +
          "</ul>",
      );
    } else {
      parts.push("<p><em>Conteúdo não disponível.</em></p>");
    }

    return parts.join("\n");
  },

  _downloadDoc(bodyHTML, filename, title) {
    const baseUrl = "file:///C:/folium/";
    const htmlLoc = baseUrl + "folium.htm";

    const images = [];
    const processedHTML = bodyHTML.replace(
      /<img([^>]*?)src=(["'])data:image\/([a-zA-Z0-9+.-]+);base64,([^"']+)\2([^>]*)>/gi,
      (_m, pre, _q, ext, b64, post) => {
        const norm = ext.toLowerCase();
        const mime =
          "image/" +
          (norm === "svg+xml" ? "svg+xml" : norm === "jpg" ? "jpeg" : norm);
        const fileExt =
          norm === "svg+xml" ? "svg" : norm === "jpeg" ? "jpg" : norm;
        const idx = images.length + 1;
        const name = `image${String(idx).padStart(3, "0")}.${fileExt}`;
        const url = baseUrl + name;
        images.push({ name, url, mime, data: b64.replace(/\s+/g, "") });
        return `<img${pre}src="${url}"${post}>`;
      },
    );

    const safeTitle = (title || "Folium").replace(/</g, "&lt;");
    const htmlPart = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>${safeTitle}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
  <style>body{font-family:Arial,sans-serif;font-size:12pt;color:#222;padding:16px}img{max-width:100%;height:auto}table{border-collapse:collapse}</style>
</head>
<body>${processedHTML}</body>
</html>`;

    if (!images.length) {
      const blob = new Blob(["\ufeff", htmlPart], {
        type: "application/msword",
      });
      this._triggerDownload(blob, filename);
      return;
    }

    const boundary = "----=_NextPart_Folium_" + Date.now().toString(36);
    const htmlB64 = this._utf8ToBase64(htmlPart)
      .match(/.{1,76}/g)
      .join("\r\n");

    const parts = [
      "MIME-Version: 1.0",
      `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"`,
      "",
      `--${boundary}`,
      'Content-Type: text/html; charset="utf-8"',
      "Content-Transfer-Encoding: base64",
      `Content-Location: ${htmlLoc}`,
      "",
      htmlB64,
      "",
    ];

    for (const img of images) {
      const dataB64 = img.data.match(/.{1,76}/g).join("\r\n");
      parts.push(
        `--${boundary}`,
        `Content-Type: ${img.mime}`,
        "Content-Transfer-Encoding: base64",
        "Content-Disposition: inline",
        `Content-Location: ${img.url}`,
        "",
        dataB64,
        "",
      );
    }
    parts.push(`--${boundary}--`, "");

    const mhtml = parts.join("\r\n");
    const blob = new Blob([mhtml], { type: "application/msword" });
    this._triggerDownload(blob, filename);
  },

  _utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  },

  async _downloadPdf(bodyHTML, filename) {
    const loadScript = (src) =>
      new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });

    try {
      if (typeof html2canvas === "undefined") {
        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
        );
      }
      if (!(window.jspdf && window.jspdf.jsPDF)) {
        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
        );
      }
    } catch {
      alert("Falha ao carregar o gerador de PDF.");
      return;
    }

    const JSPDF = window.jspdf && window.jspdf.jsPDF;
    if (typeof html2canvas === "undefined" || !JSPDF) {
      alert(
        "Não foi possível carregar o gerador de PDF. Verifique sua conexão.",
      );
      return;
    }

    const container = document.createElement("div");
    container.style.cssText = [
      "position:absolute",
      "left:-10000px",
      "top:0",
      "width:780px",
      "padding:18px",
      "font-family:Arial,sans-serif",
      "color:#222",
      "background:#fff",
      "box-sizing:border-box",
    ].join(";");
    container.innerHTML = bodyHTML;
    document.body.appendChild(container);

    const imgs = container.querySelectorAll("img");
    if (imgs.length) {
      await Promise.all(
        Array.from(imgs).map((img) =>
          img.complete && img.naturalWidth > 0
            ? Promise.resolve()
            : new Promise((r) => {
                img.onload = r;
                img.onerror = r;
              }),
        ),
      );
    }
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 780,
      });

      const pdf = new JSPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      const usable = pageH - margin * 2;

      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      let heightLeft = imgH;
      let position = margin;
      pdf.addImage(imgData, "JPEG", margin, position, imgW, imgH);
      heightLeft -= usable;
      while (heightLeft > 0) {
        position = margin - (imgH - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", margin, position, imgW, imgH);
        heightLeft -= usable;
      }

      pdf.save(filename);
    } finally {
      container.remove();
    }
  },

  async _buildVisualHTML(visual) {
    if (!visual?.tipo) return "";
    try {
      switch (visual.tipo) {
        case "grafico_funcao":
        case "grafico_barras":
        case "grafico_pizza":
          return await this._chartToImgHTML(visual);
        case "svg":
          return await this._svgToImgHTML(visual.codigo);
        case "imagem_wiki":
          return await this._wikiToImgHTML(visual.busca);
        default:
          return "";
      }
    } catch (e) {
      console.warn("[Download] visual falhou:", e.message);
      return "";
    }
  },

  async _chartToImgHTML(visual) {
    if (typeof Chart === "undefined") return "";
    const d = visual.dados;
    if (!d) return "";

    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 450;
    const wrapper = document.createElement("div");
    wrapper.style.cssText =
      "position:fixed;left:0;top:0;width:800px;height:450px;z-index:-9999;pointer-events:none";
    wrapper.appendChild(canvas);
    document.body.appendChild(wrapper);

    let chartConfig;

    if (visual.tipo === "grafico_funcao") {
      if (!d.funcao) {
        wrapper.remove();
        return "";
      }
      const n = d.passos || 100;
      const xMin = d.dominio?.[0] ?? -10;
      const xMax = d.dominio?.[1] ?? 10;
      const step = (xMax - xMin) / n;
      let fn;
      try {
        fn = new Function("x", `"use strict";return (${d.funcao});`);
      } catch {
        wrapper.remove();
        return "";
      }
      const labels = [],
        values = [];
      for (let i = 0; i <= n; i++) {
        const x = xMin + i * step;
        const y = fn(x);
        labels.push(parseFloat(x.toFixed(2)));
        values.push(isFinite(y) ? parseFloat(y.toFixed(4)) : null);
      }
      chartConfig = {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: d.label || "f(x)",
              data: values,
              borderColor: "#9B6B42",
              backgroundColor: "rgba(155,107,66,0.08)",
              borderWidth: 2.5,
              pointRadius: 0,
              tension: 0.4,
              fill: true,
              spanGaps: false,
            },
          ],
        },
        options: {
          ...AI2._chartOpts(d.label || ""),
          animation: false,
          responsive: false,
        },
      };
    } else if (visual.tipo === "grafico_barras") {
      if (!d.labels || !d.datasets) {
        wrapper.remove();
        return "";
      }
      const palette = ["#9B6B42", "#7A5035", "#C4A882", "#5C3D2E"];
      chartConfig = {
        type: "bar",
        data: {
          labels: d.labels,
          datasets: d.datasets.map((ds, i) => ({
            label: ds.label,
            data: ds.valores,
            backgroundColor: palette[i % palette.length] + "BB",
            borderColor: palette[i % palette.length],
            borderWidth: 1.5,
            borderRadius: 6,
          })),
        },
        options: {
          ...AI2._chartOpts(d.titulo || ""),
          animation: false,
          responsive: false,
        },
      };
    } else if (visual.tipo === "grafico_pizza") {
      if (!d.labels || !d.valores) {
        wrapper.remove();
        return "";
      }
      const palette = [
        "#9B6B42",
        "#7A5035",
        "#C4A882",
        "#D4B896",
        "#5C3D2E",
        "#B8906A",
      ];
      chartConfig = {
        type: "doughnut",
        data: {
          labels: d.labels,
          datasets: [
            {
              data: d.valores,
              backgroundColor: palette.map((c) => c + "CC"),
              borderColor: "#fff",
              borderWidth: 3,
              hoverOffset: 6,
            },
          ],
        },
        options: {
          ...AI2._chartOpts(d.titulo || ""),
          animation: false,
          responsive: false,
          cutout: "52%",
          scales: {},
        },
      };
    }

    if (!chartConfig) {
      wrapper.remove();
      return "";
    }

    const chart = new Chart(canvas, chartConfig);
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    const dataUrl = canvas.toDataURL("image/png");
    chart.destroy();
    wrapper.remove();

    return `<div style="margin:12px 0;text-align:center"><img src="${dataUrl}" style="max-width:100%;height:auto" alt="Gráfico"></div>`;
  },

  async _svgToImgHTML(codigo) {
    if (!codigo?.trim().toLowerCase().startsWith("<svg")) return "";

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(codigo.trim(), "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (!svgEl) return "";

      let w = 500,
        h = 300;
      const vb = svgEl.getAttribute("viewBox");
      if (vb) {
        const p = vb.split(/[\s,]+/).map(Number);
        if (p.length >= 4 && p[2] > 0 && p[3] > 0) {
          w = p[2];
          h = p[3];
        }
      }
      if (!svgEl.getAttribute("width")) svgEl.setAttribute("width", w);
      if (!svgEl.getAttribute("height")) svgEl.setAttribute("height", h);

      const serialized = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([serialized], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      const dataUrl = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const scale = 2;
          const c = document.createElement("canvas");
          c.width = w * scale;
          c.height = h * scale;
          const ctx = c.getContext("2d");
          ctx.scale(scale, scale);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          resolve(c.toDataURL("image/png"));
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("SVG render failed"));
        };
        img.src = url;
      });

      return `<div style="margin:12px 0;text-align:center"><img src="${dataUrl}" style="max-width:100%;height:auto" alt="Diagrama"></div>`;
    } catch {
      return `<div style="margin:12px 0;text-align:center;max-width:500px;margin-left:auto;margin-right:auto">${codigo.trim()}</div>`;
    }
  },

  async _wikiToImgHTML(busca) {
    if (!busca?.trim()) return "";
    try {
      const result = await AI2._fetchWiki(busca);
      if (!result?.url) return "";

      let dataUrl = "";
      try {
        const resp = await fetch(result.url, { mode: "cors" });
        if (resp.ok) {
          const blob = await resp.blob();
          dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("read fail"));
            reader.readAsDataURL(blob);
          });
        }
      } catch {}

      const esc = (s) =>
        String(s || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      const src = dataUrl || result.url;
      return `<div style="margin:12px 0;text-align:center"><img src="${esc(src)}" style="max-width:480px;width:100%;height:auto" alt="${esc(busca)}" crossorigin="anonymous"><p style="font-size:10px;color:#888;margin-top:4px">${esc(result.title || busca)} · Wikimedia Commons</p></div>`;
    } catch {
      return "";
    }
  },

  _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },

  _toggleFavorite(sheetId) {
    const subjects = Storage.getSubjects();
    const subj = subjects.find((s) => s.id === this.subject.id);
    if (!subj) return;

    const folha = subj.folhas.find((f) => f.id === sheetId);
    if (!folha) return;

    folha.favorita = !folha.favorita;
    Storage.setSubjects(subjects);

    this.subject = subj;
    this._renderSheetList();
  },

  _deleteSheet(sheetId) {
    const fTitle =
      this.subject.folhas.find((f) => f.id === sheetId)?.titulo || "esta folha";
    Confirm.show({
      title: "Apagar folha?",
      text: `"${fTitle}" será removida permanentemente.`,
      confirmLabel: "Apagar",
      onConfirm: () => {
        const subjects = Storage.getSubjects();
        const subj = subjects.find((s) => s.id === this.subject.id);
        if (!subj) return;
        subj.folhas = subj.folhas.filter((f) => f.id !== sheetId);
        Storage.setSubjects(subjects);
        this.subject = subj;
        if (!subj.folhas.length) {
          const allSubj = Storage.getSubjects().filter((s) => s.id !== subj.id);
          Storage.setSubjects(allSubj);
          Router.go("folhas");
        } else {
          this._renderSheetList();
        }
      },
    });
  },

  _renderSheetView() {
    history.pushState({ foliumSheet: true }, "", window.location.href);
    Navbar.renderTop({
      backRoute: null,
      backLabel: null,
      title: `<em>${this.subject.nomeNormalizado}</em>`,
    });

    const nav = DOM.$(".top-nav");
    if (nav) {
      const wrapper = nav.firstElementChild;
      if (wrapper) {
        const backBtn = document.createElement("button");
        backBtn.className = "nav-back";
        backBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="15" height="15" style="flex-shrink:0"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> ${this.subject.nomeNormalizado}`;
        backBtn.addEventListener("click", () => {
          Storage.clearContext("sheetId");
          Storage.clearContext("viewSheet");
          Router.go("materia", { subjectId: this.subject.id });
        });
        DOM.clear(wrapper);
        wrapper.appendChild(backBtn);
      }
    }

    const body = DOM.$("#materia-body");
    if (!body) return;

    DOM.clear(body);

    const isFav = !!this.sheet.favorita;

    const header = document.createElement("div");
    header.className = "sheet-view-header";
    header.innerHTML = `
      <div class="shv-badges">
        <span class="badge badge-accent">Folha de estudo</span>
        ${this.sheet.nivelLabel ? `<span class="badge badge-nivel">${this.sheet.nivelLabel}</span>` : ""}
        <button class="fav-btn-header ${isFav ? "on" : ""}" id="fav-header-btn"
                title="${isFav ? "Remover favorito" : "Favoritar"}">
          ${isFav ? '<svg viewBox="0 0 24 24" fill="#f5a623" stroke="#f5a623" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px;stroke:var(--text-light)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'}
        </button>
      </div>
      <h2 class="t-section" style="margin-top:10px;margin-bottom:6px">${this.sheet.titulo}</h2>
      <p class="t-sub">Criada em ${this.sheet.dataFormatada} · ${this.sheet.topicos.length} tópico${this.sheet.topicos.length !== 1 ? "s" : ""}</p>`;
    body.appendChild(header);

    const favBtn = header.querySelector("#fav-header-btn");
    if (favBtn) {
      favBtn.addEventListener("click", () => {
        const subjects = Storage.getSubjects();
        const subj = subjects.find((s) => s.id === this.subject.id);
        if (!subj) return;
        const folha = subj.folhas.find((f) => f.id === this.sheet.id);
        if (!folha) return;
        folha.favorita = !folha.favorita;
        Storage.setSubjects(subjects);
        this.sheet.favorita = folha.favorita;
        favBtn.innerHTML = folha.favorita
          ? '<svg viewBox="0 0 24 24" fill="#f5a623" stroke="#f5a623" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px;stroke:var(--text-light)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        favBtn.classList.toggle("on", folha.favorita);
        favBtn.title = folha.favorita ? "Remover favorito" : "Favoritar";
      });
    }

    const contentDiv = document.createElement("div");
    contentDiv.className = "sheet-view-body";
    body.appendChild(contentDiv);

    if (this.sheet.resultado) {
      AI2.renderFolha(
        contentDiv,
        this.subject.nomeNormalizado,
        this.sheet.tema,
        this.sheet.nivel,
        this.sheet.resultado,
        false,
      );
    } else {
      this.sheet.topicos.forEach((tp) => {
        const sec = document.createElement("div");
        sec.className = "sh-section";
        sec.innerHTML = `<h3 class="t-topic">${tp}</h3>
          <p class="sh-explain t-sub">Conteúdo não disponível — esta folha foi salva sem o resultado completo da IA.</p>`;
        contentDiv.appendChild(sec);
      });
    }

    const spacer = document.createElement("div");
    spacer.style.height = "40px";
    body.appendChild(spacer);
  },
};

document.addEventListener("DOMContentLoaded", () => MateriaPage.init());
