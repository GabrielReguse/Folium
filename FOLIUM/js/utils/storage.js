/* ═══════════════════════════════════════
   FOLIUM — utils/storage.js
   Persistência fake via localStorage
═══════════════════════════════════════ */

const Storage = {
  PREFIX: 'folium_',

  /** Salva um valor serializado em JSON */
  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[Storage] Falha ao salvar:', key, e);
      return false;
    }
  },

  /** Recupera e desserializa um valor */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('[Storage] Falha ao ler:', key, e);
      return fallback;
    }
  },

  /** Remove uma chave */
  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  /** Limpa todos os dados do Folium */
  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.PREFIX))
      .forEach(k => localStorage.removeItem(k));
  },

  /* ── Atalhos semânticos ── */

  getUser:    () => Storage.get('user'),
  setUser:    (u) => Storage.set('user', u),
  clearUser:  () => Storage.remove('user'),

  getSheets:   () => Storage.get('sheets', []),
  setSheets:   (s) => Storage.set('sheets', s),

  /** Salva uma nova folha na lista */
  addSheet(sheet) {
    const sheets = Storage.getSheets();
    sheets.unshift({ ...sheet, id: Date.now(), date: new Date().toLocaleDateString('pt-BR') });
    Storage.setSheets(sheets);
    return sheets;
  },

  /** Retorna folhas de uma matéria específica */
  getSheetsBySubject(subjectId) {
    return Storage.getSheets().filter(s => s.subjectId === subjectId);
  },

  /* Contexto de navegação temporária */
  setContext:  (key, val) => Storage.set('ctx_' + key, val),
  getContext:  (key, fb)  => Storage.get('ctx_' + key, fb),
  clearContext:(key)      => Storage.remove('ctx_' + key),
};
