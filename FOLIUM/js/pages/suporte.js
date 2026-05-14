const SuportePage = {
  state: {
    filter: "todas",
    query: "",
  },

  init() {
    if (!Router.requireAuth()) return;

    Navbar.renderTop({ title: "<em>Central de Ajuda</em>" });
    Navbar.renderBottom("suporte");
    Sidebar.init();

    this._bindFAQ();
    this._bindChips();
    this._bindSearch();
    this._bindTopicCards();
    this._bindQuickIdeas();
    this._updateTopicCounts();
    this._apply();
  },

  _bindFAQ() {
    DOM.$$(".sup-faq .sup-faq__q").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".sup-faq");
        this._toggleFaq(item);
      });
    });
  },

  _toggleFaq(item) {
    const wasOpen = item.classList.contains("open");
    DOM.$$(".sup-faq.open").forEach((el) => {
      el.classList.remove("open");
      const q = el.querySelector(".sup-faq__q");
      if (q) q.setAttribute("aria-expanded", "false");
    });
    if (!wasOpen) {
      item.classList.add("open");
      const q = item.querySelector(".sup-faq__q");
      if (q) q.setAttribute("aria-expanded", "true");
    }
  },

  _bindChips() {
    DOM.$$(".sup-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        DOM.$$(".sup-chip").forEach((c) => {
          c.classList.remove("active");
          c.setAttribute("aria-selected", "false");
        });
        chip.classList.add("active");
        chip.setAttribute("aria-selected", "true");
        this.state.filter = chip.dataset.filter || "todas";
        this._apply();
      });
    });
  },

  _bindSearch() {
    const input = document.getElementById("sup-search-input");
    const clear = document.getElementById("sup-search-clear");
    if (!input) return;

    input.addEventListener("input", () => {
      this.state.query = (input.value || "").trim().toLowerCase();
      if (this.state.query && clear) clear.hidden = false;
      else if (clear) clear.hidden = true;
      this._apply();
    });

    if (clear) {
      clear.addEventListener("click", () => {
        input.value = "";
        this.state.query = "";
        clear.hidden = true;
        input.focus();
        this._apply();
      });
    }

    const emptyClear = document.getElementById("sup-empty-clear");
    if (emptyClear) {
      emptyClear.addEventListener("click", () => {
        input.value = "";
        this.state.query = "";
        this.state.filter = "todas";
        if (clear) clear.hidden = true;
        DOM.$$(".sup-chip").forEach((c) => {
          c.classList.remove("active");
          c.setAttribute("aria-selected", "false");
        });
        const allChip = document.querySelector(
          '.sup-chip[data-filter="todas"]',
        );
        if (allChip) {
          allChip.classList.add("active");
          allChip.setAttribute("aria-selected", "true");
        }
        this._apply();
      });
    }
  },

  submitSearch() {
    const list = document.getElementById("sup-faq-list");
    if (list) list.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  _bindTopicCards() {
    DOM.$$(".sup-topic").forEach((card) => {
      card.addEventListener("click", () => {
        const cat = card.dataset.scroll;
        if (!cat) return;

        if (cat === "contato") {
          const el = document.getElementById("contato");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }

        this.state.filter = cat;
        this.state.query = "";
        const input = document.getElementById("sup-search-input");
        if (input) input.value = "";
        const clear = document.getElementById("sup-search-clear");
        if (clear) clear.hidden = true;

        DOM.$$(".sup-chip").forEach((c) => {
          c.classList.remove("active");
          c.setAttribute("aria-selected", "false");
        });
        const chip = document.querySelector(`.sup-chip[data-filter="${cat}"]`);
        if (chip) {
          chip.classList.add("active");
          chip.setAttribute("aria-selected", "true");
        }
        this._apply();

        const list = document.getElementById("sup-faq-list");
        if (list) {
          list.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  },

  _bindQuickIdeas() {
    DOM.$$(".sup-qi").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = btn.dataset.q || "";
        const input = document.getElementById("sup-search-input");
        if (input) {
          input.value = q;
          input.focus();
        }
        this.state.query = q.toLowerCase();

        this.state.filter = "todas";
        const clear = document.getElementById("sup-search-clear");
        if (clear) clear.hidden = !q;
        DOM.$$(".sup-chip").forEach((c) => {
          c.classList.remove("active");
          c.setAttribute("aria-selected", "false");
        });
        const allChip = document.querySelector(
          '.sup-chip[data-filter="todas"]',
        );
        if (allChip) {
          allChip.classList.add("active");
          allChip.setAttribute("aria-selected", "true");
        }
        this._apply();
        const list = document.getElementById("sup-faq-list");
        if (list) list.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  },

  _updateTopicCounts() {
    const cats = ["primeiros-passos", "mapas", "biblioteca", "conta-dados"];
    cats.forEach((cat) => {
      const count = document.querySelectorAll(
        `.sup-faq[data-cat="${cat}"]`,
      ).length;
      const el = document.querySelector(`[data-count="${cat}"]`);
      if (el) el.textContent = `${count} ${count === 1 ? "guia" : "guias"}`;
    });
  },

  _apply() {
    const { filter, query } = this.state;
    let visible = 0;

    DOM.$$(".sup-faq").forEach((item) => {
      const matchCat = filter === "todas" || item.dataset.cat === filter;
      const txt = (
        (item.querySelector(".sup-faq__t")?.textContent || "") +
        " " +
        (item.dataset.terms || "") +
        " " +
        (item.querySelector(".sup-faq__a")?.textContent || "")
      ).toLowerCase();
      const matchQuery = !query || txt.includes(query);

      const show = matchCat && matchQuery;
      item.classList.toggle("hidden", !show);
      if (show) visible++;

      if (!show && item.classList.contains("open")) {
        item.classList.remove("open");
        const q = item.querySelector(".sup-faq__q");
        if (q) q.setAttribute("aria-expanded", "false");
      }
    });

    const countEl = document.getElementById("sup-visible-count");
    if (countEl) countEl.textContent = String(visible);
    const pluralEl = document.getElementById("sup-visible-plural");
    if (pluralEl) pluralEl.textContent = visible === 1 ? "" : "s";

    const empty = document.getElementById("sup-empty");
    if (empty) empty.hidden = visible !== 0;
  },
};

document.addEventListener("DOMContentLoaded", () => SuportePage.init());
