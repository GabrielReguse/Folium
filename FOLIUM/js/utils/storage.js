/* ═══════════════════════════════════════
   FOLIUM — utils/storage.js
   Persistência via localStorage (com suporte a JWT)
═══════════════════════════════════════ */

const Storage = {
  PREFIX: 'folium_',

  set(key, value) {
    try { localStorage.setItem(this.PREFIX + key, JSON.stringify(value)); return true; }
    catch (e) { console.warn('[Storage] Falha ao salvar:', key, e); return false; }
  },

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch (e) { console.warn('[Storage] Falha ao ler:', key, e); return fallback; }
  },

  remove(key) { localStorage.removeItem(this.PREFIX + key); },

  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.PREFIX))
      .forEach(k => localStorage.removeItem(k));
  },

  setAuth(user, token) {
    Storage.set('user', user);
    Storage.set('token', token);
  },

  getUser:   () => Storage.get('user'),
  setUser:   (u) => Storage.set('user', u),
  getToken:  () => Storage.get('token'),

  clearUser() {
    Storage.remove('user');
    Storage.remove('token');
  },

  isAuthenticated() {
    const token = Storage.get('token');
    const user  = Storage.get('user');
    return !!(token && user);
  },

  /* ── Matérias e folhas (estrutura principal) ── */
  getSubjects: () => Storage.get('subjects', []),
  setSubjects: (s) => Storage.set('subjects', s),

  /* ── Legado (mantido por compatibilidade) ── */
  getSheets:   () => Storage.get('sheets', []),
  setSheets:   (s) => Storage.set('sheets', s),

  addSheet(sheet) {
    const sheets = Storage.getSheets();
    sheets.unshift({ ...sheet, id: Date.now(), date: new Date().toLocaleDateString('pt-BR') });
    Storage.setSheets(sheets);
    return sheets;
  },

  getSheetsBySubject(subjectId) {
    return Storage.getSheets().filter(s => s.subjectId === subjectId);
  },

  setContext:   (key, val) => Storage.set('ctx_' + key, val),
  getContext:   (key, fb)  => Storage.get('ctx_' + key, fb),
  clearContext: (key)      => Storage.remove('ctx_' + key),
};