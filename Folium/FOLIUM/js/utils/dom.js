/* ═══════════════════════════════════════
   FOLIUM — utils/dom.js
   Helpers para manipulação do DOM
═══════════════════════════════════════ */

const DOM = {
  /** Seleciona um elemento */
  $: (selector, ctx = document) => ctx.querySelector(selector),

  /** Seleciona múltiplos elementos */
  $$: (selector, ctx = document) => [...ctx.querySelectorAll(selector)],

  /** Cria um elemento com atributos opcionais */
  create(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v);
    });
    children.forEach(c => el.appendChild(c));
    return el;
  },

  /** Limpa o conteúdo de um elemento */
  clear: (el) => { el.innerHTML = ''; },

  /** Adiciona ou remove uma classe com base em uma condição */
  toggle: (el, cls, condition) => el.classList.toggle(cls, condition),

  /** Exibe um elemento (block ou o display informado) */
  show: (el, display = 'block') => { el.style.display = display; },

  /** Oculta um elemento */
  hide: (el) => { el.style.display = 'none'; },

  /** Retorna true se o elemento está visível */
  isVisible: (el) => el.style.display !== 'none' && !el.hidden,

  /** Faz scroll suave ao topo da página */
  scrollTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),

  /** Aplica animação de entrada em múltiplos elementos */
  animateList(items, baseDelay = 0.06) {
    items.forEach((el, i) => {
      el.style.animationDelay = `${i * baseDelay}s`;
      el.classList.add('au');
    });
  },

  /** Marca input com erro e o remove após um tempo */
  markError(input, duration = 2000) {
    input.classList.add('error');
    input.focus();
    setTimeout(() => input.classList.remove('error'), duration);
  }
};
