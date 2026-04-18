/* ═══════════════════════════════════════
   FOLIUM — mock.js
   Dados de desenvolvimento (sem subjects — dados reais vêm do localStorage)
═══════════════════════════════════════ */

const Mock = {
  /* ── Usuário fake (usado enquanto auth real não está completa) ── */
  user: {
    name:   'Ana Clara',
    email:  'ana@email.com',
    avatar: '👩‍🎓',
  },

  /* ── Sugestões de tópicos genéricas (fallback quando IA 1 falha) ── */
  topicSuggestions: [
    'Definição e conceitos fundamentais',
    'Classificação e tipos principais',
    'Características e propriedades',
    'Processos e mecanismos envolvidos',
    'Aplicações práticas e exemplos reais',
    'Curiosidades e dados extras',
  ],
};