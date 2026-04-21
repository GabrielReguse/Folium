/* ═══════════════════════════════════════
   FOLIUM — pages/suporte.js
   FAQ accordion e página de suporte
═══════════════════════════════════════ */

const SuportePage = {
  init() {
    if (!Router.requireAuth()) return;
    Navbar.renderTop({ backRoute: 'home', backLabel: 'Início', title: '<em>Suporte</em>' });
    Navbar.renderBottom('suporte');
    this._bindFAQ();
  },

  /* Abre/fecha item do FAQ */
  _bindFAQ() {
    DOM.$$('.faq-item').forEach(item => {
      const btn = item.querySelector('.faq-q');
      if (!btn) return;
      btn.addEventListener('click', () => this._toggleFaq(item));
    });
  },

  _toggleFaq(item) {
    const wasOpen = item.classList.contains('open');
    /* Fecha todos */
    DOM.$$('.faq-item.open').forEach(el => el.classList.remove('open'));
    /* Reabre se estava fechado */
    if (!wasOpen) item.classList.add('open');
  }
};

document.addEventListener('DOMContentLoaded', () => SuportePage.init());
