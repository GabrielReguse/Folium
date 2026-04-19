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
    document.body.style.transition = 'opacity 0.15s ease';
    document.body.style.opacity    = '0';
    setTimeout(() => { window.location.href = dest; }, 160);
  },

  back() {
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
    document.body.style.opacity = '0';

    document.addEventListener('DOMContentLoaded', () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.body.style.transition = 'opacity 0.22s ease';
          document.body.style.opacity    = '1';
        });
      });
    });

    /* Quando o usuário usa o botão VOLTAR do browser/celular enquanto está
     * dentro de uma folha, limpa os contextos de folha para que materia.js
     * abra a lista e não a folha novamente. */
    window.addEventListener('popstate', () => {
      Storage.clearContext('sheetId');
      Storage.clearContext('viewSheet');
    });

    window.addEventListener('pageshow', (e) => {
      if (e.persisted) {
        /* Página restaurada do cache bfcache — limpa contexto de folha */
        Storage.clearContext('sheetId');
        Storage.clearContext('viewSheet');
        document.body.style.transition = 'none';
        document.body.style.opacity    = '1';
      }
    });
  }
};

Router.initFade();