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
    Sidebar.init();
    Storage.clearContext('sheetId');
    Storage.clearContext('viewSheet');

    Navbar.renderTop({
      backRoute: 'folhas',
      backLabel: 'Matérias',
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

    /* Breadcrumb */
    const bread = document.createElement('div');
    bread.className = 'bread-row au';
    bread.innerHTML = `
      <button class="bread-back" onclick="Router.go('folhas')">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Matérias
      </button>
      <span class="bread-sep">/</span>
      <span class="bread-current">${this.subject.nomeNormalizado}</span>`;
    body.appendChild(bread);

    const lbl = document.createElement('p');
    lbl.className = 't-label mb-16';
    lbl.textContent = `${folhas.length} folha${folhas.length !== 1 ? 's' : ''}`;
    body.appendChild(lbl);

    if (!folhas.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
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
        subjectId:  this.subject.id,
        onFavorite: () => this._toggleFavorite(sh.id),
        onDelete:   () => this._deleteSheet(sh.id),
        onDownload: (format) => this._downloadSheet(sh.id, format),
      });
      card.style.animationDelay = `${i * 0.07}s`;
      card.classList.add('au');
      body.appendChild(card);
    });
  },

  /* ── Download de folha (PDF ou DOC) ── */
  async _downloadSheet(sheetId, format) {
    const folha = this.subject.folhas.find(f => f.id === sheetId);
    if (!folha) return;

    const safeName = (folha.titulo || 'folha')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').slice(0, 80) || 'folha';

    Modal.showLoading(
      format === 'doc' ? 'Gerando documento...' : 'Gerando PDF...',
      'Renderizando conteúdo e gráficos'
    );

    let container = null;
    try {
      container = await this._buildSheetContainer(folha);
      this._stageContainer(container);
      /* Garante que o conteúdo foi pintado antes da captura */
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      if (format === 'doc') {
        this._downloadDocFromContainer(container, `${safeName}.doc`, folha.titulo);
      } else {
        await this._downloadPdfFromContainer(container, `${safeName}.pdf`);
      }
    } catch (err) {
      console.warn('[export] falha:', err);
      alert('Não foi possível exportar a folha. Tente novamente.');
    } finally {
      Modal.hideLoading();
      if (container && container.parentNode) container.remove();
    }
  },

  /* Posiciona um container no DOM para captura sem ser recortado por
     `overflow-x: clip` do html/body. O overlay de loading (z-modal=300)
     cobre visualmente este container (z-index:1) enquanto exporta. */
  _stageContainer(el) {
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.width = '780px';
    el.style.maxWidth = '780px';
    el.style.background = '#ffffff';
    el.style.color = '#222';
    el.style.padding = '18px';
    el.style.margin = '0';
    el.style.fontFamily = 'Arial, sans-serif';
    el.style.fontSize = '12pt';
    el.style.lineHeight = '1.5';
    el.style.zIndex = '1';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);
  },

  /* Monta o DOM completo da folha (texto + gráficos já convertidos em PNG) */
  async _buildSheetContainer(folha) {
    const esc = (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const root = document.createElement('div');
    root.className = 'folium-export-root';

    root.insertAdjacentHTML('beforeend',
      `<h1 style="font-family:Georgia,serif;margin:0 0 4px">${esc(folha.titulo || 'Folha')}</h1>`);
    const subtitle = [this.subject.nomeNormalizado, folha.tema].filter(Boolean).map(esc).join(' — ');
    if (subtitle) root.insertAdjacentHTML('beforeend',
      `<p style="margin:0 0 4px;color:#555"><em>${subtitle}</em></p>`);
    const meta = [folha.dataFormatada, folha.nivelLabel].filter(Boolean).map(esc).join(' · ');
    if (meta) root.insertAdjacentHTML('beforeend',
      `<p style="margin:0 0 18px;color:#888;font-size:12px">${meta}</p>`);

    const r = folha.resultado;
    if (r && Array.isArray(r.blocos) && r.blocos.length) {
      for (const b of r.blocos) {
        const sec = document.createElement('div');
        sec.style.cssText = 'margin-bottom:14px;page-break-inside:avoid';

        sec.insertAdjacentHTML('beforeend',
          `<h2 style="font-family:Georgia,serif;margin:18px 0 6px">${esc(b.titulo || '')}</h2>`);
        if (b.explicacao) sec.insertAdjacentHTML('beforeend',
          `<p style="margin:0 0 8px;line-height:1.5">${esc(b.explicacao)}</p>`);

        const ex = b.exemplo;
        if (ex && ex.tipo) {
          const rotulo = esc(ex.rotulo || (ex.tipo === 'pratico' ? 'Exemplo' : ex.tipo === 'tabela' ? 'Tabela' : 'Resumo'));
          if (ex.tipo === 'pratico' && ex.texto) {
            sec.insertAdjacentHTML('beforeend',
              `<div style="margin:8px 0;padding:10px 12px;background:#f6f2ec;border-left:3px solid #b08a5a"><strong>${rotulo}:</strong> ${esc(ex.texto)}</div>`);
          } else if (ex.tipo === 'lista' && Array.isArray(ex.itens) && ex.itens.length) {
            sec.insertAdjacentHTML('beforeend',
              `<div style="margin:8px 0"><strong>${rotulo}</strong><ul>${ex.itens.filter(Boolean).map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`);
          } else if (ex.tipo === 'tabela' && Array.isArray(ex.colunas) && Array.isArray(ex.linhas)) {
            const thead = `<tr>${ex.colunas.map(c => `<th style="border:1px solid #aaa;padding:4px 8px;background:#eee;text-align:left">${esc(c)}</th>`).join('')}</tr>`;
            const tbody = ex.linhas.map(row => {
              const cells = Array.isArray(row) ? row : [];
              return `<tr>${cells.map(c => `<td style="border:1px solid #aaa;padding:4px 8px">${esc(c)}</td>`).join('')}</tr>`;
            }).join('');
            sec.insertAdjacentHTML('beforeend',
              `<div style="margin:8px 0"><strong>${rotulo}</strong><table style="border-collapse:collapse;margin-top:4px">${thead}${tbody}</table></div>`);
          }
        }

        /* Gráficos / SVG / imagens — convertidos para PNG inline (funciona em PDF e DOC) */
        if (b.visual) {
          const el = await this._visualToElement(b.visual);
          if (el) sec.appendChild(el);
        }

        if (b.dica_prova) sec.insertAdjacentHTML('beforeend',
          `<div style="margin:8px 0;padding:8px 12px;background:#fff8e1;border-left:3px solid #e0a800"><strong>Dica de prova:</strong> ${esc(b.dica_prova)}</div>`);

        root.appendChild(sec);
      }

      if (r.resumo_geral) {
        root.insertAdjacentHTML('beforeend',
          `<h2 style="font-family:Georgia,serif;margin:22px 0 6px">Resumo Geral</h2>` +
          `<p style="margin:0;line-height:1.5">${esc(r.resumo_geral)}</p>`);
      }
    } else if (Array.isArray(folha.topicos) && folha.topicos.length) {
      root.insertAdjacentHTML('beforeend',
        '<h2 style="font-family:Georgia,serif;margin:18px 0 6px">Tópicos</h2>' +
        '<ul>' + folha.topicos.map(t => `<li>${esc(t)}</li>`).join('') + '</ul>');
    } else {
      root.insertAdjacentHTML('beforeend', '<p><em>Conteúdo não disponível.</em></p>');
    }

    return root;
  },

  /* Converte um visual (gráfico/svg/wiki) em um <figure> com <img> PNG inline */
  async _visualToElement(visual) {
    if (!visual || !visual.tipo) return null;
    try {
      let dataUrl = null;
      let legenda = '';
      if (visual.tipo === 'grafico_funcao' || visual.tipo === 'grafico_barras' || visual.tipo === 'grafico_pizza') {
        dataUrl = await this._chartToDataUrl(visual);
        legenda = visual.dados?.titulo || visual.dados?.label || '';
      } else if (visual.tipo === 'svg') {
        dataUrl = await this._svgCodeToDataUrl(visual.codigo);
      } else if (visual.tipo === 'imagem_wiki') {
        const res = await this._wikiToDataUrl(visual.busca);
        if (res) { dataUrl = res.dataUrl; legenda = res.title ? `${res.title} · Wikimedia Commons` : ''; }
      }
      if (!dataUrl) return null;

      const fig = document.createElement('figure');
      fig.style.cssText = 'margin:10px 0;text-align:center;page-break-inside:avoid';
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = legenda || 'Visual';
      img.style.cssText = 'max-width:100%;height:auto;display:block;margin:0 auto';
      fig.appendChild(img);
      if (legenda) {
        const cap = document.createElement('figcaption');
        cap.style.cssText = 'margin-top:4px;font-size:11px;color:#666;font-style:italic';
        cap.textContent = legenda;
        fig.appendChild(cap);
      }
      return fig;
    } catch (err) {
      console.warn('[export] visual falhou:', visual.tipo, err);
      return null;
    }
  },

  /* Renderiza um gráfico Chart.js em canvas offscreen e exporta PNG data URL */
  async _chartToDataUrl(visual) {
    if (typeof Chart === 'undefined') return null;

    const W = 1200, H = 700;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    const holder = document.createElement('div');
    holder.style.cssText = `position:fixed;top:0;left:0;width:${W}px;height:${H}px;z-index:0;pointer-events:none;background:#fff`;
    holder.appendChild(canvas);
    document.body.appendChild(holder);

    try {
      const baseOpts = (typeof AI2 !== 'undefined' && AI2._chartOpts)
        ? AI2._chartOpts(visual.dados?.titulo || visual.dados?.label || '')
        : { responsive: false, plugins: {}, scales: {} };
      const opts = Object.assign({}, baseOpts, {
        animation: false,
        responsive: false,
        maintainAspectRatio: false,
      });

      let config;
      if (visual.tipo === 'grafico_funcao') {
        const d = visual.dados;
        if (!d || !d.funcao) return null;
        const n = d.passos || 100;
        const xMin = d.dominio?.[0] ?? -10;
        const xMax = d.dominio?.[1] ?? 10;
        const step = (xMax - xMin) / n;
        let fn;
        try { fn = new Function('x', `"use strict";return (${d.funcao});`); }
        catch { return null; }
        const labels = [], values = [];
        for (let i = 0; i <= n; i++) {
          const x = xMin + i * step;
          let y; try { y = fn(x); } catch { y = null; }
          labels.push(parseFloat(x.toFixed(2)));
          values.push(isFinite(y) ? parseFloat(y.toFixed(4)) : null);
        }
        config = {
          type: 'line',
          data: { labels, datasets: [{
            label: d.label || 'f(x)', data: values,
            borderColor: '#9B6B42', backgroundColor: 'rgba(155,107,66,0.08)',
            borderWidth: 2.5, pointRadius: 0, tension: 0.4, fill: true, spanGaps: false,
          }]},
          options: opts,
        };
      } else if (visual.tipo === 'grafico_barras') {
        const d = visual.dados;
        if (!d || !d.labels || !d.datasets) return null;
        const palette = ['#9B6B42', '#7A5035', '#C4A882', '#5C3D2E'];
        config = {
          type: 'bar',
          data: {
            labels: d.labels,
            datasets: d.datasets.map((ds, i) => ({
              label: ds.label, data: ds.valores,
              backgroundColor: palette[i % palette.length] + 'BB',
              borderColor: palette[i % palette.length],
              borderWidth: 1.5, borderRadius: 6,
            })),
          },
          options: opts,
        };
      } else {
        const d = visual.dados;
        if (!d || !d.labels || !d.valores) return null;
        const palette = ['#9B6B42', '#7A5035', '#C4A882', '#D4B896', '#5C3D2E', '#B8906A'];
        config = {
          type: 'doughnut',
          data: {
            labels: d.labels,
            datasets: [{
              data: d.valores,
              backgroundColor: palette.map(c => c + 'CC'),
              borderColor: '#fff', borderWidth: 3, hoverOffset: 6,
            }],
          },
          options: Object.assign({}, opts, { cutout: '52%', scales: {} }),
        };
      }

      const chart = new Chart(canvas, config);
      /* Com animation:false o chart renderiza sincronamente. Aguarda dois frames por segurança. */
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      let out = null;
      try { out = canvas.toDataURL('image/png'); } catch { out = null; }
      chart.destroy();
      return out && out !== 'data:,' ? out : null;
    } finally {
      holder.remove();
    }
  },

  /* Converte um <svg> inline (string) em PNG data URL */
  async _svgCodeToDataUrl(codigo) {
    if (!codigo) return null;
    const clean = String(codigo).trim();
    if (!clean.toLowerCase().startsWith('<svg')) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(clean, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return null;

    let w = 800, h = 500;
    const vb = svg.getAttribute('viewBox');
    if (vb) {
      const parts = vb.split(/\s+/).map(Number);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        w = 800;
        h = Math.max(200, Math.round(w * (parts[3] / parts[2])));
      }
    }
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const serialized = new XMLSerializer().serializeToString(svg);
    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialized);

    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        try { resolve(canvas.toDataURL('image/png')); }
        catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  },

  /* Busca imagem no Wikimedia e converte para PNG/JPEG data URL */
  async _wikiToDataUrl(busca) {
    if (!busca || !String(busca).trim()) return null;
    if (typeof AI2 === 'undefined' || typeof AI2._fetchWiki !== 'function') return null;
    const result = await AI2._fetchWiki(busca);
    if (!result?.url) return null;
    try {
      const res = await fetch(result.url, { mode: 'cors' });
      if (!res.ok) return null;
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => resolve(null);
        fr.readAsDataURL(blob);
      });
      if (!dataUrl) return null;
      return { dataUrl, title: result.title || '' };
    } catch {
      return null;
    }
  },

  /* Baixa como .doc (HTML compatível com Word) a partir do container pronto */
  _downloadDocFromContainer(container, filename, title) {
    const body = container.innerHTML;
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${(title || 'Folium').replace(/</g, '&lt;')}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
  <style>
    body{font-family:Arial,sans-serif;font-size:12pt;color:#222;padding:16px}
    img{max-width:100%;height:auto}
    table{border-collapse:collapse}
  </style>
</head>
<body>${body}</body>
</html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    this._triggerDownload(blob, filename);
  },

  /* Baixa como .pdf via html2pdf.js a partir do container já montado */
  async _downloadPdfFromContainer(container, filename) {
    if (typeof html2pdf === 'undefined') {
      await this._loadHtml2Pdf();
    }
    if (typeof html2pdf === 'undefined') {
      alert('Não foi possível carregar o gerador de PDF. Verifique sua conexão.');
      return;
    }

    await html2pdf().from(container).set({
      margin: [10, 10, 10, 10],
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    }).save();
  },

  _loadHtml2Pdf() {
    return new Promise((resolve, reject) => {
      if (typeof html2pdf !== 'undefined') return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('html2pdf load failed'));
      document.head.appendChild(s);
    });
  },

  /* Dispara o download de um blob */
  _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
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

  /* ── Apagar folha ── */
  _deleteSheet(sheetId) {
    const fTitle = this.subject.folhas.find(f => f.id === sheetId)?.titulo || 'esta folha';
    Confirm.show({
      title: 'Apagar folha?',
      text: `"${fTitle}" será removida permanentemente.`,
      confirmLabel: 'Apagar',
      onConfirm: () => {
        const subjects = Storage.getSubjects();
        const subj = subjects.find(s => s.id === this.subject.id);
        if (!subj) return;
        subj.folhas = subj.folhas.filter(f => f.id !== sheetId);
        Storage.setSubjects(subjects);
        this.subject = subj;
        if (!subj.folhas.length) {
          // Matéria sem folhas — volta para lista de matérias
          const allSubj = Storage.getSubjects().filter(s => s.id !== subj.id);
          Storage.setSubjects(allSubj);
          Router.go('folhas');
        } else {
          this._renderSheetList();
        }
      }
    });
  },

  /* ── Visualização completa da folha ── */
  _renderSheetView() {
    history.pushState({ foliumSheet: true }, '', window.location.href);
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
        backBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="15" height="15" style="flex-shrink:0"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> ${this.subject.nomeNormalizado}`;
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

    const isFav = !!this.sheet.favorita;

    const header = document.createElement('div');
    header.className = 'sheet-view-header';
    header.innerHTML = `
      <div class="shv-badges">
        <span class="badge badge-accent">Folha de estudo</span>
        ${this.sheet.nivelLabel ? `<span class="badge badge-nivel">${this.sheet.nivelLabel}</span>` : ''}
        <button class="fav-btn-header ${isFav ? 'on' : ''}" id="fav-header-btn"
                title="${isFav ? 'Remover favorito' : 'Favoritar'}">
          ${isFav ? '<svg viewBox="0 0 24 24" fill="#f5a623" stroke="#f5a623" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px;stroke:var(--text-light)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'}
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
        favBtn.innerHTML = folha.favorita ? '<svg viewBox="0 0 24 24" fill="#f5a623" stroke="#f5a623" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px;stroke:var(--text-light)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
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
        this.sheet.resultado,
        false   /* showHeader=false — header já renderizado acima */
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