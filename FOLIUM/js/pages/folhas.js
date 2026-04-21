/* 
   FOLIUM — pages/folhas.js
   Lista de matérias com folhas salvas
 */

const FolhasPage = {
  init() {
    if (!Router.requireAuth()) return;
    Navbar.renderTop({ title: '<em>Minhas Folhas</em>' });
    Navbar.renderBottom('folhas');
    Sidebar.init();
    this._renderSubjects();
  },

  _renderSubjects() {
    const container = DOM.$('#subj-list');
    if (!container) return;

    const subjects = Storage.getSubjects();

    if (!subjects.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="ei"><svg viewBox="0 0 56 56" fill="none" stroke="var(--tan)" xmlns="http://www.w3.org/2000/svg"><path d="M10 44.5A4.5 4.5 0 0114.5 40H46" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5 4H46v48H14.5A4.5 4.5 0 0110 47.5v-39A4.5 4.5 0 0114.5 4z" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="19" y1="16" x2="35" y2="16" stroke-width="2" stroke-linecap="round"/><line x1="19" y1="24" x2="35" y2="24" stroke-width="2" stroke-linecap="round"/></svg></div>
          <h3>Nenhuma folha ainda</h3>
          <p>Crie sua primeira folha de estudos<br>e ela aparecerá aqui.</p>
        </div>`;
      return;
    }

    subjects.forEach((s, i) => {
      const card = Card.subject(s);
      card.style.animationDelay = `${i * 0.07}s`;
      card.classList.add('au');
      container.appendChild(card);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => FolhasPage.init());