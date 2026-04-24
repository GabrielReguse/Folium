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
    // durante a navegação. 160ms é curto o suficiente pra não travar
    // o clique, mas longo pra o fade ser percebido como suave.
    document.body.classList.add('is-leaving');
    setTimeout(() => { window.location.href = dest; }, 160);
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
  }
};

Router.initFade();
