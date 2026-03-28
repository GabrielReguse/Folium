/* js/mock-data.js */
const MOCK_USER = {
  name: 'Maria',
  email: 'maria@folium.app',
};

const MOCK_MATERIAS = [
  { id: 'bio',  name: 'Biologia',    icon: '🧬', count: 3 },
  { id: 'mat',  name: 'Matemática',  icon: '📐', count: 2 },
  { id: 'hist', name: 'História',    icon: '🏛️', count: 1 },
  { id: 'fis',  name: 'Física',      icon: '⚛️', count: 1 },
];

const MOCK_FOLHAS = {
  bio: [
    {
      id: 'bio-1',
      titulo: 'Citologia Básica',
      tema: 'Célula e suas estruturas',
      materia: 'Biologia',
      data: '22 mar 2025',
      topicos: ['Definição de célula', 'Tipos de célula', 'Organelas celulares', 'Membrana plasmática', 'Núcleo celular'],
    },
    {
      id: 'bio-2',
      titulo: 'Organelas Celulares',
      tema: 'Mitocôndria, Ribossomo e Retículo',
      materia: 'Biologia',
      data: '18 mar 2025',
      topicos: ['Mitocôndria', 'Ribossomos', 'Retículo Endoplasmático', 'Complexo de Golgi'],
    },
    {
      id: 'bio-3',
      titulo: 'Divisão Celular',
      tema: 'Mitose e Meiose',
      materia: 'Biologia',
      data: '10 mar 2025',
      topicos: ['Mitose', 'Meiose', 'Ciclo celular', 'Fases da divisão'],
    },
  ],
  mat: [
    {
      id: 'mat-1',
      titulo: 'Equações do 2º Grau',
      tema: 'Bhaskara e discriminante',
      materia: 'Matemática',
      data: '20 mar 2025',
      topicos: ['Forma geral', 'Discriminante (Δ)', 'Fórmula de Bhaskara', 'Tipos de raízes'],
    },
    {
      id: 'mat-2',
      titulo: 'Funções Logarítmicas',
      tema: 'Propriedades e gráficos',
      materia: 'Matemática',
      data: '14 mar 2025',
      topicos: ['Definição de logaritmo', 'Propriedades', 'Mudança de base', 'Equações logarítmicas'],
    },
  ],
  hist: [
    {
      id: 'hist-1',
      titulo: 'Revolução Francesa',
      tema: 'Causas, fases e consequências',
      materia: 'História',
      data: '15 mar 2025',
      topicos: ['Causas estruturais', 'Fase moderada', 'Terror jacobino', 'Diretório', 'Legado'],
    },
  ],
  fis: [
    {
      id: 'fis-1',
      titulo: 'Leis de Newton',
      tema: 'Mecânica clássica',
      materia: 'Física',
      data: '12 mar 2025',
      topicos: ['1ª Lei (Inércia)', '2ª Lei (F=ma)', '3ª Lei (Ação e reação)', 'Aplicações práticas'],
    },
  ],
};

// IA suggestion templates per keyword
const TOPICO_SUGESTOES = {
  default: [
    'Conceitos fundamentais',
    'Histórico e contexto',
    'Principais teorias',
    'Exemplos práticos',
    'Aplicações no cotidiano',
    'Comparações e diferenças',
    'Pontos de atenção',
  ],
  bio: [
    'Definição e características',
    'Classificação taxonômica',
    'Estrutura e função',
    'Processos metabólicos',
    'Relações ecológicas',
    'Exemplos no organismo humano',
    'Curiosidades científicas',
  ],
  mat: [
    'Definição formal',
    'Propriedades fundamentais',
    'Demonstração algébrica',
    'Exemplos numéricos',
    'Resolução de exercícios',
    'Casos especiais',
    'Aplicação em problemas',
  ],
  hist: [
    'Contexto histórico',
    'Causas e motivações',
    'Principais personagens',
    'Fases e etapas',
    'Consequências imediatas',
    'Legado e influências',
    'Perspectivas historiográficas',
  ],
  fis: [
    'Definição e grandezas',
    'Equações fundamentais',
    'Unidades de medida',
    'Experimentos clássicos',
    'Aplicações tecnológicas',
    'Resolução de problemas',
    'Relação com outras leis',
  ],
};

// Mock content generator for folha sections
function gerarConteudoTopico(materia, topico) {
  const m = materia.toLowerCase();

  const conteudos = {
    'Definição de célula': {
      texto: 'A célula é a menor unidade estrutural e funcional de todos os seres vivos. Proposta por Schleiden e Schwann no século XIX, a Teoria Celular estabelece que todo organismo é composto por células, e que cada célula surge de outra preexistente. Existem dois tipos principais: procariotas (sem núcleo definido) e eucariotas (com núcleo envolto por membrana nuclear).',
      tipo: 'tabela',
      tabela: {
        colunas: ['Característica', 'Procariota', 'Eucariota'],
        linhas: [
          ['Núcleo', 'Ausente', 'Presente'],
          ['Organelas', 'Ausentes', 'Presentes'],
          ['Tamanho', '1–10 µm', '10–100 µm'],
          ['Exemplos', 'Bactérias', 'Células humanas'],
        ],
      },
    },
    'Mitocôndria': {
      texto: 'A mitocôndria é a organela responsável pela respiração celular aeróbica, produzindo ATP (adenosina trifosfato), a molécula energética universal das células. Possui dupla membrana: a externa lisa e a interna com dobras chamadas cristas mitocondriais, que aumentam a superfície de produção de energia. Possui DNA próprio, evidência de sua origem endossimbiótica.',
      tipo: 'lista',
      lista: ['Produção de ATP via fosforilação oxidativa', 'Controle da apoptose celular', 'Regulação do metabolismo do cálcio', 'DNA mitocondrial herdado maternamente', 'Cristas = aumento da superfície para produção de energia'],
    },
  };

  return conteudos[topico] || null;
}

function gerarConteudoGenerico(topico, index) {
  const exemplos = [
    {
      tipo: 'lista',
      lista: [
        `${topico}: conceito central e definição precisa`,
        'Relação com os demais tópicos da matéria',
        'Aplicação prática e exemplos do cotidiano',
        'Pontos mais cobrados em vestibulares e concursos',
        'Erros comuns e como evitá-los',
      ],
    },
    {
      tipo: 'tabela',
      tabela: {
        colunas: ['Aspecto', 'Descrição'],
        linhas: [
          ['Definição', `Conceito central de ${topico}`],
          ['Importância', 'Fundamental para a compreensão do tema'],
          ['Aplicação', 'Utilizado em diversas situações práticas'],
          ['Relação', 'Conecta-se com os demais conteúdos da matéria'],
        ],
      },
    },
    {
      tipo: 'exemplo',
      texto: `Considere uma situação real: ao estudar ${topico}, percebemos que este conceito aparece em diversas questões de vestibular, especialmente quando combinado com outros tópicos. Um bom domínio deste conteúdo garante segurança nas provas.`,
    },
  ];

  return exemplos[index % exemplos.length];
}