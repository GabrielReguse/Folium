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
    /* Fade out rápido — 150ms é suficiente e não parece lento */
    document.body.style.transition = 'opacity 0.15s ease';
    document.body.style.opacity    = '0';
    setTimeout(() => { window.location.href = dest; }, 160);
  },

  back() {
    /* Sem delay: a página de destino já tem seu próprio fade-in */
    document.body.style.transition = 'opacity 0.15s ease';
    document.body.style.opacity    = '0';
    setTimeout(() => window.history.back(), 160);
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
    /*
     * Começa invisível mas usa DOMContentLoaded — não espera fontes/imagens.
     * Isso elimina o delay causado pelo evento 'load' que aguardava o Google Fonts.
     */
    document.body.style.opacity = '0';
    document.addEventListener('DOMContentLoaded', () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {           /* duplo rAF: garante paint */
          document.body.style.transition = 'opacity 0.22s ease';
          document.body.style.opacity    = '1';
        });
      });
    });
  }
};

Router.initFade();