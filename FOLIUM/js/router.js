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

  // Browsers com View Transitions API cross-document (Chrome 126+) fazem
  // cross-fade automático entre a página de saída e a de entrada — a
  // antiga congela, a nova já aparece por cima sendo animada. Quando
  // disponível, pulamos nosso fade-out manual pra não somar animações.
  _hasNativeViewTransitions() {
    try {
      return (
        typeof window !== 'undefined' &&
        typeof CSS !== 'undefined' &&
        typeof CSS.supports === 'function' &&
        CSS.supports('(view-transition-name: none)')
      );
    } catch (_) {
      return false;
    }
  },

  go(route, ctx = {}) {
    Object.entries(ctx).forEach(([k, v]) => Storage.setContext(k, v));
    const dest = this.routes[route] || route;

    // Se o browser tem View Transitions cross-document, deixa ele fazer
    // o cross-fade: navega imediatamente — nem um frame de atraso.
    if (this._hasNativeViewTransitions()) {
      window.location.href = dest;
      return;
    }

    // Fallback: fade-out curtíssimo revelando o creme do <html> (sem
    // flash branco) antes de trocar a URL. Mantemos um pequeno atraso
    // pra o fade ser perceptível em navegadores sem View Transitions.
    document.body.classList.add('is-leaving');
    setTimeout(() => { window.location.href = dest; }, 90);
  },

  /* Prefetch das outras rotas em background — quando o browser estiver
     ocioso, baixa os HTMLs das outras páginas pra que a próxima
     navegação seja praticamente instantânea. Usa <link rel="prefetch">
     quando suportado; caso contrário faz fetch() silencioso. */
  _prefetchRoutes() {
    const current = (window.location.pathname.split('/').pop() || '').toLowerCase();
    const urls = Object.values(this.routes).filter(u => {
      const file = u.split('/').pop().toLowerCase();
      return file && file !== current;
    });
    const schedule = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
    schedule(() => {
      urls.forEach(href => {
        try {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.as = 'document';
          link.href = href;
          document.head.appendChild(link);
        } catch (_) {
          fetch(href, { credentials: 'same-origin' }).catch(() => {});
        }
      });
    });
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
    window.addEventListener('popstate', () => {
      Storage.clearContext('sheetId');
      Storage.clearContext('viewSheet');
    });

    // Quando o browser restaura a página do bfcache (ex.: botão
    // voltar), ela pode voltar com a classe 'is-leaving' ainda
    // presente — o body ficaria opacity:0 invisível. Removemos
    // sempre que a página volta a ser mostrada, e se a restauração
    // veio do bfcache também limpamos o contexto efêmero.
    window.addEventListener('pageshow', (e) => {
      document.body.classList.remove('is-leaving');
      if (e.persisted) {
        Storage.clearContext('sheetId');
        Storage.clearContext('viewSheet');
      }
    });

    // pagehide roda ao sair da página (inclusive antes de entrar
    // no bfcache). Não removemos is-leaving aqui porque o usuário
    // ainda deve ver o fade-out; pageshow acima cobre o retorno.

    // Pré-busca as outras rotas em background pra acelerar navegações
    // futuras.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._prefetchRoutes(), { once: true });
    } else {
      this._prefetchRoutes();
    }
  }
};

Router.initFade();
