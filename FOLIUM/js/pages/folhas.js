/* ═══════════════════════════════════════
   FOLIUM — pages/folhas.js
   Lista de matérias com folhas salvas
═══════════════════════════════════════ */

const FolhasPage = {
  init() {
    if (!Router.requireAuth()) return;
    Navbar.renderTop({ backRoute: 'home', backLabel: '‹ Início' });
    this._renderSubjects();
  },

  _renderSubjects() {
    const container = DOM.$('#subj-list');
    if (!container) return;

    if (!Mock.subjects.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="ei">📭</div>
          <h3>Nenhuma folha ainda</h3>
          <p>Crie sua primeira folha de estudos<br>e ela aparecerá aqui.</p>
        </div>`;
      return;
    }

    Mock.subjects.forEach((s, i) => {
      const card = Card.subject(s);
      card.style.animationDelay = `${i * 0.07}s`;
      card.classList.add('au');
      container.appendChild(card);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => FolhasPage.init());
