/* ═══════════════════════════════════════════════════════════════
   FOLIUM — js/ai2.js
   IA 2: Geradora da Folha de Estudos
   Visual system: Chart.js (funções/gráficos) + SVG + Wikimedia
═══════════════════════════════════════════════════════════════ */

const AI2 = {

  /* ─── API ──────────────────────────────────────────────────── */

  async gerarFolha(materia, tema, topicos) {
    const token = Storage.getToken();
    if (!token) throw new Error('Usuário não autenticado.');

    const res = await fetch(`${Config.API}/ai2/sheet`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ materia, tema, topicos }),
    });

    let data;
    try { data = await res.json(); }
    catch { throw new Error(`Servidor retornou ${res.status} sem JSON.`); }

    if (!res.ok) throw new Error(data.detail || `Erro ${res.status} no servidor.`);

    return data;
  },

  /* ─── RENDER PRINCIPAL ─────────────────────────────────────── */

  renderFolha(container, materia, tema, resultado) {
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'sheet-header';
    header.innerHTML = `
      <span class="badge badge-accent">✨ Gerada por IA</span>
      <h2 class="t-section" style="margin-top:10px;margin-bottom:5px">${materia}</h2>
      <p class="t-sub">${tema ? tema + ' · ' : ''}${resultado.blocos.length} tópico${resultado.blocos.length !== 1 ? 's' : ''} · ${new Date().toLocaleDateString('pt-BR')}</p>`;
    container.appendChild(header);

    resultado.blocos.forEach(bloco => {
      container.appendChild(AI2._renderBloco(bloco));
    });

    if (resultado.resumo_geral) {
      const summary = document.createElement('div');
      summary.className = 'sh-summary';
      summary.innerHTML = `<h3>📝 Resumo Geral</h3><p>${resultado.resumo_geral}</p>`;
      container.appendChild(summary);
    }
  },

  /* ─── BLOCO DE TÓPICO ──────────────────────────────────────── */

  _renderBloco(bloco) {
    const sec = document.createElement('div');
    sec.className = 'sh-section';

    let exHTML = '';
    const ex = bloco.exemplo;

    if (ex && ex.tipo === 'tabela' && ex.colunas && ex.linhas) {
      exHTML = `
        <table class="ex-table">
          <tr>${ex.colunas.map(h => `<th>${h}</th>`).join('')}</tr>
          ${ex.linhas.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
        </table>`;
    } else if (ex && ex.tipo === 'lista' && ex.itens) {
      exHTML = `<ul class="ex-list">${ex.itens.map(i => `<li>${i}</li>`).join('')}</ul>`;
    } else if (ex && ex.tipo === 'pratico' && ex.texto) {
      exHTML = `<p class="ex-pratico">💡 ${ex.texto}</p>`;
    }

    const dicaHTML = bloco.dica_prova
      ? `<div class="sh-dica">🎯 ${bloco.dica_prova}</div>`
      : '';

    sec.innerHTML = `
      <h3 class="t-topic">${bloco.titulo}</h3>
      <p class="sh-explain">${bloco.explicacao}</p>
      ${exHTML ? `<div class="sh-ex"><div class="sh-ex-lbl">📌 Exemplo</div>${exHTML}</div>` : ''}
      ${dicaHTML}`;

    /* Visual adicionado programaticamente para suportar async (Wikimedia) */
    if (bloco.visual) {
      const visualEl = AI2._renderVisual(bloco.visual, sec);
      if (visualEl) sec.appendChild(visualEl);
    }

    return sec;
  },

  /* ─── DISPATCHER DE VISUAL ─────────────────────────────────── */

  _renderVisual(visual, parentSec) {
    if (!visual || !visual.tipo) return null;

    const wrap = document.createElement('div');
    wrap.className = 'sh-visual';

    const label = document.createElement('div');
    label.className = 'sh-visual-lbl';

    const icons = {
      grafico_funcao:  '📈 Gráfico',
      grafico_barras:  '📊 Gráfico',
      grafico_pizza:   '🥧 Gráfico',
      svg:             '📐 Diagrama',
      imagem_wiki:     '🖼️ Ilustração',
    };
    label.textContent = icons[visual.tipo] || '📊 Visual';
    wrap.appendChild(label);

    try {
      let content = null;

      switch (visual.tipo) {
        case 'grafico_funcao':
          content = AI2._renderFuncaoChart(visual.dados);
          break;
        case 'grafico_barras':
          content = AI2._renderBarrasChart(visual.dados);
          break;
        case 'grafico_pizza':
          content = AI2._renderPizzaChart(visual.dados);
          break;
        case 'svg':
          content = AI2._renderSVG(visual.codigo);
          break;
        case 'imagem_wiki':
          content = AI2._renderWiki(visual.busca, wrap);
          break;
        default:
          return null;
      }

      if (content) wrap.appendChild(content);
      else return null;

    } catch (err) {
      console.warn('[AI2] visual render falhou:', err.message);
      return null;
    }

    return wrap;
  },

  /* ─── CHART.JS: GRÁFICO DE FUNÇÃO ─────────────────────────── */
  /*
   * dados: {
   *   label:   "f(x) = sen(x)",
   *   funcao:  "Math.sin(x)",
   *   dominio: [-6.28, 6.28],
   *   passos:  80
   * }
   */
  _renderFuncaoChart(dados) {
    if (!dados || !dados.funcao) throw new Error('dados.funcao ausente.');

    const canvas = document.createElement('canvas');
    canvas.className = 'visual-canvas';

    const passos = dados.passos || 80;
    const [xMin, xMax] = dados.dominio || [-10, 10];
    const step = (xMax - xMin) / passos;

    let fn;
    try {
      fn = new Function('x', `"use strict"; return (${dados.funcao});`);
    } catch {
      throw new Error('Expressão de função inválida.');
    }

    const labels = [];
    const values = [];
    for (let i = 0; i <= passos; i++) {
      const x = xMin + i * step;
      const y = fn(x);
      labels.push(parseFloat(x.toFixed(2)));
      values.push(isFinite(y) ? parseFloat(y.toFixed(4)) : null);
    }

    requestAnimationFrame(() => {
      new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label:           dados.label || 'f(x)',
            data:            values,
            borderColor:     '#964B00',
            backgroundColor: 'rgba(150,75,0,0.07)',
            borderWidth:     2.5,
            pointRadius:     0,
            tension:         0.4,
            fill:            true,
            spanGaps:        false,
          }],
        },
        options: AI2._chartOptions(dados.label || ''),
      });
    });

    return canvas;
  },

  /* ─── CHART.JS: GRÁFICO DE BARRAS ─────────────────────────── */
  /*
   * dados: {
   *   titulo:   "Comparação",
   *   labels:   ["A", "B", "C"],
   *   datasets: [
   *     { label: "Série 1", valores: [1, 2, 3] }
   *   ]
   * }
   */
  _renderBarrasChart(dados) {
    if (!dados || !dados.labels || !dados.datasets) throw new Error('dados inválidos para barras.');

    const canvas = document.createElement('canvas');
    canvas.className = 'visual-canvas';

    const palette = ['#964B00', '#BE8F61', '#D6B99C', '#7D3E00'];

    requestAnimationFrame(() => {
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: dados.labels,
          datasets: dados.datasets.map((ds, i) => ({
            label:           ds.label,
            data:            ds.valores,
            backgroundColor: palette[i % palette.length] + 'BB',
            borderColor:     palette[i % palette.length],
            borderWidth:     1.5,
            borderRadius:    6,
          })),
        },
        options: AI2._chartOptions(dados.titulo || ''),
      });
    });

    return canvas;
  },

  /* ─── CHART.JS: GRÁFICO DE PIZZA / DONUT ──────────────────── */
  /*
   * dados: {
   *   titulo:  "Composição do ar",
   *   labels:  ["Nitrogênio", "Oxigênio", "Outros"],
   *   valores: [78, 21, 1]
   * }
   */
  _renderPizzaChart(dados) {
    if (!dados || !dados.labels || !dados.valores) throw new Error('dados inválidos para pizza.');

    const canvas = document.createElement('canvas');
    canvas.className = 'visual-canvas visual-canvas--sm';

    const palette = ['#964B00', '#BE8F61', '#D6B99C', '#E9DACA', '#7D3E00'];

    requestAnimationFrame(() => {
      new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: dados.labels,
          datasets: [{
            data:            dados.valores,
            backgroundColor: palette.map(c => c + 'CC'),
            borderColor:     '#fff',
            borderWidth:     3,
            hoverOffset:     6,
          }],
        },
        options: {
          ...AI2._chartOptions(dados.titulo || ''),
          cutout: '52%',
          scales: {},     /* pizza não usa eixos */
        },
      });
    });

    return canvas;
  },

  /* ─── SVG INLINE ───────────────────────────────────────────── */
  /*
   * codigo: string contendo um <svg>...</svg> válido
   */
  _renderSVG(codigo) {
    if (!codigo || typeof codigo !== 'string') throw new Error('SVG ausente.');

    const clean = codigo.trim();
    if (!clean.toLowerCase().startsWith('<svg')) throw new Error('Código SVG inválido.');

    const container = document.createElement('div');
    container.className = 'visual-svg';
    container.innerHTML = clean;

    const svgEl = container.querySelector('svg');
    if (svgEl) {
      svgEl.removeAttribute('width');
      svgEl.removeAttribute('height');
      svgEl.style.width   = '100%';
      svgEl.style.height  = 'auto';
      svgEl.style.display = 'block';
    }

    return container;
  },

  /* ─── WIKIMEDIA COMMONS ────────────────────────────────────── */
  /*
   * busca: "mitose celular divisão"
   * Tenta pt.wikipedia → en.wikipedia. Retorna placeholder imediatamente,
   * substitui pelo <figure> quando a imagem chega.
   */
  _renderWiki(busca) {
    const placeholder = document.createElement('div');
    placeholder.className = 'visual-wiki-loading';
    placeholder.innerHTML = `<span class="loader loader-sm"></span><span>Buscando ilustração…</span>`;

    AI2._fetchWikiImage(busca)
      .then(url => {
        if (!url) { placeholder.remove(); return; }

        const fig = document.createElement('figure');
        fig.className = 'visual-wiki';

        const img = document.createElement('img');
        img.src       = url;
        img.alt       = busca;
        img.className = 'visual-wiki-img';
        img.loading   = 'lazy';

        /* Remove se imagem quebrar */
        img.onerror = () => fig.remove();

        const cap = document.createElement('figcaption');
        cap.className   = 'visual-wiki-cap';
        cap.textContent = `Wikimedia Commons · "${busca}"`;

        fig.appendChild(img);
        fig.appendChild(cap);
        placeholder.replaceWith(fig);
      })
      .catch(() => placeholder.remove());

    return placeholder;
  },

  async _fetchWikiImage(busca) {
    const query = encodeURIComponent(busca);

    for (const lang of ['pt', 'en']) {
      try {
        const url =
          `https://${lang}.wikipedia.org/w/api.php?` +
          `action=query&generator=search&gsrsearch=${query}&gsrlimit=6` +
          `&prop=pageimages&pithumbsize=640&format=json&origin=*`;

        const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) continue;

        const data  = await res.json();
        const pages = Object.values(data?.query?.pages || {});

        /* Pega a primeira página que tem thumbnail */
        const found = pages.find(p => p.thumbnail?.source);
        if (found) return found.thumbnail.source;

      } catch {
        /* ignora e tenta próximo idioma */
      }
    }

    return null;
  },

  /* ─── OPÇÕES PADRÃO CHART.JS ───────────────────────────────── */

  _chartOptions(titulo) {
    return {
      responsive:          true,
      maintainAspectRatio: true,
      animation:           { duration: 600, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          labels: {
            color:    '#2C1A0E',
            font:     { family: "'DM Sans', sans-serif", size: 12 },
            boxWidth: 12,
            padding:  14,
          },
        },
        title: titulo
          ? {
              display: true,
              text:    titulo,
              color:   '#964B00',
              font:    { family: "'Playfair Display', serif", size: 13, weight: '600' },
              padding: { bottom: 10 },
            }
          : { display: false },
        tooltip: {
          backgroundColor: '#fff',
          titleColor:      '#964B00',
          bodyColor:       '#2C1A0E',
          borderColor:     '#D6B99C',
          borderWidth:     1,
          cornerRadius:    8,
          padding:         10,
          titleFont:       { family: "'DM Sans', sans-serif", weight: '600' },
          bodyFont:        { family: "'DM Sans', sans-serif" },
        },
      },
      scales: {
        x: {
          ticks: {
            color:        '#6B4C32',
            font:         { family: "'DM Sans', sans-serif", size: 11 },
            maxTicksLimit: 8,
          },
          grid: { color: 'rgba(150,75,0,0.07)' },
        },
        y: {
          ticks: {
            color: '#6B4C32',
            font:  { family: "'DM Sans', sans-serif", size: 11 },
          },
          grid: { color: 'rgba(150,75,0,0.07)' },
        },
      },
    };
  },
};
