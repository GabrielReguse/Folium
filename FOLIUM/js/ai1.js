const AI1 = {
  async _post(endpoint, body) {
    const token = Storage.getToken();

    if (!token) {
      throw new Error("Usuário não autenticado.");
    }

    const res = await fetch(`${Config.API}/ai/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Servidor retornou ${res.status} sem JSON.`);
    }

    if (res.status === 401) {
      Storage.clearUser();
      Router.go("login");
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    if (!res.ok) {
      throw new Error(data.error || `Erro ${res.status} no servidor.`);
    }

    return data;
  },

  async gerarTopicos(materia, tema, nivel = "") {
    const data = await this._post("topics", { materia, tema });

    return (data.topicos ?? []).map((t) => ({
      txt: t.txt,
      on: true,
      plano_pesquisa: t.plano_pesquisa ?? null,
      aviso: null,
    }));
  },

  async verificarTopico(
    novoTopico,
    materia,
    tema,
    topicosExistentes,
    nivel = "",
  ) {
    const data = await this._post("check-topic", {
      novoTopico,
      materia,
      tema,
      topicosExistentes: topicosExistentes.map((t) => t.txt),
    });

    return {
      compativel: data.compativel !== false,
      aviso: data.aviso ?? null,
      plano_pesquisa: data.plano_pesquisa ?? null,
    };
  },

  exportarPlano(topicList) {
    return topicList
      .filter((t) => t.on)
      .map((t) => ({
        txt: t.txt,
        plano_pesquisa: t.plano_pesquisa,
      }));
  },
};
