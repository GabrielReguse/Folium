/* ═══════════════════════════════════════
   FOLIUM — mock.js
   Dados falsos que simulam o backend
═══════════════════════════════════════ */

const Mock = {
  /* ── Usuário fake ── */
  user: {
    name:  'Ana Clara',
    email: 'ana@email.com',
    avatar: '👩‍🎓',
  },

  /* ── Matérias e folhas de exemplo ── */
  subjects: [
    {
      id: 1, name: 'Biologia', emoji: '🧬',
      sheets: [
        {
          id: 101, title: 'Citologia Básica', date: '20/03/2025',
          topics: ['Definição de Célula', 'Tipos de Célula', 'Organelas Celulares']
        },
        {
          id: 102, title: 'Organelas Celulares', date: '18/03/2025',
          topics: ['Mitocôndria', 'Núcleo Celular', 'Retículo Endoplasmático']
        }
      ]
    },
    {
      id: 2, name: 'Matemática', emoji: '📐',
      sheets: [
        {
          id: 201, title: 'Funções do 2º Grau', date: '15/03/2025',
          topics: ['Definição de Função', 'Vértice da Parábola', 'Discriminante Δ']
        },
        {
          id: 202, title: 'Trigonometria Básica', date: '12/03/2025',
          topics: ['Seno e Cosseno', 'Tangente', 'Círculo Trigonométrico']
        }
      ]
    },
    {
      id: 3, name: 'História', emoji: '🏛️',
      sheets: [
        {
          id: 301, title: 'Revolução Industrial',   date: '10/03/2025',
          topics: ['Contexto Histórico', 'Máquina a Vapor', 'Impactos Sociais']
        },
        {
          id: 302, title: 'Segunda Guerra Mundial', date: '05/03/2025',
          topics: ['Causas da Guerra', 'Principais Batalhas', 'Consequências']
        },
        {
          id: 303, title: 'Revolução Francesa',     date: '01/03/2025',
          topics: ['Antigo Regime', 'Queda da Bastilha', 'Declaração dos Direitos']
        }
      ]
    }
  ],

  /* ── Sugestões de tópicos por tema ── */
  topicSuggestions: [
    'Definição e conceitos fundamentais',
    'Classificação e tipos principais',
    'Características e propriedades',
    'Processos e mecanismos envolvidos',
    'Aplicações práticas e exemplos reais',
    'Curiosidades e dados extras',
  ],

  /* ── Textos explicativos mockados ── */
  explainMap: {
    'Definição de Célula':
      'A célula é a unidade estrutural e funcional de todos os seres vivos, sendo o menor sistema capaz de realizar as funções vitais. Pode existir de forma isolada (organismos unicelulares) ou agrupada formando tecidos e órgãos. Todo ser vivo é composto por, no mínimo, uma célula.',
    'Tipos de Célula':
      'As células dividem-se em procarióticas, simples e sem núcleo definido (bactérias), e eucarióticas, com núcleo organizado e organelas membranosas. Essa diferença estrutural determina o grau de complexidade e as funções que cada tipo de célula consegue desempenhar.',
    'Organelas Celulares':
      'As organelas são estruturas especializadas no interior da célula eucariótica, cada uma com função específica. Elas garantem a divisão do trabalho celular, tornando o funcionamento mais eficiente e organizado.',
    'Mitocôndria':
      'A mitocôndria é responsável pela respiração celular aeróbica, convertendo glicose e oxigênio em ATP — a molécula de energia usada pela célula. Por isso é chamada de "usina de energia". Possui dupla membrana e DNA próprio.',
  },

  /* ── Helpers de conteúdo ── */
  getExplain(topic, subject) {
    return this.explainMap[topic] ||
      `${topic} é um conceito central dentro de ${subject}. Seu entendimento é essencial para compreender os mecanismos mais complexos da área, pois estabelece as bases para temas avançados. Estudar este conteúdo com atenção proporciona uma visão estruturada do assunto.`;
  },

  getExample(topic) {
    const tableTopics = ['Definição de Célula', 'Tipos de Célula'];
    if (tableTopics.includes(topic)) {
      return {
        type: 'table',
        headers: ['Característica', 'Procariótica', 'Eucariótica'],
        rows: [
          ['Núcleo', 'Ausente', 'Presente'],
          ['Organelas', 'Ausentes', 'Presentes'],
          ['Exemplo', 'Bactéria', 'Célula animal'],
        ]
      };
    }
    return {
      type: 'list',
      items: [
        'Contexto prático de aplicação do conceito',
        'Relação com outros temas da área de estudo',
        'Exemplo real observado na natureza ou laboratório',
      ]
    };
  },

  getSummary(title, subject) {
    return `Este resumo abordou os pontos centrais de "${title}" em ${subject}. Os tópicos formam a base conceitual para avançar nos estudos. Revise regularmente e utilize os exemplos como âncoras para memorizar com mais eficiência.`;
  },

  /* ── Busca ── */
  getSubject: (id) => Mock.subjects.find(s => s.id === +id),
  getSheet:   (subId, shId) => {
    const s = Mock.subjects.find(s => s.id === +subId);
    return s ? s.sheets.find(sh => sh.id === +shId) : null;
  },

  /* Stats totais */
  getTotals() {
    const sheets  = this.subjects.reduce((a, s) => a + s.sheets.length, 0);
    const topics  = this.subjects.reduce((a, s) => a + s.sheets.reduce((b, sh) => b + sh.topics.length, 0), 0);
    return { sheets, subjects: this.subjects.length, topics };
  }
};
