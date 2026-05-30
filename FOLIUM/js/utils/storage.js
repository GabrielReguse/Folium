const Storage = {
  PREFIX: "folium_",

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("[Storage] Falha ao salvar:", key, e);
      return false;
    }
  },

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn("[Storage] Falha ao ler:", key, e);
      return fallback;
    }
  },

  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  clear() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(this.PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },

  setAuth(user, token) {
    Storage.set("user", user);
    Storage.set("token", token);
  },

  getUser: () => Storage.get("user"),
  setUser: (u) => Storage.set("user", u),
  getToken: () => Storage.get("token"),

  clearUser() {
    Storage.remove("user");
    Storage.remove("token");
  },

  isAuthenticated() {
    const token = Storage.get("token");
    const user = Storage.get("user");
    return !!(token && user);
  },

  getSubjects: () => Storage.get("subjects", []),
  setSubjects: (s) => Storage.set("subjects", s),

  getSheets: () => Storage.get("sheets", []),
  setSheets: (s) => Storage.set("sheets", s),

  addSheet(sheet) {
    const sheets = Storage.getSheets();
    sheets.unshift({
      ...sheet,
      id: Date.now(),
      date: new Date().toLocaleDateString("pt-BR"),
    });
    Storage.setSheets(sheets);
    return sheets;
  },

  getSheetsBySubject(subjectId) {
    return Storage.getSheets().filter((s) => s.subjectId === subjectId);
  },

  setContext: (key, val) => Storage.set("ctx_" + key, val),
  getContext: (key, fb) => Storage.get("ctx_" + key, fb),
  clearContext: (key) => Storage.remove("ctx_" + key),

  // Mind map helpers — mapas live nested inside subjects[n].mapas
  getMindMaps() {
    return Storage.getSubjects().flatMap((s) =>
      (s.mapas || []).map((m) => ({
        ...m,
        subjectId: s.id,
        subjectName: s.nomeNormalizado || s.nomeOriginal || "Matéria",
      })),
    );
  },

  toggleMapFavorite(subjectId, mapaId) {
    const subjects = Storage.getSubjects();
    const s = subjects.find((x) => x.id === subjectId);
    if (!s) return;
    const m = (s.mapas || []).find((x) => x.id === mapaId);
    if (!m) return;
    m.favorita = !m.favorita;
    Storage.setSubjects(subjects);
  },

  deleteMap(subjectId, mapaId) {
    const subjects = Storage.getSubjects();
    const s = subjects.find((x) => x.id === subjectId);
    if (!s) return;
    s.mapas = (s.mapas || []).filter((x) => x.id !== mapaId);
    if (!s.mapas.length && !(s.folhas || []).length) {
      Storage.setSubjects(subjects.filter((x) => x.id !== subjectId));
    } else {
      Storage.setSubjects(subjects);
    }
  },
};
