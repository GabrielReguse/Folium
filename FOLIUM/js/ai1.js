/* ═══════════════════════════════════════════════════════════════
   FOLIUM — js/ai1.js
   IA 1: Curadora de Tópicos & Planejadora de Pesquisa

   IMPORTANTE: Este arquivo NÃO chama a Anthropic diretamente.
   Todas as chamadas vão para o backend do Folium, que guarda a
   chave de API com segurança no servidor.

   Rotas usadas:
     POST /api/ai/topics       → gera tópicos iniciais
     POST /api/ai/check-topic  → verifica novo tópico manual
═══════════════════════════════════════════════════════════════ */

const AI1 = {

  /* ─── HELPER: chama o backend com o token do usuário ──────── */
  async _post(endpoint, body) {
    const token = Storage.getToken();

    if (!token) {
      throw new Error('Usuário não autenticado.');
    }

    const res = await fetch(`${Config.API}/ai/${endpoint}`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    /* Tenta ler o JSON mesmo em caso de erro, para pegar a mensagem */
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Servidor retornou ${res.status} sem JSON.`);
    }

    if (!res.ok) {
      throw new Error(data.error || `Erro ${res.status} no servidor.`);
    }

    return data;
  },

  /* ═══════════════════════════════════════════════════════════
     MÉTODO 1 — Gerar lista inicial de tópicos
     Retorna: Array de { txt, on, plano_pesquisa, aviso }
  ═══════════════════════════════════════════════════════════ */
  async gerarTopicos(materia, tema) {
    const data = await this._post('topics', { materia, tema });

    /* O backend já valida e normaliza — apenas garantimos o shape */
    return (data.topicos ?? []).map(t => ({
      txt:            t.txt,
      on:             true,
      plano_pesquisa: t.plano_pesquisa ?? null,
      aviso:          null,
    }));
  },

  /* ═══════════════════════════════════════════════════════════
     MÉTODO 2 — Verificar compatibilidade de tópico manual
     Retorna: { compativel, aviso, plano_pesquisa }
  ═══════════════════════════════════════════════════════════ */
  async verificarTopico(novoTopico, materia, tema, topicosExistentes) {
    const data = await this._post('check-topic', {
      novoTopico,
      materia,
      tema,
      topicosExistentes: topicosExistentes.map(t => t.txt),
    });

    return {
      compativel:     data.compativel !== false,
      aviso:          data.aviso ?? null,
      plano_pesquisa: data.plano_pesquisa ?? null,
    };
  },

  /* ═══════════════════════════════════════════════════════════
     MÉTODO 3 — Exportar plano de pesquisa para a IA 2
     Filtra só os tópicos ativos e serializa para sessionStorage.
  ═══════════════════════════════════════════════════════════ */
  exportarPlano(topicList) {
    return topicList
      .filter(t => t.on)
      .map(t => ({
        txt:            t.txt,
        plano_pesquisa: t.plano_pesquisa,
      }));
  },
};