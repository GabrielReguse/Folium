/* FOLIUM — router.js */

const Router = {
  routes: {
    login:   '../html/login.html',
    home:    '../html/home.html',
    criar:   '../html/criar.html',
    folhas:  '../html/folhas.html',
    materia: '../html/materia.html',
    suporte: '../html/suporte.html',
  },

  go(route, ctx = {}) {
    Object.entries(ctx).forEach(([k, v]) => Storage.setContext(k, v));
    const dest = this.routes[route] || route;
    // Sem fade-out manual via JS. A @view-transition CSS (quando
    // suportada) cuida da transição; o html{background:cream} evita
    // piscar branco onde a API não está disponível.
    window.location.href = dest;
  },

  back() {
    window.history.back();
  },

  redirect(route) {
    window.location.href = this.routes[route] || route;
  },

  requireAuth() {
    if (!Storage.isAuthenticated()) {
      this.redirect('login');
      return false;
    }
    return true;
  },

  logout() {
    Storage.clearUser();
    this.go('login');
  },

  initFade() {
    // Limpa contexto efêmero ao voltar/voltar do bfcache. A transição
    // visual agora é 100% CSS (view-transition + html bg).
    window.addEventListener('popstate', () => {
      Storage.clearContext('sheetId');
      Storage.clearContext('viewSheet');
    });

    window.addEventListener('pageshow', (e) => {
      if (e.persisted) {
        Storage.clearContext('sheetId');
        Storage.clearContext('viewSheet');
      }
    });
  }
};

Router.initFade();
