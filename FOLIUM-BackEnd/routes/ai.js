/* ═══════════════════════════════════════════════════════════════
   FOLIUM — routes/ai.js
   IA 1: Curadoria de tópicos e verificação de compatibilidade

   SEGURANÇA: A ANTHROPIC_API_KEY fica APENAS aqui no servidor.
   O frontend nunca toca na chave — só chama estas rotas com JWT.
═══════════════════════════════════════════════════════════════ */

const express    = require('express');
const requireAuth = require('../middleware/auth');

const router = express.Router();

/* ── Modelo e endpoint Anthropic ───────────────────────────── */
const ANTHROPIC_API   = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const ANTHROPIC_VERSION = '2023-06-01';

/* ══════════════════════════════════════════════════════════════
   HELPER — chama a API da Anthropic
   Retorna o objeto JSON já parseado da resposta do modelo.
══════════════════════════════════════════════════════════════ */
async function callClaude(systemPrompt, userPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada no servidor.');
  }

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type':            'application/json',
      'x-api-key':               apiKey,
      'anthropic-version':       ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model:      ANTHROPIC_MODEL,
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[AI] Anthropic API error:', res.status, err);
    throw new Error(`Anthropic retornou ${res.status}`);
  }

  const data = await res.json();
  const raw  = data.content?.find(b => b.type === 'text')?.text ?? '';

  /* Remove possíveis fences markdown que o modelo às vezes inclui */
  const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  return JSON.parse(clean);
}

/* ══════════════════════════════════════════════════════════════
   SYSTEM PROMPTS — ficam no servidor, não no frontend
══════════════════════════════════════════════════════════════ */

const SYS_GENERATE = `
Você é a IA 1 do Folium — um curador inteligente de tópicos de estudo para estudantes brasileiros.

Analise a matéria e os temas fornecidos e retorne uma lista de tópicos relevantes para estudo,
priorizando o que realmente cai em provas, vestibulares e concursos.

Para cada tópico, elabore um plano de pesquisa que a IA 2 (geradora de resumos) usará.

REGRAS OBRIGATÓRIAS:
- Responda APENAS com JSON válido — sem texto antes, sem texto depois, sem markdown
- Entre 5 e 8 tópicos por resposta
- Nomes de tópicos: concisos, máximo 6 palavras, em português
- O campo "foco" do plano deve guiar uma explicação didática de 6 a 8 linhas

FORMATO EXATO DE SAÍDA:
{
  "topicos": [
    {
      "txt": "Nome do tópico",
      "plano_pesquisa": {
        "foco": "O que explicar de forma clara e didática sobre este tópico",
        "profundidade": "basico",
        "formato_exemplo": "tabela_comparativa",
        "palavras_chave": ["termo1", "termo2", "termo3"]
      }
    }
  ]
}

Valores possíveis para profundidade: basico | intermediario | avancado
Valores possíveis para formato_exemplo: tabela_comparativa | lista_numerada | caso_pratico | formula
`.trim();

const SYS_CHECK = `
Você é a IA 1 do Folium — avaliador de compatibilidade de tópicos de estudo.

Analise se o novo tópico inserido pelo usuário é compatível com a matéria,
o tema e os tópicos já existentes na lista.

CRITÉRIOS:
- compativel: true  → tópico claramente dentro do escopo da matéria/tema
- compativel: false → tópico claramente fora do escopo (ex: "futebol" em "Biologia Celular")
- Em caso de dúvida, prefira compativel: true com um aviso descritivo em português

REGRAS:
- Responda APENAS com JSON válido — sem texto antes, sem texto depois, sem markdown
- aviso: null quando compatível sem ressalvas
- Mesmo quando incompatível, gere plano_pesquisa (o usuário pode manter o tópico se quiser)

FORMATO EXATO DE SAÍDA:
{
  "compativel": true,
  "aviso": null,
  "plano_pesquisa": {
    "foco": "O que explicar de forma clara e didática sobre este tópico",
    "profundidade": "basico",
    "formato_exemplo": "lista_numerada",
    "palavras_chave": ["termo1", "termo2"]
  }
}
`.trim();

/* ══════════════════════════════════════════════════════════════
   POST /api/ai/topics
   Gera a lista inicial de tópicos a partir de matéria + tema.

   Body: { materia: string, tema: string }
   Auth: Bearer JWT obrigatório
══════════════════════════════════════════════════════════════ */
router.post('/topics', requireAuth, async (req, res) => {
  try {
    const { materia, tema } = req.body;

    if (!materia || typeof materia !== 'string' || !materia.trim()) {
      return res.status(400).json({ error: 'Campo "materia" é obrigatório.' });
    }

    const userPrompt = [
      `Matéria: ${materia.trim()}`,
      `Tema(s): ${tema?.trim() || 'geral — aborde os principais tópicos da matéria'}`,
    ].join('\n');

    console.log(`[AI1] /topics — user:${req.user.id} materia:"${materia}" tema:"${tema || ''}"`);

    const json = await callClaude(SYS_GENERATE, userPrompt);

    /* Valida e normaliza a estrutura antes de responder */
    const topicos = (json.topicos ?? []).map(t => ({
      txt:            String(t.txt ?? '').trim(),
      on:             true,
      plano_pesquisa: t.plano_pesquisa ?? null,
      aviso:          null,
    })).filter(t => t.txt.length > 0);

    if (!topicos.length) {
      return res.status(502).json({ error: 'IA não retornou tópicos válidos. Tente novamente.' });
    }

    return res.json({ topicos });
  } catch (err) {
    console.error('[AI1] /topics error:', err.message);

    if (err.message.includes('ANTHROPIC_API_KEY')) {
      return res.status(503).json({ error: 'Serviço de IA não configurado no servidor.' });
    }
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: 'IA retornou resposta inválida. Tente novamente.' });
    }
    return res.status(500).json({ error: 'Erro ao gerar tópicos. Tente novamente.' });
  }
});

/* ══════════════════════════════════════════════════════════════
   POST /api/ai/check-topic
   Verifica se um tópico manual é compatível com o contexto.

   Body: { novoTopico: string, materia: string, tema: string, topicosExistentes: string[] }
   Auth: Bearer JWT obrigatório
══════════════════════════════════════════════════════════════ */
router.post('/check-topic', requireAuth, async (req, res) => {
  try {
    const { novoTopico, materia, tema, topicosExistentes = [] } = req.body;

    if (!novoTopico || typeof novoTopico !== 'string' || !novoTopico.trim()) {
      return res.status(400).json({ error: 'Campo "novoTopico" é obrigatório.' });
    }
    if (!materia || typeof materia !== 'string' || !materia.trim()) {
      return res.status(400).json({ error: 'Campo "materia" é obrigatório.' });
    }

    const existentes = Array.isArray(topicosExistentes)
      ? topicosExistentes.join(', ')
      : '';

    const userPrompt = [
      `Matéria: ${materia.trim()}`,
      `Tema(s): ${tema?.trim() || 'geral'}`,
      `Tópicos já na lista: ${existentes || 'nenhum ainda'}`,
      `Novo tópico adicionado pelo usuário: "${novoTopico.trim()}"`,
    ].join('\n');

    console.log(`[AI1] /check-topic — user:${req.user.id} topico:"${novoTopico}"`);

    const json = await callClaude(SYS_CHECK, userPrompt);

    return res.json({
      compativel:     json.compativel !== false,  /* default true em caso de dúvida */
      aviso:          json.aviso ?? null,
      plano_pesquisa: json.plano_pesquisa ?? null,
    });
  } catch (err) {
    console.error('[AI1] /check-topic error:', err.message);

    if (err.message.includes('ANTHROPIC_API_KEY')) {
      return res.status(503).json({ error: 'Serviço de IA não configurado no servidor.' });
    }
    if (err instanceof SyntaxError) {
      /* Se a IA falhar, aceita o tópico sem aviso — não bloqueia o usuário */
      return res.json({ compativel: true, aviso: null, plano_pesquisa: null });
    }
    return res.status(500).json({ error: 'Erro ao verificar tópico. Tente novamente.' });
  }
});

module.exports = router;