const AI2 = {

  /* API */
  async gerarFolha(materia, tema, nivel, topicos) {
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

    if (res.status === 401) {
      Storage.clearUser();
      Router.go('login');
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (!res.ok) throw new Error(data.detail || `Erro ${res.status} no servidor.`);
    return data;
  },

  /* RENDER PRINCIPAL */
  renderFolha(container, materia, tema, nivel, resultado, showHeader = true) {
    container.innerHTML = '';

    const nivelLabel = {
      fundamental_1: 'Fund. I', fundamental_2: 'Fund. II',
      medio: 'Ensino Médio', vestibular: 'Vestibular/ENEM',
      tecnico: 'Técnico', superior: 'Superior', pos: 'Pós-graduação',
    }[nivel] || '';

    if (showHeader) {
      const header = document.createElement('div');
      header.className = 'sheet-header';
      header.innerHTML = `
        <span class="badge badge-accent"><svg style="width:13px;height:13px;stroke:var(--caramel);fill:none;stroke-width:1.8;vertical-align:middle;margin-right:3px" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke-linecap="round" stroke-linejoin="round"/></svg>Gerada por IA</span>
        ${nivelLabel ? `<span class="badge badge-nivel">${nivelLabel}</span>` : ''}
        <h2 class="t-section" style="margin-top:10px;margin-bottom:5px">${materia}</h2>
        <p class="t-sub">${tema ? tema + ' · ' : ''}${resultado.blocos.length} tópico${resultado.blocos.length !== 1 ? 's' : ''} · ${new Date().toLocaleDateString('pt-BR')}</p>`;
      container.appendChild(header);
    }

    resultado.blocos.forEach(bloco => container.appendChild(AI2._renderBloco(bloco)));

    if (resultado.resumo_geral) {
      const summary = document.createElement('div');
      summary.className = 'sh-summary';
      summary.innerHTML = `<h3>Resumo Geral</h3><p>${resultado.resumo_geral}</p>`;
      container.appendChild(summary);
    }
  },

  /* BLOCO DE TÓPICO */
  _renderBloco(bloco) {
    const sec = document.createElement('div');
    sec.className = 'sh-section';

    const exHTML = AI2._renderExemplo(bloco.exemplo);
    const dicaHTML = bloco.dica_prova
      ? `<div class="sh-dica"> ${bloco.dica_prova}</div>`
      : '';

    sec.innerHTML = `
      <h3 class="t-topic">${bloco.titulo}</h3>
      <p class="sh-explain">${bloco.explicacao}</p>
      ${exHTML}
      ${dicaHTML}`;

    if (bloco.visual) {
      const el = AI2._renderVisual(bloco.visual);
      if (el) sec.appendChild(el);
    }

    return sec;
  },

  /* EXEMPLO */
  _renderExemplo(ex) {
    if (!ex || !ex.tipo) return '';

    /* Rótulo definido pela IA, com fallbacks por tipo */
    const defaultLabels = {
      pratico: ' Exemplo Resolvido',
      tabela: ' Tabela Comparativa',
      lista: ' Resumo',
    };
    const rotulo = ex.rotulo || defaultLabels[ex.tipo] || ' Conteúdo';

    let innerHTML = '';

    if (ex.tipo === 'tabela') {
      const cols = Array.isArray(ex.colunas) ? ex.colunas : [];
      const rows = Array.isArray(ex.linhas) ? ex.linhas : [];
      if (!cols.length || !rows.length) return '';
      const thead = `<tr>${cols.map(h => `<th>${h}</th>`).join('')}</tr>`;
      const tbody = rows.map(r => {
        const cells = Array.isArray(r) ? r : [];
        return `<tr>${cells.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`;
      }).join('');
      innerHTML = `<table class="ex-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
    }
    else if (ex.tipo === 'lista') {
      const items = Array.isArray(ex.itens) ? ex.itens.filter(Boolean) : [];
      if (!items.length) return '';
      innerHTML = `<ul class="ex-list">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
    }
    else if (ex.tipo === 'pratico') {
      const txt = typeof ex.texto === 'string' ? ex.texto.trim() : '';
      if (!txt) return '';
      innerHTML = `<p class="ex-pratico">${txt}</p>`;
    }

    if (!innerHTML) return '';
    return `<div class="sh-ex"><div class="sh-ex-lbl">${rotulo}</div>${innerHTML}</div>`;
  },

  /* DISPATCHER DE VISUAL */
  _renderVisual(visual) {
    if (!visual?.tipo) return null;

    const wrap = document.createElement('div');
    wrap.className = 'sh-visual';

    const icons = {
      grafico_funcao: ' Gráfico',
      grafico_barras: ' Gráfico',
      grafico_pizza: ' Gráfico',
      svg: ' Diagrama',
      imagem_wiki: '️ Ilustração',
    };
    const lbl = document.createElement('div');
    lbl.className = 'sh-visual-lbl';
    lbl.textContent = icons[visual.tipo] || ' Visual';
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

  /* CHART.JS: FUNÇÃO */
  _chartFuncao(d) {
    if (!d?.funcao) throw new Error('funcao ausente');
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-wrapper';
    const canvas = document.createElement('canvas');
    canvas.className = 'visual-canvas';
    wrapper.appendChild(canvas);

    const n = d.passos || 100;
    const xMin = d.dominio?.[0] ?? -10;
    const xMax = d.dominio?.[1] ?? 10;
    const step = (xMax - xMin) / n;
    let fn;
    try { fn = new Function('x', `"use strict";return (${d.funcao});`); }
    catch { throw new Error('Expressão inválida'); }

    const labels = [], values = [];
    for (let i = 0; i <= n; i++) {
      const x = xMin + i * step;
      const y = fn(x);
      labels.push(parseFloat(x.toFixed(2)));
      values.push(isFinite(y) ? parseFloat(y.toFixed(4)) : null);
    }

    requestAnimationFrame(() => new Chart(canvas, {
      type: 'line',
      data: {
        labels, datasets: [{
          label: d.label || 'f(x)', data: values,
          borderColor: '#9B6B42', backgroundColor: 'rgba(155,107,66,0.08)',
          borderWidth: 2.5, pointRadius: 0, tension: 0.4, fill: true, spanGaps: false,
        }]
      },
      options: AI2._chartOpts(d.label || ''),
    }));
    return wrapper;
  },

  /* CHART.JS: BARRAS */
  _chartBarras(d) {
    if (!d?.labels || !d?.datasets) throw new Error('dados inválidos');
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-wrapper';
    const canvas = document.createElement('canvas');
    canvas.className = 'visual-canvas';
    wrapper.appendChild(canvas);
    const palette = ['#9B6B42', '#7A5035', '#C4A882', '#5C3D2E'];

    requestAnimationFrame(() => new Chart(canvas, {
      type: 'bar',
      data: {
        labels: d.labels,
        datasets: d.datasets.map((ds, i) => ({
          label: ds.label, data: ds.valores,
          backgroundColor: palette[i % palette.length] + 'BB',
          borderColor: palette[i % palette.length],
          borderWidth: 1.5, borderRadius: 6,
        }))
      },
      options: AI2._chartOpts(d.titulo || ''),
    }));
    return wrapper;
  },

  /* CHART.JS: PIZZA */
  _chartPizza(d) {
    if (!d?.labels || !d?.valores) throw new Error('dados inválidos');
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-wrapper chart-wrapper--pizza';
    const canvas = document.createElement('canvas');
    canvas.className = 'visual-canvas visual-canvas--sm';
    wrapper.appendChild(canvas);
    const palette = ['#9B6B42', '#7A5035', '#C4A882', '#D4B896', '#5C3D2E', '#B8906A'];

    requestAnimationFrame(() => new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: d.labels,
        datasets: [{
          data: d.valores,
          backgroundColor: palette.map(c => c + 'CC'),
          borderColor: '#fff', borderWidth: 3, hoverOffset: 6,
        }]
      },
      options: { ...AI2._chartOpts(d.titulo || ''), cutout: '52%', scales: {} },
    }));
    return wrapper;
  },

  /* SVG INLINE */
  _renderSVG(codigo) {
    if (!codigo?.trim().toLowerCase().startsWith('<svg')) throw new Error('SVG inválido');
    const parser = new DOMParser();
    const doc = parser.parseFromString(codigo.trim(), 'image/svg+xml');
    const svgParsed = doc.querySelector('svg');

    if (svgParsed) {
      const geoTags = ['line', 'polygon', 'polyline', 'path', 'circle', 'ellipse'];
      const geoCount = geoTags.reduce((n, tag) => n + svgParsed.querySelectorAll(tag).length, 0);
      const rectCount = svgParsed.querySelectorAll('rect').length;
      const textEls = svgParsed.querySelectorAll('text');
      const textLen = Array.from(textEls).map(t => t.textContent.trim()).join('').length;
      if (geoCount === 0 && rectCount <= 2 && textLen > 6) {
        throw new Error('SVG descartado: apenas caixa com texto, sem geometria real.');
      }
    }

    const wrap = document.createElement('div');
    wrap.className = 'visual-svg';
    wrap.innerHTML = codigo.trim();
    const svg = wrap.querySelector('svg');
    if (svg) {
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.style.cssText = 'width:100%;height:auto;display:block;max-height:260px';
    }
    return wrap;
  },

  /* WIKIMEDIA COMMONS */
  _renderWiki(busca) {
    if (!busca?.trim()) return null;

    const ph = document.createElement('div');
    ph.className = 'visual-wiki-loading';
    ph.innerHTML = `<span class="loader loader-sm"></span><span>Buscando ilustração…</span>`;

    AI2._fetchWiki(busca).then(result => {
      if (!result) { ph.remove(); return; }
      const fig = document.createElement('figure');
      fig.className = 'visual-wiki';
      const img = document.createElement('img');
      img.src = result.url;
      img.alt = busca;
      img.className = 'visual-wiki-img';
      img.loading = 'lazy';
      img.onerror = () => fig.remove();
      const cap = document.createElement('figcaption');
      cap.className = 'visual-wiki-cap';
      cap.textContent = result.title
        ? `${result.title} · Wikimedia Commons`
        : `Wikimedia Commons · "${busca}"`;
      fig.appendChild(img);
      fig.appendChild(cap);
      ph.replaceWith(fig);
    }).catch(() => ph.remove());

    return ph;
  },

  async _fetchWiki(busca) {
    const q = encodeURIComponent(busca);

    /* 1. Wikimedia Commons */
    try {
      const url =
        `https://commons.wikimedia.org/w/api.php` +
        `?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=12` +
        `&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=640&format=json&origin=*`;

      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        const pages = Object.values(data?.query?.pages || {});

        const images = pages
          .filter(p => {
            const info = p.imageinfo?.[0];
            if (!info?.thumburl) return false;
            const mime = info.mime || '';
            return mime.startsWith('image/') &&
              !mime.includes('svg') &&
              !mime.includes('gif');
          })
          .sort((a, b) => {
            const wa = a.imageinfo?.[0]?.width ?? 0;
            const wb = b.imageinfo?.[0]?.width ?? 0;
            return wb - wa;
          });

        if (images.length) {
          const best = images[0];
          return {
            url: best.imageinfo[0].thumburl,
            title: (best.title || '').replace('File:', '').replace(/\.[^.]+$/, ''),
          };
        }
      }
    } catch {}

    /* 2. Fallback */
    for (const lang of ['pt', 'en']) {
      try {
        const url =
          `https://${lang}.wikipedia.org/w/api.php` +
          `?action=query&generator=search&gsrsearch=${q}&gsrlimit=10` +
          `&prop=pageimages&pithumbsize=640&format=json&origin=*`;

        const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
        if (!res.ok) continue;

        const data = await res.json();
        const pages = Object.values(data?.query?.pages || {});
        const sorted = pages
          .filter(p => p.thumbnail?.source)
          .sort((a, b) => (b.thumbnail?.width ?? 0) - (a.thumbnail?.width ?? 0));

        if (sorted.length) return {
          url: sorted[0].thumbnail.source,
          title: sorted[0].title,
        };
      } catch { }
    }

    return null;
  },

  /* OPÇÕES CHART.JS */
  _chartOpts(titulo) {
    return {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 500 },
      plugins: {
        legend: {
          labels: {
            color: '#2C1A0E',
            font: { family: "'DM Sans',sans-serif", size: 12 },
            boxWidth: 12, padding: 14,
          }
        },
        title: titulo
          ? {
            display: true, text: titulo, color: '#964B00',
            font: { family: "'Playfair Display',serif", size: 13, weight: '600' },
            padding: { bottom: 10 }
          }
          : { display: false },
        tooltip: {
          backgroundColor: '#fff', titleColor: '#9B6B42', bodyColor: '#2C1810',
          borderColor: '#D4B896', borderWidth: 1, cornerRadius: 8, padding: 10,
        },
      },
      scales: {
        x: {
          ticks: { color: '#6B4C32', font: { family: "'DM Sans',sans-serif", size: 11 }, maxTicksLimit: 8 },
          grid: { color: 'rgba(150,75,0,0.07)' },
        },
        y: {
          ticks: { color: '#6B4C32', font: { family: "'DM Sans',sans-serif", size: 11 } },
          grid: { color: 'rgba(150,75,0,0.07)' },
        },
      },
    };
  },
};