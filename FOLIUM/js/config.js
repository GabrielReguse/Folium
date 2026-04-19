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
  }
};