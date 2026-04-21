/* ═══════════════════════════════════════
   FOLIUM — pages/home.js
═══════════════════════════════════════ */

const HomePage = {
  init() {
    if (!Router.requireAuth()) return;
    this._renderNavbar();
    this._renderHero();
    this._renderActions();
    Navbar.renderBottom('home');
  },

  _renderNavbar() {
    Navbar.renderTop({
      title:      '<em>Folium</em>',
      showLogout: true,
    });
  },

  _renderHero() {
    const user      = Storage.getUser();
    const firstName = user ? user.name.split(' ')[0] : 'Estudante';

    DOM.$('#hero-greeting').textContent = Helpers.greeting();
    DOM.$('#hero-name').textContent     = firstName;

    // Calcula totais reais a partir do localStorage
    const totals = this._getTotals();
    DOM.$('#stat-sheets').textContent   = totals.sheets;
    DOM.$('#stat-subjects').textContent = totals.subjects;
    DOM.$('#stat-topics').textContent   = totals.topics;
  },

  /**
   * Computa totais reais vindos do localStorage.
   * Substitui Mock.getTotals() que foi removido.
   */
  _getTotals() {
    const subjects = Storage.getSubjects();
    let sheets = 0, topics = 0;

    for (const subj of subjects) {
      const folhas = Array.isArray(subj.folhas) ? subj.folhas : [];
      sheets += folhas.length;
      for (const f of folhas) {
        topics += Array.isArray(f.topicos) ? f.topicos.length : 0;
      }
    }

    return { sheets, subjects: subjects.length, topics };
  },

  _renderActions() {
    const container = DOM.$('#dash-actions');
    if (!container) return;

    const actions = [
      { iconClass: 'ai-1', title: 'Criar folha',   subtitle: 'Gere um resumo com IA em segundos', route: 'criar'   },
      { iconClass: 'ai-2', title: 'Minhas folhas', subtitle: 'Acesse seus resumos salvos',        route: 'folhas'  },
      { iconClass: 'ai-3', title: 'Suporte',       subtitle: 'Dúvidas e ajuda rápida',            route: 'suporte' },
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