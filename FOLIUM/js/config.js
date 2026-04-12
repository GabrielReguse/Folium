/* ═══════════════════════════════════════
   FOLIUM — js/config.js
   ⚙️  ÚNICO lugar onde você muda a URL da API

   Após subir o backend no Railway, cole aqui
   a URL gerada (ex: https://folium-api.up.railway.app)
═══════════════════════════════════════ */

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
  }
};