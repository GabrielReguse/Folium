/* ═══════════════════════════════════════
   FOLIUM — pages/home.js
═══════════════════════════════════════ */

const HomePage = {
  init() {
    if (!Router.requireAuth()) return;
    this._renderHero();
    this._renderActions();
    Navbar.renderBottom('home');
  },

  /* ── Hero com dados do usuário e stats ── */
  _renderHero() {
    const user   = Storage.getUser() || Mock.user;
    const totals = Mock.getTotals();
    const firstName = user.name.split(' ')[0];

    DOM.$('#hero-greeting').textContent = Helpers.greeting();
    DOM.$('#hero-name').textContent     = firstName;

    DOM.$('#stat-sheets').textContent   = totals.sheets;
    DOM.$('#stat-subjects').textContent = totals.subjects;
    DOM.$('#stat-topics').textContent   = totals.topics;
  },

  /* ── Cards de ação ── */
  _renderActions() {
    const container = DOM.$('#dash-actions');
    if (!container) return;

    const actions = [
      {
        icon: '✨', iconClass: 'ai-1',
        title: 'Criar folha',
        subtitle: 'Gere um resumo com IA em segundos',
        route: 'criar',
      },
      {
        icon: '📚', iconClass: 'ai-2',
        title: 'Minhas folhas',
        subtitle: 'Acesse seus resumos salvos',
        route: 'folhas',
      },
      {
        icon: '💬', iconClass: 'ai-3',
        title: 'Suporte',
        subtitle: 'Dúvidas e ajuda rápida',
        route: 'suporte',
      },
    ];

    actions.forEach((a, i) => {
      const card = Card.action(a);
      card.style.animationDelay = `${i * 0.08}s`;
      card.classList.add('au');
      container.appendChild(card);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => HomePage.init());
