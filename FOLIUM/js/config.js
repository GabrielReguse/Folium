const Config = {
  API_BASE: "https://folium-py.onrender.com/api",

  GOOGLE_CLIENT_ID:
    "280915033344-crvu4es3204726pfvf0rktuf4phv91of.apps.googleusercontent.com",

  get API() {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.protocol === "file:";

    return isLocal ? "http://localhost:3001/api" : this.API_BASE;
  },

  _wakePromise: null,
  _wakeAt: 0,
  WAKE_TTL_MS: 3 * 60 * 1000,

  wake({ maxWaitMs = 90000, intervalMs = 3000, force = false } = {}) {
    if (this._wakePromise) return this._wakePromise;

    if (
      !force &&
      this._wakeAt &&
      Date.now() - this._wakeAt < this.WAKE_TTL_MS
    ) {
      return Promise.resolve(true);
    }
    const start = Date.now();
    this._wakePromise = (async () => {
      try {
        while (Date.now() - start < maxWaitMs) {
          try {
            const res = await fetch(`${this.API}/health`, { method: "GET" });
            if (res.ok) {
              this._wakeAt = Date.now();
              return true;
            }
          } catch (_) {}
          await new Promise((r) => setTimeout(r, intervalMs));
        }
        return false;
      } finally {
        this._wakePromise = null;
      }
    })();
    return this._wakePromise;
  },

  warmInBackground() {
    this.wake().catch(() => {});
  },
};
