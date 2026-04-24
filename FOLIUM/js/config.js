/* FOLIUM — js/config.js */

const Config = {
  API_BASE: 'https://folium-py.onrender.com/api',

  GOOGLE_CLIENT_ID: '',

  get API() {
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'file:';

    return isLocal
      ? 'http://localhost:3001/api'
      : this.API_BASE;
  },

  /* ---------------------------------------------------------------
     Render free-tier dorme depois de 15min sem requests; o cold-boot
     leva ~30-60s. Em vez de cada tela reimplementar, expomos aqui:
       Config.wake()             → Promise<boolean>  (até 90s, true se acordou)
       Config.warmInBackground() → fire-and-forget   (chama sem await)

     Cache:
     - Polls em andamento são deduplicadas via _wakePromise (todas
       as chamadas concorrentes recebem a mesma promise).
     - Sucesso é cacheado por WAKE_TTL_MS (3min). Depois disso a
       próxima chamada faz nova checagem — importante porque o
       Render dorme em ~15min de inatividade e queremos que o
       gerarFolha re-acorde se o usuário ficou tempo editando
       tópicos antes de gerar.
     - Falha (timeout) limpa o cache imediatamente pra permitir
       nova tentativa.
     --------------------------------------------------------------- */
  _wakePromise: null,
  _wakeAt: 0,
  WAKE_TTL_MS: 3 * 60 * 1000, // 3 minutos

  wake({ maxWaitMs = 90000, intervalMs = 3000, force = false } = {}) {
    /* poll em andamento → reusa */
    if (this._wakePromise) return this._wakePromise;
    /* sucesso recente → válido por TTL */
    if (!force && this._wakeAt && Date.now() - this._wakeAt < this.WAKE_TTL_MS) {
      return Promise.resolve(true);
    }
    const start = Date.now();
    this._wakePromise = (async () => {
      try {
        while (Date.now() - start < maxWaitMs) {
          try {
            const res = await fetch(`${this.API}/health`, { method: 'GET' });
            if (res.ok) {
              this._wakeAt = Date.now();
              return true;
            }
          } catch (_) { /* sleeping ou rede off */ }
          await new Promise(r => setTimeout(r, intervalMs));
        }
        return false;
      } finally {
        /* sempre libera o slot — o resultado fica em _wakeAt */
        this._wakePromise = null;
      }
    })();
    return this._wakePromise;
  },

  warmInBackground() {
    /* não faz await — só dispara o ping pra acordar o servidor. */
    this.wake().catch(() => {});
  },
};