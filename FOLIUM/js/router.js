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
    // Fade-out suave: o html tem background creme, então ao deixar o
    // body opacity=0 o navegador revela o creme em vez de pintar branco
    // durante a navegação. Curto o suficiente para não travar o clique.
    document.body.classList.add('is-leaving');
    setTimeout(() => { window.location.href = dest; }, 180);
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
