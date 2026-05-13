const Helpers = {
  formatDate(date) {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  },

  greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  },

  titleCase(str) {
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  },

  truncate(str, maxLen = 60) {
    return str.length > maxLen ? str.slice(0, maxLen - 3) + "…" : str;
  },

  wait: (ms) => new Promise((res) => setTimeout(res, ms)),

  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6),

  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

  _SUBJECT_ALIASES: {
    matematica: "Matemática",
    mat: "Matemática",
    calculo: "Cálculo",
    "calculo diferencial": "Cálculo",
    fisica: "Física",
    fis: "Física",
    quimica: "Química",
    qui: "Química",
    estatistica: "Estatística",
    prob: "Estatística",

    historia: "História",
    hist: "História",
    geografia: "Geografia",
    geo: "Geografia",
    filosofia: "Filosofia",
    filo: "Filosofia",
    sociologia: "Sociologia",
    socio: "Sociologia",
    portugues: "Português",
    port: "Português",
    redacao: "Redação",

    biologia: "Biologia",
    bio: "Biologia",
    botanica: "Botânica",
    zoologia: "Zoologia",
    ecologia: "Ecologia",
    genetica: "Genética",
    anatomia: "Anatomia",

    ingles: "Inglês",
    english: "Inglês",
    ing: "Inglês",
    espanhol: "Espanhol",
    frances: "Francês",

    informatica: "Informática",
    info: "Informática",
    ti: "Tecnologia da Informação",
    "tecnologia da informacao": "Tecnologia da Informação",
    programacao: "Programação",
    prog: "Programação",
    dev: "Programação",
    algoritmos: "Algoritmos",
    algo: "Algoritmos",
    "banco de dados": "Banco de Dados",
    bd: "Banco de Dados",
    bdd: "Banco de Dados",
    redes: "Redes de Computadores",
    "redes de computadores": "Redes de Computadores",
    web: "Desenvolvimento Web",
    "desenvolvimento web": "Desenvolvimento Web",
    administracao: "Administração",
    adm: "Administração",
    contabilidade: "Contabilidade",
    cont: "Contabilidade",
    economia: "Economia",
    eco: "Economia",
    marketing: "Marketing",
    mkt: "Marketing",
    direito: "Direito",
    contrato: "Direito",
    dir: "Direito",
    medicina: "Medicina",
    med: "Medicina",
    enfermagem: "Enfermagem",
    enf: "Enfermagem",
    farmacia: "Farmácia",
    farm: "Farmácia",
    nutricao: "Nutrição",
    nut: "Nutrição",
    engenharia: "Engenharia",
    eng: "Engenharia",
    eletrica: "Engenharia Elétrica",
    "engenharia eletrica": "Engenharia Elétrica",
    mecanica: "Mecânica",
    "engenharia mecanica": "Mecânica",
    civil: "Engenharia Civil",
    "engenharia civil": "Engenharia Civil",
    arquitetura: "Arquitetura",
    arq: "Arquitetura",
    design: "Design",
    ux: "Design",
    ui: "Design",
    psicologia: "Psicologia",
    psi: "Psicologia",
    pedagogia: "Pedagogia",
    ped: "Pedagogia",
    "educacao fisica": "Educação Física",
    "ed fisica": "Educação Física",
    ef: "Educação Física",
    literatura: "Literatura",
    lit: "Literatura",
    arte: "Artes",
    artes: "Artes",
    musica: "Música",
    "fisica quantica": "Física Quântica",
    "quimica organica": "Química Orgânica",
    "quimica inorganica": "Química Inorgânica",
    bioquimica: "Bioquímica",
    microbiologia: "Microbiologia",
    parasitologia: "Parasitologia",
    imunologia: "Imunologia",
  },

  _levenshtein(a, b) {
    const m = a.length,
      n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  },

  normalizeSubjectName(input) {
    if (!input) return "";

    const clean = input
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (this._SUBJECT_ALIASES[clean]) {
      return this._SUBJECT_ALIASES[clean];
    }

    for (const [alias, canonical] of Object.entries(this._SUBJECT_ALIASES)) {
      if (clean === alias) return canonical;
    }

    const existing = Storage.getSubjects();
    let bestMatch = null;
    let bestDist = Infinity;

    for (const subj of existing) {
      const existClean = subj.nomeNormalizado
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "");

      const dist = this._levenshtein(clean, existClean);
      const threshold = Math.floor(
        Math.max(clean.length, existClean.length) * 0.3,
      );

      if (dist <= threshold && dist < bestDist) {
        bestDist = dist;
        bestMatch = subj.nomeNormalizado;
      }
    }

    if (bestMatch) return bestMatch;

    return clean
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  },

  _SUBJECT_EMOJIS: {
    Matemática: "",
    Cálculo: "∫",
    Estatística: "",
    Física: "️",
    Química: "",
    Biologia: "",
    Botânica: "",
    Zoologia: "",
    Ecologia: "",
    Genética: "",
    Anatomia: "",
    Bioquímica: "",
    Microbiologia: "",
    Parasitologia: "",
    Imunologia: "️",
    História: "️",
    Geografia: "️",
    Filosofia: "",
    Sociologia: "",
    Português: "",
    Redação: "️",
    Literatura: "",
    Artes: "",
    Música: "",
    Inglês: "🇬🇧",
    Espanhol: "🇪🇸",
    Francês: "🇫🇷",
    Informática: "",
    Programação: "‍",
    Algoritmos: "",
    "Banco de Dados": "️",
    "Redes de Computadores": "",
    "Desenvolvimento Web": "️",
    "Tecnologia da Informação": "️",
    Administração: "",
    Contabilidade: "",
    Economia: "",
    Marketing: "",
    Direito: "️",
    Medicina: "",
    Enfermagem: "",
    Farmácia: "",
    Nutrição: "",
    Engenharia: "️",
    "Engenharia Elétrica": "",
    Mecânica: "",
    "Engenharia Civil": "️",
    Arquitetura: "️",
    Design: "",
    Psicologia: "",
    Pedagogia: "",
    "Educação Física": "",
    "Física Quântica": "️",
    "Química Orgânica": "️",
    "Química Inorgânica": "",
  },

  getSubjectEmoji(nomeNormalizado) {
    return this._SUBJECT_EMOJIS[nomeNormalizado] || "";
  },
};
