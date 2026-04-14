/* ═══════════════════════════════════════════════════════════════
   FOLIUM — js/ai2.js
   IA 2: Geradora da Folha de Estudos
   Sistema visual: Chart.js · SVG inline · Wikimedia Commons
═══════════════════════════════════════════════════════════════ */

const AI2 = {

  /* ─── API ──────────────────────────────────────────────────── */

  async gerarFolha(materia, tema, nivel, topicos) {
    // topicos deve ser array de { txt, plano_pesquisa }
    const token = Storage.getToken();
    if (!token) throw new Error('Usuário não autenticado.');

    const res = await fetch(`${Config.API}/ai2/sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ materia, tema, nivel, topicos }),
    });

    let data;
    try { data = await res.json(); }
    catch { throw new Error(`Servidor retornou ${res.status} sem JSON.`); }

    if (!res.ok) throw new Error(data.detail || `Erro ${res.status} no servidor.`);
    return data;
  },

  /* ─── RENDER PRINCIPAL ─────────────────────────────────────── */

  renderFolha(container, materia, tema, nivel, resultado) {
    container.innerHTML = '';

    const nivelLabel = {
      fundamental_1: '📚 Fund. I',
      fundamental_2: '📚 Fund. II',
      medio: '🎓 Ensino Médio',
      vestibular: '🏆 Vestibular/ENEM',
      tecnico: '🔧 Técnico',
      superior: '🏛️ Superior',
      pos: '🔬 Pós-graduação',
    }[nivel] || '';

    const header = document.createElement('div');
    header.className = 'sheet-header';
    header.innerHTML = `
      <span class="badge badge-accent">✨ Gerada por IA</span>
      ${nivelLabel ? `<span class="badge badge-nivel">${nivelLabel}</span>` : ''}
      <h2 class="t-section" style="margin-top:10px;margin-bottom:5px">${materia}</h2>
      <p class="t-sub">${tema ? tema + ' · ' : ''}${resultado.blocos.length} tópico${resultado.blocos.length !== 1 ? 's' : ''} · ${new Date().toLocaleDateString('pt-BR')}</p>`;
    container.appendChild(header);

    resultado.blocos.forEach(bloco => container.appendChild(AI2._renderBloco(bloco)));

    if (resultado.resumo_geral) {
      const summary = document.createElement('div');
      summary.className = 'sh-summary';
      summary.innerHTML = `<h3>📝 Resumo Geral</h3><p>${resultado.resumo_geral}</p>`;
      container.appendChild(summary);
    }
  },

  /* ─── BLOCO ────────────────────────────────────────────────── */

  _renderBloco(bloco) {
    const sec = document.createElement('div');
    sec.className = 'sh-section';

    const exHTML = AI2._renderExemplo(bloco.exemplo);
    const dicaHTML = bloco.dica_prova
      ? `<div class="sh-dica">🎯 ${bloco.dica_prova}</div>`
      : '';

    sec.innerHTML = `
      <h3 class="t-topic">${bloco.titulo}</h3>
      <p class="sh-explain">${bloco.explicacao}</p>
      ${exHTML ? `<div class="sh-ex"><div class="sh-ex-lbl">📌 Exemplo</div>${exHTML}</div>` : ''}
      ${dicaHTML}`;

    // Visual adicionado programaticamente (suporta async Wikimedia)
    if (bloco.visual) {
      const el = AI2._renderVisual(bloco.visual);
      if (el) sec.appendChild(el);
    }

    return sec;
  },

  /* ─── EXEMPLO (validação defensiva) ───────────────────────── */

  _renderExemplo(ex) {
    if (!ex || !ex.tipo) return '';

    if (ex.tipo === 'tabela') {
      const cols = Array.isArray(ex.colunas) ? ex.colunas : [];
      const rows = Array.isArray(ex.linhas) ? ex.linhas : [];
      if (!cols.length || !rows.length) return '';

      const head = `<tr>${cols.map(h => `<th>${h}</th>`).join('')}</tr>`;
      const body = rows.map(r => {
        const cells = Array.isArray(r) ? r : [r];
        return `<tr>${cells.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`;
      }).join('');
      return `<table class="ex-table">${head}${body}</table>`;
    }

    if (ex.tipo === 'lista') {
      const items = Array.isArray(ex.itens) ? ex.itens.filter(Boolean) : [];
      if (!items.length) return '';
      return `<ul class="ex-list">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
    }

    if (ex.tipo === 'pratico') {
      const txt = typeof ex.texto === 'string' ? ex.texto.trim() : '';
      if (!txt) return '';
      return `<p class="ex-pratico">💡 ${txt}</p>`;
    }

    return '';
  },

  /* ─── DISPATCHER VISUAL ────────────────────────────────────── */

  _renderVisual(visual) {
    if (!visual?.tipo) return null;

    const wrap = document.createElement('div');
    wrap.className = 'sh-visual';

    const icons = {
      grafico_funcao: '📈 Gráfico',
      grafico_barras: '📊 Gráfico',
      grafico_pizza: '🥧 Gráfico',
      svg: '📐 Diagrama',
      imagem_wiki: '🖼️ Ilustração',
    };
    const lbl = document.createElement('div');
    lbl.className = 'sh-visual-lbl';
    lbl.textContent = icons[visual.tipo] || '📊 Visual';
    wrap.appendChild(lbl);

    try {
      let el = null;
      switch (visual.tipo) {
        case 'grafico_funcao': el = AI2._chartFuncao(visual.dados); break;
        case 'grafico_barras': el = AI2._chartBarras(visual.dados); break;
        case 'grafico_pizza': el = AI2._chartPizza(visual.dados); break;
        case 'svg': el = AI2._renderSVG(visual.codigo); break;
        case 'imagem_wiki': el = AI2._renderWiki(visual.busca); break;
        default: return null;
      }
      if (!el) return null;
      wrap.appendChild(el);
    } catch (err) {
      console.warn('[AI2] visual falhou:', err.message);
      return null;
    }

    return wrap;
  },

  /* ─── CHART.JS: FUNÇÃO ─────────────────────────────────────── */

  _chartFuncao(d) {
    if (!d?.funcao) throw new Error('funcao ausente');

    const canvas = document.createElement('canvas');
    canvas.className = 'visual-canvas';

    const n = d.passos ?? 80;
    const xMin = d.dominio?.[0] ?? -10;
    const xMax = d.dominio?.[1] ?? 10;
    const step = (xMax - xMin) / n;

    let fn;
    try { fn = new Function('x', `"use strict"; return (${d.funcao});`); }
    catch { throw new Error('Expressão de função inválida.'); }

    const labels = [], values = [];
    for (let i = 0; i <= n; i++) {
      const x = xMin + i * step;
      const y = fn(x);
      labels.push(parseFloat(x.toFixed(3)));
      values.push(isFinite(y) ? parseFloat(y.toFixed(5)) : null);
    }

    requestAnimationFrame(() => {
      new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: d.label || 'f(x)',
            data: values,
            borderColor: '#964B00',
            backgroundColor: 'rgba(150,75,0,0.08)',
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.35,
            fill: true,
            spanGaps: false,
          }],
        },
        options: AI2._chartOpts(d.label || ''),
      });
    });

    return canvas;
  },

  /* ─── CHART.JS: BARRAS ─────────────────────────────────────── */

  _chartBarras(d) {
    if (!d?.labels || !d?.datasets) throw new Error('dados inválidos para barras');

    const canvas = document.createElement('canvas');
    canvas.className = 'visual-canvas';
    const pal = ['#964B00', '#BE8F61', '#D6B99C', '#7D3E00'];

    requestAnimationFrame(() => {
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: d.labels,
          datasets: d.datasets.map((ds, i) => ({
            label: ds.label,
            data: ds.valores,
            backgroundColor: pal[i % pal.length] + 'BB',
            borderColor: pal[i % pal.length],
            borderWidth: 1.5,
            borderRadius: 6,
          })),
        },
        options: AI2._chartOpts(d.titulo || ''),
      });
    });

    return canvas;
  },

  /* ─── CHART.JS: PIZZA / DONUT ──────────────────────────────── */

  _chartPizza(d) {
    if (!d?.labels || !d?.valores) throw new Error('dados inválidos para pizza');

    const canvas = document.createElement('canvas');
    canvas.className = 'visual-canvas visual-canvas--sm';
    const pal = ['#964B00', '#BE8F61', '#D6B99C', '#E9DACA', '#7D3E00'];

    requestAnimationFrame(() => {
      new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: d.labels,
          datasets: [{
            data: d.valores,
            backgroundColor: pal.map(c => c + 'CC'),
            borderColor: '#ffffff',
            borderWidth: 3,
            hoverOffset: 6,
          }],
        },
        options: {
          ...AI2._chartOpts(d.titulo || ''),
          cutout: '52%',
          scales: {},
        },
      });
    });

    return canvas;
  },

  /* ─── SVG INLINE ───────────────────────────────────────────── */

  _renderSVG(codigo) {
    if (typeof codigo !== 'string' || !codigo.trim().toLowerCase().startsWith('<svg')) {
      throw new Error('SVG inválido ou ausente.');
    }
    const wrap = document.createElement('div');
    wrap.className = 'visual-svg';
    wrap.innerHTML = codigo.trim();

    const svg = wrap.querySelector('svg');
    if (svg) {
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.style.cssText = 'width:100%;height:auto;display:block;';
    }
    return wrap;
  },

  /* ─── WIKIMEDIA COMMONS ────────────────────────────────────── */

  _renderWiki(busca) {
    if (!busca) return null;

    const ph = document.createElement('div');
    ph.className = 'visual-wiki-loading';
    ph.innerHTML = `<span class="loader loader-sm"></span><span>Buscando ilustração…</span>`;

    AI2._fetchWiki(busca)
      .then(url => {
        if (!url) { ph.remove(); return; }

        const fig = document.createElement('figure');
        fig.className = 'visual-wiki';

        const img = document.createElement('img');
        img.src = url;
        img.alt = busca;
        img.className = 'visual-wiki-img';
        img.loading = 'lazy';
        img.onerror = () => fig.remove();

        const cap = document.createElement('figcaption');
        cap.className = 'visual-wiki-cap';
        cap.textContent = `Wikimedia Commons · ${busca}`;

        fig.appendChild(img);
        fig.appendChild(cap);
        ph.replaceWith(fig);
      })
      .catch(() => ph.remove());

    return ph;
  },

  async _fetchWiki(busca) {
    const q = encodeURIComponent(busca);

    for (const lang of ['pt', 'en']) {
      try {
        const url =
          `https://${lang}.wikipedia.org/w/api.php` +
          `?action=query&generator=search&gsrsearch=${q}&gsrlimit=10` +
          `&prop=pageimages&pithumbsize=700&format=json&origin=*`;

        const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
        if (!res.ok) continue;

        const data = await res.json();
        const pages = Object.values(data?.query?.pages || {});

        // Prioriza imagens de maior resolução
        const withImg = pages
          .filter(p => p.thumbnail?.source)
          .sort((a, b) => (b.thumbnail?.width ?? 0) - (a.thumbnail?.width ?? 0));

        if (withImg.length) return withImg[0].thumbnail.source;
      } catch {
        // tenta próximo idioma
      }
    }

    return null;
  },

  /* ─── OPÇÕES CHART.JS ──────────────────────────────────────── */

  _chartOpts(titulo) {
    return {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 500 },
      plugins: {
        legend: {
          labels: {
            color: '#2C1A0E',
            font: { family: "'DM Sans', sans-serif", size: 12 },
            boxWidth: 12,
            padding: 14,
          },
        },
        title: titulo ? {
          display: true,
          text: titulo,
          color: '#964B00',
          font: { family: "'Playfair Display', serif", size: 13, weight: '600' },
          padding: { bottom: 10 },
        } : { display: false },
        tooltip: {
          backgroundColor: '#ffffff',
          titleColor: '#964B00',
          bodyColor: '#2C1A0E',
          borderColor: '#D6B99C',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          titleFont: { family: "'DM Sans', sans-serif", weight: '600' },
          bodyFont: { family: "'DM Sans', sans-serif" },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#6B4C32',
            font: { family: "'DM Sans', sans-serif", size: 11 },
            maxTicksLimit: 8,
          },
          grid: { color: 'rgba(150,75,0,0.07)' },
        },
        y: {
          ticks: {
            color: '#6B4C32',
            font: { family: "'DM Sans', sans-serif", size: 11 },
          },
          grid: { color: 'rgba(150,75,0,0.07)' },
        },
      },
    };
  },
};