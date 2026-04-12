/* ═══════════════════════════════════════════════════════════════
   FOLIUM — ai/ai1.js
   IA 1: Curadora de Tópicos & Planejadora de Pesquisa

   Responsabilidades:
   ─ Gerar tópicos relevantes a partir de matéria + tema
   ─ Verificar compatibilidade de tópicos adicionados pelo usuário
   ─ Preparar plano de pesquisa estruturado por tópico (para IA 2)

   Nota: Apenas substitua AI1._call() por uma chamada de backend
   real quando o servidor estiver disponível.
═══════════════════════════════════════════════════════════════ */

const AI1 = {

  /* ─── CONFIG ─────────────────────────────────────────────── */
  _model: 'claude-sonnet-4-20250514',
  _endpoint: 'https://api.anthropic.com/v1/messages',

  /* ─── CHAMADA BASE À API ──────────────────────────────────── */
  async _call(systemPrompt, userPrompt) {
    const res = await fetch(this._endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this._model,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    const raw = data.content?.find(b => b.type === 'text')?.text ?? '';

    /* Remove possíveis fences markdown antes de parsear */
    const clean = raw.replace(/```json|```/gi, '').trim();
    return JSON.parse(clean);
  },

  /* ─── SISTEMA: GERAÇÃO DE TÓPICOS ────────────────────────── */
  _sysGenerate: `
Você é a IA 1 do sistema Folium — um curador inteligente de tópicos de estudo.

Sua única função é analisar a matéria e o tema fornecidos e retornar uma lista
de tópicos relevantes para estudo, priorizando o que realmente aparece em provas,
vestibulares e conteúdos acadêmicos.

Para cada tópico, elabore também um plano de pesquisa que a IA 2 (geradora de
resumos) usará para buscar e estruturar o conteúdo.

REGRAS OBRIGATÓRIAS:
- Retorne APENAS JSON válido, sem preamble, sem markdown, sem explicações
- Entre 5 e 8 tópicos por resposta
- Tópicos devem ser concisos (máx. 6 palavras)
- plano_pesquisa deve guiar uma explicação de 6–8 linhas com exemplo

FORMATO DE SAÍDA (JSON exato):
{
  "topicos": [
    {
      "txt": "Nome do tópico",
      "plano_pesquisa": {
        "foco": "O que explicar sobre este tópico",
        "profundidade": "basico | intermediario | avancado",
        "formato_exemplo": "tabela_comparativa | lista_numerada | caso_pratico | formula",
        "palavras_chave": ["termo1", "termo2", "termo3"]
      }
    }
  ]
}
`.trim(),

  /* ─── SISTEMA: VERIFICAÇÃO DE COMPATIBILIDADE ────────────── */
  _sysCheck: `
Você é a IA 1 do sistema Folium — avaliador de compatibilidade de tópicos.

Analise se o novo tópico inserido pelo usuário é compatível com a matéria,
o tema e os tópicos existentes. Retorne um JSON indicando compatibilidade
e, se compatível, o plano de pesquisa para a IA 2 usar.

CRITÉRIOS:
- compativel: true  → tópico claramente dentro do escopo
- compativel: false → tópico claramente fora do escopo (ex: "culinária" em "Biologia")
- Em caso de dúvida, prefira compativel: true com aviso descritivo

REGRAS:
- Retorne APENAS JSON válido, sem preamble, sem markdown
- aviso: null quando compatível sem ressalvas
- Mesmo incompatível, gere um plano_pesquisa (o usuário pode manter o tópico)

FORMATO DE SAÍDA (JSON exato):
{
  "compativel": true,
  "aviso": null,
  "plano_pesquisa": {
    "foco": "O que explicar sobre este tópico",
    "profundidade": "basico | intermediario | avancado",
    "formato_exemplo": "tabela_comparativa | lista_numerada | caso_pratico | formula",
    "palavras_chave": ["termo1", "termo2"]
  }
}
`.trim(),

  /* ═══════════════════════════════════════════════════════════
     MÉTODO PÚBLICO 1 — Gerar lista inicial de tópicos
     Retorna: Array de { txt, on, plano_pesquisa }
  ═══════════════════════════════════════════════════════════ */
  async gerarTopicos(materia, tema) {
    const prompt =
      `Matéria: ${materia}\nTema(s): ${tema || 'geral — aborde os principais tópicos da matéria'}`;

    const json = await this._call(this._sysGenerate, prompt);

    return (json.topicos ?? []).map(t => ({
      txt:           t.txt,
      on:            true,
      plano_pesquisa: t.plano_pesquisa ?? null,
      aviso:         null,
    }));
  },

  /* ═══════════════════════════════════════════════════════════
     MÉTODO PÚBLICO 2 — Verificar compatibilidade de novo tópico
     Retorna: { compativel, aviso, plano_pesquisa }
  ═══════════════════════════════════════════════════════════ */
  async verificarTopico(novoTopico, materia, tema, topicosExistentes) {
    const existentes = topicosExistentes.map(t => t.txt).join(', ');
    const prompt = `
Matéria: ${materia}
Tema(s): ${tema || 'geral'}
Tópicos já na lista: ${existentes || 'nenhum ainda'}
Novo tópico adicionado pelo usuário: "${novoTopico}"
    `.trim();

    const json = await this._call(this._sysCheck, prompt);

    return {
      compativel:     json.compativel ?? true,
      aviso:          json.aviso ?? null,
      plano_pesquisa: json.plano_pesquisa ?? null,
    };
  },

  /* ═══════════════════════════════════════════════════════════
     MÉTODO PÚBLICO 3 — Exportar plano de pesquisa completo
     Usado pela IA 2 para saber o que e como pesquisar cada tópico
     Retorna: Array de { txt, plano_pesquisa }
  ═══════════════════════════════════════════════════════════ */
  exportarPlano(topicList) {
    return topicList
      .filter(t => t.on)
      .map(t => ({
        txt:           t.txt,
        plano_pesquisa: t.plano_pesquisa,
      }));
  },
};