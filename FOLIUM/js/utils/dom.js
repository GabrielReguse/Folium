const DOM = {
  $: (selector, ctx = document) => ctx.querySelector(selector),

  $$: (selector, ctx = document) => [...ctx.querySelectorAll(selector)],

  create(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else el.setAttribute(k, v);
    });
    children.forEach((c) => el.appendChild(c));
    return el;
  },

  clear: (el) => {
    el.innerHTML = "";
  },

  toggle: (el, cls, condition) => el.classList.toggle(cls, condition),

  show: (el, display = "block") => {
    el.style.display = display;
  },

  hide: (el) => {
    el.style.display = "none";
  },

  isVisible: (el) => el.style.display !== "none" && !el.hidden,

  scrollTop: () => window.scrollTo({ top: 0, behavior: "smooth" }),

  animateList(items, baseDelay = 0.06) {
    items.forEach((el, i) => {
      el.style.animationDelay = `${i * baseDelay}s`;
      el.classList.add("au");
    });
  },

  markError(input, duration = 2000) {
    input.classList.add("error");
    input.focus();
    setTimeout(() => input.classList.remove("error"), duration);
  },
};
