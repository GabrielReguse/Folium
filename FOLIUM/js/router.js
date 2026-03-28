/* ═══════════════════════════════════════
   FOLIUM — router.js
   Navegação entre páginas HTML
═══════════════════════════════════════ */

const Router = {
  /* Mapa de rotas → arquivos HTML */
  routes: {
    login:   '../html/login.html',
    home:    '../html/home.html',
    criar:   '../html/criar.html',
    folhas:  '../html/folhas.html',
    materia: '../html/materia.html',
    suporte: '../html/suporte.html',
  },

  /**
   * Navega para uma rota
   * @param {string} route  - chave do mapa ou URL relativa
   * @param {object} ctx    - contexto a salvar antes de navegar
   */
  go(route, ctx = {}) {
    /* Persiste contexto temporário se passado */
    Object.entries(ctx).forEach(([k, v]) => Storage.setContext(k, v));

    /* Determina destino */
    const dest = this.routes[route] || route;

    /* Fade out e navega */
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.22s ease';
    setTimeout(() => { window.location.href = dest; }, 200);
  },

  /** Voltar no histórico do browser */
  back() {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.22s ease';
    setTimeout(() => window.history.back(), 200);
  },

  /** Redireciona sem animação */
  redirect(route) {
    window.location.href = this.routes[route] || route;
  },

  /** Guard: redireciona para login se não houver usuário */
  requireAuth() {
    if (!Storage.getUser()) {
      this.redirect('login');
      return false;
    }
    return true;
  },

  /** Inicializa fade-in ao carregar a página */
  initFade() {
    document.body.style.opacity = '0';
    window.addEventListener('load', () => {
      requestAnimationFrame(() => {
        document.body.style.transition = 'opacity 0.28s ease';
        document.body.style.opacity = '1';
      });
    });
  }
};

/* Ativa fade-in automático ao importar o módulo */
Router.initFade();
