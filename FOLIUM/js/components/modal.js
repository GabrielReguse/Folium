const Modal = {
  _overlay: null,

  init() {
    if (document.getElementById("loading-overlay")) return;
    const el = document.createElement("div");
    el.id = "loading-overlay";
    el.innerHTML = `
      <div class="loading-box">
        <div class="loader loader-lg"></div>
        <h3 id="ld-title">Processando...</h3>
        <p  id="ld-sub">Aguarde um momento</p>
      </div>`;
    document.body.appendChild(el);
    this._overlay = el;
  },

  showLoading(title = "Processando...", subtitle = "Aguarde um momento") {
    const overlay = document.getElementById("loading-overlay");
    if (!overlay) return;
    document.getElementById("ld-title").textContent = title;
    document.getElementById("ld-sub").textContent = subtitle;
    overlay.classList.add("show");
  },

  updateLoading(title, subtitle) {
    const t = document.getElementById("ld-title");
    const s = document.getElementById("ld-sub");
    if (t && title !== undefined) t.textContent = title;
    if (s && subtitle !== undefined) s.textContent = subtitle;
  },

  hideLoading() {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) overlay.classList.remove("show");
  },

  async simulate(title, subtitle, duration, callback) {
    this.showLoading(title, subtitle);
    await Helpers.wait(duration);
    this.hideLoading();
    if (callback) callback();
  },
};
