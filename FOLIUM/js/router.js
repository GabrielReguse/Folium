const Router = {
  routes: {
    login: "../html/login.html",
    home: "../html/home.html",
    escolher: "../html/escolher.html",
    criar: "../html/criar.html",
    mapa: "../html/mapa.html",
    folhas: "../html/folhas.html",
    materia: "../html/materia.html",
    suporte: "../html/suporte.html",
  },

  _hasNativeViewTransitions() {
    try {
      return (
        typeof window !== "undefined" &&
        typeof CSS !== "undefined" &&
        typeof CSS.supports === "function" &&
        CSS.supports("(view-transition-name: none)")
      );
    } catch (_) {
      return false;
    }
  },

  go(route, ctx = {}) {
    Object.entries(ctx).forEach(([k, v]) => Storage.setContext(k, v));
    const dest = this.routes[route] || route;

    if (this._hasNativeViewTransitions()) {
      window.location.href = dest;
      return;
    }

    document.body.classList.add("is-leaving");
    setTimeout(() => {
      window.location.href = dest;
    }, 90);
  },

  _prefetchRoutes() {
    const current = (
      window.location.pathname.split("/").pop() || ""
    ).toLowerCase();
    const urls = Object.values(this.routes).filter((u) => {
      const file = u.split("/").pop().toLowerCase();
      return file && file !== current;
    });
    const schedule =
      window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
    schedule(() => {
      urls.forEach((href) => {
        try {
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.as = "document";
          link.href = href;
          document.head.appendChild(link);
        } catch (_) {
          fetch(href, { credentials: "same-origin" }).catch(() => {});
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
      this.redirect("login");
      return false;
    }
    return true;
  },

  logout() {
    Storage.clearUser();
    this.go("login");
  },

  initFade() {
    window.addEventListener("popstate", () => {
      Storage.clearContext("sheetId");
      Storage.clearContext("viewSheet");
    });

    window.addEventListener("pageshow", (e) => {
      document.body.classList.remove("is-leaving");
      if (e.persisted) {
        Storage.clearContext("sheetId");
        Storage.clearContext("viewSheet");
      }
    });

    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => this._prefetchRoutes(),
        { once: true },
      );
    } else {
      this._prefetchRoutes();
    }
  },
};

Router.initFade();
