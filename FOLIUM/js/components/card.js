/* FOLIUM — components/card.js */

/* SVG icons para cards */
const CardIcons = {
  criar:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  folhas: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg>`,
  suporte:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg>`,
  sheet:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>`,
  subject:`<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>`,
  arrow:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  star:   `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  starFill:`<svg viewBox="0 0 24 24" fill="#f5a623" stroke="#f5a623" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  check:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  close:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  warn:   `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,

  /* Ícones por tipo de matéria (baseado no nome) */
  getSubjectIcon(name = '') {
    const n = name.toLowerCase();
    if (n.includes('bio'))   return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M7 12s2-5 5-5 5 5 5 5-2 5-5 5-5-5-5-5z"/></svg>`;
    if (n.includes('mat') || n.includes('calc') || n.includes('álg')) return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`;
    if (n.includes('fís'))   return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`;
    if (n.includes('hist'))  return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    if (n.includes('geo'))   return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`;
    if (n.includes('quím'))  return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v11l-4 6h14l-4-6V3"/></svg>`;
    if (n.includes('port') || n.includes('liter')) return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`;
    /* padrão */
    return CardIcons.subject;
  },
};

const Card = {
  /**
   * Card de ação do dashboard
   */
  action({ icon, iconClass = 'ai-1', title, subtitle, route, ctx = {} }) {
    /* Mapeia o ícone emoji antigo para SVG */
    const svgMap = {
      'criar':   CardIcons.criar,
      'folhas':  CardIcons.folhas,
      'suporte': CardIcons.suporte,
    };
    const svgIcon = svgMap[route] || CardIcons.sheet;

    /* Mapeia arrow para SVG */
    const arrowSvg = CardIcons.arrow;

    const btn = document.createElement('button');
    btn.className = 'act-card au';
    btn.innerHTML = `
      <div class="act-icon ${iconClass}">${svgIcon}</div>
      <div class="act-info">
        <h3>${title}</h3>
        <p>${subtitle}</p>
      </div>
      <span class="act-arr">${arrowSvg}</span>`;
    btn.addEventListener('click', () => Router.go(route, ctx));
    return btn;
  },

  /**
   * Card de matéria
   */
  subject(s) {
    const nome  = s.nomeNormalizado || s.name || 'Matéria';
    const count = Array.isArray(s.folhas) ? s.folhas.length
                : Array.isArray(s.sheets) ? s.sheets.length
                : 0;
    const icon  = CardIcons.getSubjectIcon(nome);

    const btn = document.createElement('button');
    btn.className = 'subj-card';
    btn.innerHTML = `
      <div class="subj-emoji">${icon}</div>
      <div class="subj-info">
        <div class="subj-name">${nome}</div>
        <div class="subj-count">${count} folha${count !== 1 ? 's' : ''}</div>
      </div>
      <span class="subj-arr">${CardIcons.arrow}</span>`;
    btn.addEventListener('click', () =>
      Router.go('materia', { subjectId: s.id })
    );
    return btn;
  },

  /**
   * Card de folha individual
   */
  sheet(sh) {
    const titulo     = sh.titulo  || sh.title  || 'Folha';
    const data       = sh.dataFormatada || sh.date || '';
    const topicos    = Array.isArray(sh.topicos) ? sh.topicos
                     : Array.isArray(sh.topics)  ? sh.topics
                     : [];
    const nivelLabel = sh.nivelLabel || '';
    const isFav      = !!sh.favorita;
    const subjectId  = sh.subjectId;
    const onFavorite = sh.onFavorite;

    const btn = document.createElement('button');
    btn.className = 'sheet-card-item';
    btn.innerHTML = `
      <div class="sc-icon">${CardIcons.sheet}</div>
      <div class="sc-info">
        <div class="sc-title">${titulo}</div>
        <div class="sc-meta">
          ${data    ? `<span class="sc-date">${data}</span>` : ''}
          ${topicos.length ? `<span class="sc-topics">${topicos.length} tópico${topicos.length !== 1 ? 's' : ''}</span>` : ''}
          ${nivelLabel ? `<span class="sc-nivel">${nivelLabel}</span>` : ''}
        </div>
      </div>
      <div class="sc-actions">
        <button class="fav-btn ${isFav ? 'on' : ''}" title="${isFav ? 'Remover favorito' : 'Favoritar'}">
          ${isFav ? CardIcons.starFill : CardIcons.star}
        </button>
        <span class="sc-arr">${CardIcons.arrow}</span>
      </div>`;

    const favBtn = btn.querySelector('.fav-btn');
    if (favBtn && onFavorite) {
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onFavorite();
      });
    }

    btn.addEventListener('click', () =>
      Router.go('materia', { subjectId, sheetId: sh.id, viewSheet: true })
    );
    return btn;
  },

  /**
   * Linha de tópico
   */
  topicRow({ txt, on = true, index, aviso = null, onToggle, onRemove }) {
    const row = document.createElement('div');
    row.className = 'topic-row' + (aviso ? ' topic-row--warn' : '');
    row.style.animationDelay = `${index * 0.06}s`;

    row.innerHTML = `
      <div class="tchk ${on ? 'on' : ''}">${on ? CardIcons.check : ''}</div>
      <span class="ttxt">${txt}</span>
      <button class="trem" title="Remover">${CardIcons.close}</button>`;

    if (aviso) {
      const warn = document.createElement('div');
      warn.className = 'topic-warn';
      warn.innerHTML = `<span class="topic-warn-icon" style="display:inline-flex;vertical-align:middle;width:14px;height:14px">${CardIcons.warn}</span> ${aviso}`;
      row.appendChild(warn);
    }

    const chk = row.querySelector('.tchk');
    chk.addEventListener('click', () => {
      if (onToggle) onToggle(index, chk);
    });

    const rem = row.querySelector('.trem');
    rem.addEventListener('click', () => onRemove && onRemove(index));

    return row;
  },
};
