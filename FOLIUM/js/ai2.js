/* FOLIUM — js/ai2.js */

const AI2 = {

  /* ─────────────────────────────────────────────────────────────────
     VISUAL HINTS (A3)
     Mapa por matéria com palavras-chave (`match`), termos que indicam
     uma figura didática útil (`allow`) e termos que indicam ruído
     (`deny`, ex. capa de livro, brasão, retrato). Usado para enriquecer
     a query no Wikimedia Commons e para pontuar candidatos.
     ───────────────────────────────────────────────────────────────── */
  _VISUAL_HINTS: {
    computacao: {
      match: [
        'java', 'python', 'javascript', 'c++', 'kotlin', 'rust', 'typescript',
        'programa', 'programaç', 'código', 'algoritmo', 'algoritmos',
        'poo', 'orientada a objetos', 'orientação a objetos', 'uml',
        'computaç', 'software', 'banco de dados', 'sql', 'estrutura de dados',
        'sistema operacional', 'rede de computador', 'compilador', 'api', 'http',
        'engenharia de software', 'classe', 'interface', 'herança',
      ],
      allow: [
        'diagram', 'uml', 'class diagram', 'flowchart', 'sequence diagram',
        'screenshot', 'pseudocode', 'graph', 'tree', 'data structure',
        'algorithm', 'state machine', 'er diagram',
      ],
      deny: [
        'book cover', 'novel', 'magazine cover', 'album cover', 'movie poster',
        'film poster', 'painting', 'portrait', 'sculpture',
        'coat of arms', 'flag of', 'stamp', 'banknote', 'coin',
        'apl logo', 'apl (programming language)',
      ],
    },
    matematica: {
      match: [
        'matemática', 'álgebra', 'cálculo', 'geometria', 'trigonometria',
        'estatística', 'probabilidade', 'função', 'matriz', 'integral',
        'derivada', 'logaritmo', 'equação', 'polinômio', 'limite',
      ],
      allow: [
        'graph', 'plot', 'diagram', 'chart', 'theorem', 'formula',
        'function', 'curve', 'geometric', 'angle', 'triangle', 'cartesian',
      ],
      deny: [
        'book cover', 'portrait', 'painting', 'flag of', 'coat of arms',
        'stamp', 'novel', 'album cover',
      ],
    },
    fisica: {
      match: [
        'física', 'mecânica', 'óptica', 'optica', 'termodinâmica',
        'eletricidade', 'magnetismo', 'cinemática', 'dinâmica', 'ondas',
        'energia', 'força', 'cinética', 'potencial', 'eletromagnetismo',
        'relatividade', 'quântica',
      ],
      allow: [
        'diagram', 'experiment', 'apparatus', 'schematic', 'graph',
        'wave', 'circuit', 'physics diagram', 'free body diagram',
        'ray diagram', 'vector',
      ],
      deny: [
        'book cover', 'portrait', 'painting', 'flag of', 'coat of arms',
        'stamp', 'novel', 'album cover',
      ],
    },
    quimica: {
      match: [
        'química', 'átomo', 'molécula', 'reação', 'orgânica', 'inorgânica',
        'tabela periódica', 'ligação química', 'íon', 'ácido', 'base',
        'eletrólise', 'estequiometria', 'cinética química', 'soluç',
      ],
      allow: [
        'molecule', 'molecular', 'structure', 'crystal', 'reaction',
        'periodic', 'orbital', 'chemical', 'atom', 'bond', 'lewis',
      ],
      deny: [
        'book cover', 'portrait', 'painting', 'flag of', 'coat of arms',
        'stamp', 'novel', 'album cover',
      ],
    },
    biologia: {
      match: [
        'biologia', 'célula', 'genética', 'dna', 'rna', 'evolução',
        'ecologia', 'fisiologia', 'anatomia', 'botânica', 'zoologia',
        'microbiologia', 'cromossomo', 'mitose', 'meiose', 'organel',
        'tecido', 'embriologia', 'sistema imun', 'sistema nervoso',
        'sistema circulat', 'sistema digest',
      ],
      allow: [
        'diagram', 'anatomy', 'cell', 'organism', 'microscope', 'specimen',
        'biological', 'micrograph', 'illustration', 'organ', 'tissue',
        'chromosome', 'pedigree chart', 'cross section',
      ],
      deny: [
        'book cover', 'portrait', 'painting', 'flag of', 'coat of arms',
        'stamp', 'novel', 'album cover', 'logo', 'family tree',
        'genealogy', 'church', 'cathedral', 'forest', 'tree (plant)',
        'family pedigree of',
      ],
    },
    historia: {
      match: [
        'história', 'guerra', 'império', 'revolução', 'antiguidade',
        'medieval', 'colonial', 'independência', 'feudal', 'república',
        'monarquia', 'ditadura', 'civilizaç',
      ],
      allow: [
        'painting', 'engraving', 'illustration', 'map', 'photograph',
        'document', 'manuscript', 'historical', 'lithograph',
      ],
      deny: ['book cover', 'modern logo', 'album cover', 'film poster'],
    },
    geografia: {
      match: [
        'geografia', 'mapa', 'clima', 'relevo', 'região', 'país', 'continente',
        'hidrografia', 'urbanização', 'demografia', 'biom', 'vegetaç',
      ],
      allow: [
        'map', 'satellite', 'photograph', 'landscape', 'topography',
        'aerial', 'globe', 'cartographic',
      ],
      deny: ['book cover', 'portrait', 'painting', 'album cover'],
    },
    portugues: {
      match: [
        'português', 'gramática', 'literatura', 'redação', 'sintaxe',
        'morfologia', 'fonética', 'semântica', 'estilística', 'oraç',
      ],
      allow: ['manuscript', 'document', 'diagram'],
      deny: ['book cover', 'album cover'],
    },
  },

  _HINT_DEFAULT: {
    match: [],
    allow: [],
    deny: [
      'book cover', 'flag of', 'coat of arms', 'stamp', 'banknote', 'coin',
      'album cover', 'movie poster', 'film poster',
    ],
  },

  _HINT_STOPWORDS: new Set([
    'para', 'pelo', 'pela', 'com', 'sem', 'dos', 'das', 'que', 'sua',
    'seu', 'seus', 'suas', 'por', 'como', 'sobre', 'entre', 'este',
    'esta', 'isso', 'aquele', 'aquela', 'também', 'mais', 'menos',
    'the', 'and', 'for', 'with', 'from', 'into', 'this', 'that', 'are',
    'java', 'python',  // tokens muito genéricos no Commons; mantemos via materia
  ]),

  _resolveHint(materia, tema, topicoTitulo) {
    const haystack = `${materia || ''} ${tema || ''} ${topicoTitulo || ''}`.toLowerCase();
    let best = null, bestScore = 0;
    for (const h of Object.values(AI2._VISUAL_HINTS)) {
      let score = 0;
      for (const term of (h.match || [])) {
        if (haystack.includes(term.toLowerCase())) score++;
      }
      if (score > bestScore) { bestScore = score; best = h; }
    }
    return best || AI2._HINT_DEFAULT;
  },

  _extractKwTokens(ctx, busca) {
    const tokens = new Set();
    const add = s => (s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')      // sem acentos
      .split(/[\s\-_,.;:/()<>"'`]+/)
      .forEach(t => {
        if (t.length >= 3 && !AI2._HINT_STOPWORDS.has(t)) tokens.add(t);
      });
    add(busca);
    if (ctx?.topicoTitulo) add(ctx.topicoTitulo);
    if (Array.isArray(ctx?.palavras_chave)) ctx.palavras_chave.forEach(add);
    return [...tokens];
  },

  /* Padrões em nomes de arquivo que são quase sempre ruído. */
  _NAME_PENALTIES: [
    /\bcover\b/i, /coat[_-]of[_-]arms/i, /flag[_-]of[_-]/i,
    /\bstamp\b/i, /portrait[_-]of[_-]/i, /\blogo\b/i,
    /\balbum\b/i, /banknote/i, /\bcoin\b/i,
    /book[_-]?cover/i, /front[_-]cover/i,
    /\bposter\b/i, /movie[_-]?poster/i,
  ],

  /* A2 — score composto. Substitui width DESC. */
  _scoreImageCandidate(page, ctx, hint, kwTokens) {
    const info = page.imageinfo?.[0];
    if (!info) return -Infinity;
    const w = info.width || 0;
    const h = info.height || 0;
    if (!w || !h) return -Infinity;

    const ratio = h / w;
    let score = 0;

    // aspecto razoável: penaliza panoramas ultra-largos e tirinhas verticais
    if (ratio >= 0.5 && ratio <= 2.0) score += 1.0;
    else if (ratio >= 0.4 && ratio <= 2.5) score += 0.4;
    else score -= 0.3;

    // banda de tamanho: 300–2000px é o "ponto doce" pra figura didática
    if (w >= 300 && w <= 2000) score += 1.0;
    else if (w >= 200 && w <= 3000) score += 0.4;
    else if (w < 200) score -= 0.5;
    else if (w > 4000) score -= 0.4;   // capas e pôsteres são quase sempre enormes

    const titleRaw = page.title || '';
    const title = titleRaw.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // sobreposição com palavras-chave do contexto (cap em +1.2)
    let kwHits = 0;
    for (const kw of kwTokens) {
      if (title.includes(kw)) kwHits++;
    }
    score += Math.min(kwHits * 0.4, 1.2);

    // termos que sinalizam figura didática
    const allow = hint.allow || [];
    for (const a of allow) {
      if (title.includes(a.toLowerCase())) { score += 0.6; break; }
    }
    if (/(diagram|schematic|figure|illustration|chart|graph)/i.test(title)) {
      score += 0.5;
    }

    // termos da denylist no título (matéria + default)
    const deny = (hint.deny || []).concat(AI2._HINT_DEFAULT.deny);
    for (const d of deny) {
      if (title.includes(d.toLowerCase())) { score -= 1.5; break; }
    }

    // padrões no nome do arquivo
    if (AI2._NAME_PENALTIES.some(re => re.test(titleRaw))) score -= 2.0;

    return score;
  },

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

    if (!res.ok) throw new Error(data.detail || `Erro ${res.status} no servidor.`);
    return data;
  },

  /* RENDER PRINCIPAL */
  renderFolha(container, materia, tema, nivel, resultado, showHeader = true, topicos = []) {
    container.innerHTML = '';

    /* Indexa palavras_chave por título de tópico (quando vierem do criar.js).
       Ao renderizar cada bloco, cruzamos com bloco.titulo via includes().
       Folhas salvas (materia.js) chegam só com strings → degradam para [].  */
    const planoIdx = (Array.isArray(topicos) ? topicos : [])
      .map(t => {
        const txt = typeof t === 'string' ? t : (t?.txt || '');
        const kws = t?.plano_pesquisa?.palavras_chave || [];
        return { txt: (txt || '').toLowerCase(), kws };
      })
      .filter(t => t.txt);

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

    resultado.blocos.forEach(bloco => {
      const tituloBaixo = (bloco.titulo || '').toLowerCase();
      const match = planoIdx.find(p =>
        tituloBaixo.includes(p.txt) || p.txt.includes(tituloBaixo));
      const ctx = {
        materia, tema, nivel,
        topicoTitulo: bloco.titulo || '',
        palavras_chave: match?.kws || [],
      };
      container.appendChild(AI2._renderBloco(bloco, ctx));
    });

    if (resultado.resumo_geral) {
      const summary = document.createElement('div');
      summary.className = 'sh-summary';
      summary.innerHTML = `<h3>Resumo Geral</h3><p>${resultado.resumo_geral}</p>`;
      container.appendChild(summary);
    }
  },

  /* BLOCO DE TÓPICO */
  _renderBloco(bloco, ctx) {
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
      const el = AI2._renderVisual(bloco.visual, ctx);
      if (el) sec.appendChild(el);
    }

    return sec;
  },

  /* EXEMPLO com rótulo variável */
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
  _renderVisual(visual, ctx) {
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
        case 'imagem_wiki': el = AI2._renderWiki(visual.busca, ctx); break;
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
  _renderWiki(busca, ctx) {
    if (!busca?.trim()) return null;

    const ph = document.createElement('div');
    ph.className = 'visual-wiki-loading';
    ph.innerHTML = `<span class="loader loader-sm"></span><span>Buscando ilustração…</span>`;

    AI2._fetchWiki(busca, ctx).then(result => {
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

  /* Pontuação mínima aceitável. Abaixo disso, descartamos a imagem em
     vez de exibir lixo (capa de livro, bandeira lisa, retrato aleatório). */
  _SCORE_THRESHOLD: 0.5,

  async _fetchWiki(busca, ctx) {
    const buscaTrim = (busca || '').trim();
    if (!buscaTrim) return null;

    const hint = AI2._resolveHint(ctx?.materia, ctx?.tema, ctx?.topicoTitulo);
    const kwTokens = AI2._extractKwTokens(ctx, buscaTrim);

    /* A1 — query enriquecida com termos negativos (Commons aceita -"phrase").
       Cada deny vira um -"...". Isso já filtra ~70% dos casos óbvios. */
    const denyOps = (hint.deny || AI2._HINT_DEFAULT.deny)
      .slice(0, 6)
      .map(t => `-"${t}"`)
      .join(' ');
    const enriched = denyOps ? `${buscaTrim} ${denyOps}` : buscaTrim;
    const q = encodeURIComponent(enriched);

    /* 1. Wikimedia Commons */
    try {
      const url =
        `https://commons.wikimedia.org/w/api.php` +
        `?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=20` +
        `&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=640&format=json&origin=*`;

      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        const pages = Object.values(data?.query?.pages || {});

        const candidates = pages
          .filter(p => {
            const info = p.imageinfo?.[0];
            if (!info?.thumburl) return false;
            const mime = info.mime || '';
            return mime.startsWith('image/') &&
              !mime.includes('svg') &&
              !mime.includes('gif');
          })
          .map(p => ({
            page: p,
            score: AI2._scoreImageCandidate(p, ctx, hint, kwTokens),
          }))
          .sort((a, b) => b.score - a.score);

        const best = candidates[0];
        if (best && best.score >= AI2._SCORE_THRESHOLD) {
          return {
            url: best.page.imageinfo[0].thumburl,
            title: (best.page.title || '').replace('File:', '').replace(/\.[^.]+$/, ''),
          };
        }
      }
    } catch { /* continua */ }

    /* 2. Fallback: Wikipedia thumbnails (pt → en).
       Aqui a query original é mais útil (sem operadores Commons-específicos);
       mas ainda aplicamos filtros de denylist no título da página. */
    const denyTitle = (hint.deny || []).concat(AI2._HINT_DEFAULT.deny);
    const allowTitle = hint.allow || [];
    const qPlain = encodeURIComponent(buscaTrim);
    for (const lang of ['pt', 'en']) {
      try {
        const url =
          `https://${lang}.wikipedia.org/w/api.php` +
          `?action=query&generator=search&gsrsearch=${qPlain}&gsrlimit=10` +
          `&prop=pageimages&pithumbsize=640&format=json&origin=*`;

        const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
        if (!res.ok) continue;

        const data = await res.json();
        const pages = Object.values(data?.query?.pages || {})
          .filter(p => p.thumbnail?.source);

        const scored = pages.map(p => {
          const titleLow = (p.title || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          let s = 0;
          if (p.thumbnail?.width >= 200 && p.thumbnail?.width <= 1500) s += 0.5;
          for (const kw of kwTokens) if (titleLow.includes(kw)) { s += 0.4; break; }
          for (const a of allowTitle) if (titleLow.includes(a)) { s += 0.3; break; }
          for (const d of denyTitle) if (titleLow.includes(d)) { s -= 1.5; break; }
          if (AI2._NAME_PENALTIES.some(re => re.test(p.title || ''))) s -= 1.5;
          return { p, s };
        }).sort((a, b) => b.s - a.s);

        const top = scored[0];
        if (top && top.s >= 0) {
          return { url: top.p.thumbnail.source, title: top.p.title };
        }
      } catch { /* tenta próximo */ }
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