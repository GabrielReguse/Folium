/* ═══════════════════════════════════════
   FOLIUM — utils/download.js
   Exporta folhas como DOC (Word) ou PDF
   (PDF via janela de impressão nativa)
═══════════════════════════════════════ */

const Download = {
  /**
   * Escapa caracteres especiais para evitar quebra do HTML
   */
  _escape(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  /**
   * Sanitiza nome de arquivo removendo caracteres inválidos
   */
  _safeFileName(str = 'folha') {
    return String(str)
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'folha';
  },

  /**
   * Monta o HTML interno de uma folha (tópicos, exemplos, resumo).
   * Usado tanto para DOC quanto para PDF.
   */
  _buildBody(sheet) {
    const r = sheet.resultado;
    const esc = this._escape.bind(this);
    let html = '';

    if (r && Array.isArray(r.blocos) && r.blocos.length) {
      r.blocos.forEach(bloco => {
        html += `<h2>${esc(bloco.titulo || '')}</h2>`;
        if (bloco.explicacao) html += `<p>${esc(bloco.explicacao)}</p>`;

        const ex = bloco.exemplo;
        if (ex && ex.tipo) {
          const rotulo = ex.rotulo
            || ({ pratico: 'Exemplo Resolvido', tabela: 'Tabela Comparativa', lista: 'Resumo' }[ex.tipo] || 'Conteúdo');
          html += `<h3>${esc(rotulo)}</h3>`;

          if (ex.tipo === 'tabela' && Array.isArray(ex.colunas) && Array.isArray(ex.linhas)) {
            html += '<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;margin:8px 0"><thead><tr>';
            ex.colunas.forEach(c => { html += `<th>${esc(c)}</th>`; });
            html += '</tr></thead><tbody>';
            ex.linhas.forEach(r => {
              const cells = Array.isArray(r) ? r : [];
              html += '<tr>';
              cells.forEach(c => { html += `<td>${esc(c ?? '')}</td>`; });
              html += '</tr>';
            });
            html += '</tbody></table>';
          } else if (ex.tipo === 'lista' && Array.isArray(ex.itens)) {
            html += '<ul>';
            ex.itens.filter(Boolean).forEach(it => { html += `<li>${esc(it)}</li>`; });
            html += '</ul>';
          } else if (ex.tipo === 'pratico' && ex.texto) {
            html += `<blockquote>${esc(ex.texto)}</blockquote>`;
          }
        }

        if (bloco.dica_prova) {
          html += `<p><strong>Dica:</strong> ${esc(bloco.dica_prova)}</p>`;
        }
      });

      if (r.resumo_geral) {
        html += `<h2>Resumo Geral</h2><p>${esc(r.resumo_geral)}</p>`;
      }
    } else if (Array.isArray(sheet.topicos) && sheet.topicos.length) {
      html += '<ul>';
      sheet.topicos.forEach(t => { html += `<li>${esc(t)}</li>`; });
      html += '</ul>';
    } else {
      html += '<p><em>Folha sem conteúdo.</em></p>';
    }

    return html;
  },

  /**
   * Estilo inline aplicado ao DOC/PDF — mantém paleta do Folium
   */
  _styles() {
    return `
      @page { size: A4; margin: 20mm; }
      body {
        font-family: 'Georgia', 'Times New Roman', serif;
        color: #2C1810;
        line-height: 1.55;
        font-size: 12pt;
      }
      h1 {
        font-size: 22pt;
        color: #5C3D2E;
        border-bottom: 2px solid #C4A882;
        padding-bottom: 6px;
        margin: 0 0 6px;
      }
      h2 {
        font-size: 15pt;
        color: #9B6B42;
        margin: 18px 0 6px;
        page-break-after: avoid;
      }
      h3 {
        font-size: 12pt;
        color: #7A5035;
        margin: 12px 0 4px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .meta {
        color: #A07855;
        font-size: 10.5pt;
        font-style: italic;
        margin-bottom: 18px;
      }
      .divider {
        border: 0;
        border-top: 1px solid #D4B896;
        margin: 14px 0;
      }
      p { margin: 4px 0 10px; }
      ul { margin: 4px 0 10px 22px; }
      li { margin-bottom: 4px; }
      blockquote {
        border-left: 3px solid #C4A882;
        background: #F0E8D0;
        margin: 8px 0;
        padding: 8px 14px;
        font-style: italic;
      }
      table { font-size: 11pt; }
      th { background: #E8D9BF; color: #5C3D2E; text-align: left; }
      td { color: #2C1810; }
      .footer {
        margin-top: 30px;
        padding-top: 10px;
        border-top: 1px solid #D4B896;
        font-size: 9.5pt;
        color: #A07855;
        text-align: center;
      }
    `;
  },

  /**
   * Monta o documento HTML completo (header + body + footer)
   */
  _buildDocument(sheet, subjectName, title) {
    const esc = this._escape.bind(this);
    const data = sheet.dataFormatada || sheet.date || new Date().toLocaleDateString('pt-BR');
    const nivel = sheet.nivelLabel ? ` · ${esc(sheet.nivelLabel)}` : '';
    const metaParts = [];
    if (subjectName) metaParts.push(esc(subjectName));
    metaParts.push(`Criada em ${esc(data)}`);
    if (sheet.nivelLabel) metaParts.push(esc(sheet.nivelLabel));

    const body = this._buildBody(sheet);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <style>${this._styles()}</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <p class="meta">${metaParts.join(' · ')}</p>
  <hr class="divider">
  ${body}
  <div class="footer">Gerado pelo Folium — Resumos Inteligentes</div>
</body>
</html>`;
  },

  /**
   * Baixa a folha como arquivo .doc (compatível com Word)
   */
  asDoc(sheet, subjectName = '') {
    const title = sheet.titulo || sheet.title || 'Folha';
    const html = this._buildDocument(sheet, subjectName, title);

    // Header MHT/Word para garantir abertura como documento
    const wordHeader = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="FoliumBoundary"

--FoliumBoundary
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: quoted-printable
Content-Location: folha.html

`;
    const wordFooter = `\n--FoliumBoundary--`;

    const blob = new Blob([wordHeader, html, wordFooter], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this._safeFileName(title)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  /**
   * Baixa a folha como PDF abrindo janela de impressão.
   * O usuário usa o diálogo nativo "Salvar como PDF".
   */
  asPdf(sheet, subjectName = '') {
    const title = sheet.titulo || sheet.title || 'Folha';
    const html = this._buildDocument(sheet, subjectName, title);

    const w = window.open('', '_blank', 'noopener,noreferrer,width=820,height=900');
    if (!w) {
      alert('Seu navegador bloqueou a janela de impressão. Permita popups para baixar em PDF.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();

    // aguarda render antes de imprimir
    const triggerPrint = () => {
      try {
        w.focus();
        w.print();
      } catch (e) {
        console.warn('[Download] print falhou:', e);
      }
    };

    if (w.document.readyState === 'complete') {
      setTimeout(triggerPrint, 250);
    } else {
      w.addEventListener('load', () => setTimeout(triggerPrint, 250));
    }
  },
};
