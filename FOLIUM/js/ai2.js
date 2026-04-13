/* ═══════════════════════════════════════════════════════════════
   FOLIUM — js/ai2.js
   IA 2: Geradora da Folha de Estudos
═══════════════════════════════════════════════════════════════ */

const AI2 = {

  async gerarFolha(materia, tema, nivel, topicos) {
    const token = Storage.getToken();
    if (!token) throw new Error('Usuário não autenticado.');

    const res = await fetch(`${Config.API}/ai2/sheet`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
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

  renderFolha(container, materia, tema, nivel, resultado) {
    container.innerHTML = '';

    const nivelLabel = {
      fundamental_1: 'Fund. I', fundamental_2: 'Fund. II',
      medio: 'Ensino Médio', vestibular: 'Vestibular/ENEM',
      tecnico: 'Técnico', superior: 'Superior', pos: 'Pós-graduação',
    }[nivel] || '';

    const header = document.createElement('div');
    header.className = 'sheet-header';
    header.innerHTML = `
      <span class="badge badge-accent">✨ Gerada por IA</span>
      ${nivelLabel ? `<span class="badge badge-nivel">${nivelLabel}</span>` : ''}
      <h2 class="t-section" style="margin-top:10px;margin-bottom:5px">${materia}</h2>
      <p class="t-sub">${tema ? tema + ' · ' : ''}${resultado.blocos.length} tópico${resultado.blocos.length !== 1 ? 's' : ''} · ${new Date().toLocaleDateString('pt-BR')}</p>`;
    container.appendChild(header);

    resultado.blocos.forEach(bloco => {
      container.appendChild(AI2._renderBloco(bloco));
    });

    if (resultado.resumo_geral) {
      const summary = document.createElement('div');
      summary.className = 'sh-summary';
      summary.innerHTML = `
        <h3>📝 Resumo Geral</h3>
        <p>${resultado.resumo_geral}</p>`;
      container.appendChild(summary);
    }
  },

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
      exHTML = `
        <ul class="ex-list">
          ${ex.itens.map(i => `<li>${i}</li>`).join('')}
        </ul>`;
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

    return sec;
  },
};