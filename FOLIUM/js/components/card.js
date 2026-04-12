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
   */
  subject({ id, name, emoji, sheets }) {
    const btn = document.createElement('button');
    btn.className = 'subj-card';
    btn.innerHTML = `
      <div class="subj-emoji">${emoji}</div>
      <div class="subj-info">
        <div class="subj-name">${name}</div>
        <div class="subj-count">${sheets.length} folha${sheets.length !== 1 ? 's' : ''}</div>
      </div>
      <span class="subj-arr">›</span>`;
    btn.addEventListener('click', () =>
      Router.go('materia', { subjectId: id })
    );
    return btn;
  },

  /**
   * Card de folha individual
   */
  sheet({ id, subjectId, title, date, topics }) {
    const btn = document.createElement('button');
    btn.className = 'sheet-card-item';
    btn.innerHTML = `
      <div class="sc-icon">📄</div>
      <div class="sc-info">
        <div class="sc-title">${title}</div>
        <div class="sc-date">${date} · ${topics.length} tópico${topics.length !== 1 ? 's' : ''}</div>
      </div>
      <span class="sc-arr">›</span>`;
    btn.addEventListener('click', () =>
      Router.go('materia', { subjectId, sheetId: id, viewSheet: true })
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

    /* Linha principal: checkbox + texto + botão remover */
    row.innerHTML = `
      <div class="tchk ${on ? 'on' : ''}">${on ? '✓' : ''}</div>
      <span class="ttxt">${txt}</span>
      <button class="trem" title="Remover">×</button>`;

    /* Aviso de compatibilidade (adicionado pelo usuário manualmente) */
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

  /**
   * Seção de conteúdo de uma folha gerada
   */
  sheetSection({ topic, subject }) {
    const explain = Mock.getExplain(topic, subject);
    const example = Mock.getExample(topic);

    let exHTML = '';
    if (example.type === 'table') {
      exHTML = `
        <table class="ex-table">
          <tr>${example.headers.map(h => `<th>${h}</th>`).join('')}</tr>
          ${example.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
        </table>`;
    } else {
      exHTML = `
        <ul class="ex-list">
          ${example.items.map(i => `<li>${i}</li>`).join('')}
        </ul>`;
    }

    const sec = document.createElement('div');
    sec.className = 'sh-section';
    sec.innerHTML = `
      <h3 class="t-topic">${topic}</h3>
      <p class="sh-explain">${explain}</p>
      <div class="sh-ex">
        <div class="sh-ex-lbl">📌 Exemplo</div>
        ${exHTML}
      </div>`;
    return sec;
  },

  /**
   * Bloco de resumo final da folha
   */
  sheetSummary({ title, subject }) {
    const div = document.createElement('div');
    div.className = 'sh-summary';
    div.innerHTML = `
      <h3>📝 Resumo Geral</h3>
      <p>${Mock.getSummary(title, subject)}</p>`;
    return div;
  }
};