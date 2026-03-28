/* ═══════════════════════════════════════
   FOLIUM — router.js
═══════════════════════════════════════ */

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
    document.body.style.opacity    = '0';
    document.body.style.transition = 'opacity 0.22s ease';
    setTimeout(() => { window.location.href = dest; }, 200);
  },

  back() {
    document.body.style.opacity    = '0';
    document.body.style.transition = 'opacity 0.22s ease';
    setTimeout(() => window.history.back(), 200);
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
    document.body.style.opacity = '0';
    window.addEventListener('load', () => {
      requestAnimationFrame(() => {
        document.body.style.transition = 'opacity 0.28s ease';
        document.body.style.opacity    = '1';
      });
    });
  }
};

Router.initFade();
