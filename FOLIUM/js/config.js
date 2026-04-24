/* FOLIUM — js/config.js */

const Config = {
  API_BASE: 'https://folium-py.onrender.com/api',

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
     A 1ª chamada acordando o servidor é cacheada no _wakePromise
     pra não dispararmos várias polls em paralelo na mesma sessão.
     --------------------------------------------------------------- */
  _wakePromise: null,

  wake({ maxWaitMs = 90000, intervalMs = 3000 } = {}) {
    if (this._wakePromise) return this._wakePromise;
    const start = Date.now();
    this._wakePromise = (async () => {
      while (Date.now() - start < maxWaitMs) {
        try {
          const res = await fetch(`${this.API}/health`, { method: 'GET' });
          if (res.ok) return true;
        } catch (_) { /* sleeping ou rede off */ }
        await new Promise(r => setTimeout(r, intervalMs));
      }
      this._wakePromise = null; // permite tentar de novo depois
      return false;
    })();
    return this._wakePromise;
  },

  warmInBackground() {
    /* não faz await — só dispara o ping pra acordar o servidor. */
    this.wake().catch(() => {});
  },
};