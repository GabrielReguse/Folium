/* ═══════════════════════════════════════
   FOLIUM — components/modal.js
   Loading overlay e modais genéricos
═══════════════════════════════════════ */

const Modal = {
  _overlay: null,

  /** Injeta o loading overlay no DOM (chamado pelo app.js) */
  init() {
    if (document.getElementById('loading-overlay')) return;
    const el = document.createElement('div');
    el.id = 'loading-overlay';
    el.innerHTML = `
      <div class="loading-box">
        <div class="loader loader-lg"></div>
        <h3 id="ld-title">Processando...</h3>
        <p  id="ld-sub">Aguarde um momento</p>
      </div>`;
    document.body.appendChild(el);
    this._overlay = el;
  },

  /**
   * Exibe o loading overlay
   * @param {string} title   - título principal
   * @param {string} subtitle - texto secundário
   */
  showLoading(title = 'Processando...', subtitle = 'Aguarde um momento') {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    document.getElementById('ld-title').textContent = title;
    document.getElementById('ld-sub').textContent   = subtitle;
    overlay.classList.add('show');
  },

  /**
   * Atualiza título/subtítulo do loading já visível (sem fechar e reabrir)
   * @param {string} title
   * @param {string} subtitle
   */
  updateLoading(title, subtitle) {
    const t = document.getElementById('ld-title');
    const s = document.getElementById('ld-sub');
    if (t && title    !== undefined) t.textContent = title;
    if (s && subtitle !== undefined) s.textContent = subtitle;
  },

  /** Oculta o loading overlay */
  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('show');
  },

  /**
   * Simula uma operação assíncrona com loading
   * @param {string}   title     - mensagem exibida
   * @param {string}   subtitle
   * @param {number}   duration  - ms
   * @param {Function} callback  - executado após o delay
   */
  async simulate(title, subtitle, duration, callback) {
    this.showLoading(title, subtitle);
    await Helpers.wait(duration);
    this.hideLoading();
    if (callback) callback();
  }
};