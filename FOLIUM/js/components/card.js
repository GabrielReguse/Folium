/* ═══════════════════════════════════════
   FOLIUM — components/card.js
   Funções de renderização de cards
═══════════════════════════════════════ */

const Card = {
  /**
   * Card de ação do dashboard
   */
  action({ icon, iconClass = 'ai-1', title, subtitle, route, ctx = {} }) {
    const btn = document.createElement('button');
    btn.className = 'act-card au';
    btn.innerHTML = `
      <div class="act-icon ${iconClass}">${icon}</div>
      <div class="act-info">
        <h3>${title}</h3>
        <p>${subtitle}</p>
      </div>
      <span class="act-arr">›</span>`;
    btn.addEventListener('click', () => Router.go(route, ctx));
    return btn;
  },

  /**
   * Card de matéria (lista de folhas)
   * Suporta tanto estrutura nova (nomeNormalizado/folhas) quanto legada (name/sheets)
   */
  subject(s) {
    // Compatibilidade: nova estrutura tem nomeNormalizado + folhas; legada tem name + sheets
    const nome   = s.nomeNormalizado || s.name || 'Matéria';
    const emoji  = s.emoji || '📖';
    const count  = Array.isArray(s.folhas) ? s.folhas.length
                 : Array.isArray(s.sheets) ? s.sheets.length
                 : 0;

    const btn = document.createElement('button');
    btn.className = 'subj-card';
    btn.innerHTML = `
      <div class="subj-emoji">${emoji}</div>
      <div class="subj-info">
        <div class="subj-name">${nome}</div>
        <div class="subj-count">${count} folha${count !== 1 ? 's' : ''}</div>
      </div>
      <span class="subj-arr">›</span>`;
    btn.addEventListener('click', () =>
      Router.go('materia', { subjectId: s.id })
    );
    return btn;
  },

  /**
   * Card de folha individual
   * Suporta nova estrutura (titulo/dataFormatada/topicos/nivelLabel/favorita)
   * e legada (title/date/topics)
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
      <div class="sc-icon">📄</div>
      <div class="sc-info">
        <div class="sc-title">${titulo}</div>
        <div class="sc-meta">
          ${data ? `<span class="sc-date">${data}</span>` : ''}
          ${topicos.length ? `<span class="sc-topics">${topicos.length} tópico${topicos.length !== 1 ? 's' : ''}</span>` : ''}
          ${nivelLabel ? `<span class="sc-nivel">${nivelLabel}</span>` : ''}
        </div>
      </div>
      <div class="sc-actions">
        <button class="fav-btn ${isFav ? 'on' : ''}" title="${isFav ? 'Remover favorito' : 'Favoritar'}">${isFav ? '⭐' : '☆'}</button>
        <span class="sc-arr">›</span>
      </div>`;

    // Botão de favoritar — para propagação para não abrir a folha
    const favBtn = btn.querySelector('.fav-btn');
    if (favBtn && onFavorite) {
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onFavorite();
      });
    }

    // Clique no card abre a folha
    btn.addEventListener('click', () =>
      Router.go('materia', { subjectId, sheetId: sh.id, viewSheet: true })
    );
    return btn;
  },

  /**
   * Linha de tópico na criação de folha
   */
  topicRow({ txt, on = true, index, aviso = null, onToggle, onRemove }) {
    const row = document.createElement('div');
    row.className = 'topic-row' + (aviso ? ' topic-row--warn' : '');
    row.style.animationDelay = `${index * 0.06}s`;

    row.innerHTML = `
      <div class="tchk ${on ? 'on' : ''}">${on ? '✓' : ''}</div>
      <span class="ttxt">${txt}</span>
      <button class="trem" title="Remover">×</button>`;

    if (aviso) {
      const warn = document.createElement('div');
      warn.className = 'topic-warn';
      warn.innerHTML = `<span class="topic-warn-icon">⚠️</span> ${aviso}`;
      row.appendChild(warn);
    }

    const chk = row.querySelector('.tchk');
    chk.addEventListener('click', () => onToggle && onToggle(index, chk));

    const rem = row.querySelector('.trem');
    rem.addEventListener('click', () => onRemove && onRemove(index));

    return row;
  },
};