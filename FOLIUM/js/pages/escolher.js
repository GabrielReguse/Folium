/* FOLIUM — pages/escolher.js */
const EscolherPage = {
  init() {
    if (!Router.requireAuth()) return;
    Navbar.renderTop({ title: '<em>Criar</em>' });
    Navbar.renderBottom('escolher');
    Sidebar.init();
  },
};
document.addEventListener('DOMContentLoaded', () => EscolherPage.init());
