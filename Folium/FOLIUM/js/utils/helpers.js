/* ═══════════════════════════════════════
   FOLIUM — utils/helpers.js
   Funções utilitárias gerais
═══════════════════════════════════════ */

const Helpers = {
  /**
   * Formata uma data para pt-BR
   * @param {Date|string} date
   */
  formatDate(date) {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  },

  /**
   * Retorna saudação baseada na hora
   */
  greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia! ☀️';
    if (h < 18) return 'Boa tarde! 🌤️';
    return 'Boa noite! 🌙';
  },

  /**
   * Capitaliza a primeira letra de cada palavra
   */
  titleCase(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
  },

  /**
   * Trunca texto com reticências
   */
  truncate(str, maxLen = 60) {
    return str.length > maxLen ? str.slice(0, maxLen - 3) + '…' : str;
  },

  /**
   * Delay assíncrono (para simulação)
   */
  wait: (ms) => new Promise(res => setTimeout(res, ms)),

  /**
   * Gera um ID único simples
   */
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6),

  /**
   * Valida um e-mail básico
   */
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

  /**
   * Retorna emoji de matéria
   */
  subjectEmoji(name) {
    const map = {
      biologia: '🧬', matemática: '📐', história: '🏛️',
      física: '⚛️', química: '⚗️', geografia: '🌍',
      português: '📖', inglês: '🇬🇧', filosofia: '🧠',
      sociologia: '👥', literatura: '📚', arte: '🎨',
    };
    return map[name.toLowerCase()] || '📄';
  }
};
