/* FOLIUM — pages/home.js  (v5 — fiel ao design de referência) */

const HomePage = {

  init() {
    if (!Router.requireAuth()) return;
    const page = document.querySelector('.page');
    if (page) page.classList.add('page-home');

    if (window.innerWidth >= 900) {
      this._buildDesktop();
    } else {
      this._buildMobile();
    }

    Navbar.renderBottom('home');
    Sidebar.init();
  },

  /* ═══════════════════════════════════════
     MOBILE — nav topo + hero + ação cards
  ═══════════════════════════════════════ */
  _buildMobile() {
    const page = document.querySelector('.page');
    if (!page) return;

    const totals = this._getTotals();
    const user = Storage.getUser() || {};
    const name = (user.name || user.nome || 'Estudante').split(' ')[0];
    const greeting = Helpers.greeting();

    /* ── Top nav com logo imagem ── */
    const topNav = document.createElement('div');
    topNav.className = 'home-top-nav';
    topNav.innerHTML = `
      <div class="home-top-nav__spacer"></div>
      <img src="../assets/images/logo-folium.png"
           alt="Folium" class="home-top-nav__logo">
      <button class="home-top-nav__burger" onclick="Sidebar.toggle()" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2"
             stroke-linecap="round" stroke="currentColor">
          <line x1="3" y1="7"  x2="21" y2="7"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="17" x2="21" y2="17"/>
        </svg>
      </button>`;
    page.appendChild(topNav);

    /* ── Hero ── */
    const hero = document.createElement('div');
    hero.className = 'dash-hero';
    hero.innerHTML = `
      <p class="hero-greeting">${greeting}</p>
      <h2 class="hero-name">${name}</h2>
      <p class="hero-sub">O que você vai resumir hoje?</p>
      <div class="hero-stats">
        <div class="hstat">
          <div class="hstat-num">${totals.sheets}</div>
          <div class="hstat-lbl">Folhas</div>
        </div>
        <div class="hstat">
          <div class="hstat-num">${totals.subjects}</div>
          <div class="hstat-lbl">Matérias</div>
        </div>
        <div class="hstat">
          <div class="hstat-num">${totals.topics}</div>
          <div class="hstat-lbl">Tópicos</div>
        </div>
      </div>`;
    page.appendChild(hero);

    /* ── Body com action cards ── */
    const body = document.createElement('div');
    body.className = 'dash-body';
    page.appendChild(body);

    const label = document.createElement('p');
    label.className = 'dash-section-label';
    label.textContent = 'O QUE DESEJA FAZER?';
    body.appendChild(label);

    this._appendMobileActions(body);
  },

  _appendMobileActions(container) {
    const actions = [
      {
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
        title: 'Criar folha',
        sub: 'Gere um resumo com IA em segundos',
        route: 'criar',
      },
      {
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/></svg>`,
        title: 'Minhas folhas',
        sub: 'Acesse seus resumos salvos',
        route: 'folhas',
      },
      {
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5" fill="var(--tan)" stroke="none"/></svg>`,
        title: 'Suporte',
        sub: 'Dúvidas e ajuda rápida',
        route: 'suporte',
      },
    ];

    const ARROW = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;stroke:var(--text-light);flex-shrink:0">
      <polyline points="9 18 15 12 9 6"/>
    </svg>`;

    actions.forEach((a, i) => {
      const card = document.createElement('button');
      card.className = 'home-act-card au';
      card.style.animationDelay = `${i * 0.08}s`;
      card.innerHTML = `
        <div class="home-act-icon">${a.svg}</div>
        <div class="home-act-info">
          <div class="home-act-title">${a.title}</div>
          <div class="home-act-sub">${a.sub}</div>
        </div>
        ${ARROW}`;
      card.addEventListener('click', () => Router.go(a.route));
      container.appendChild(card);
    });
  },

  /* ═══════════════════════════════════════
     DESKTOP — 3 colunas + logo central + dock
  ═══════════════════════════════════════ */
  _buildDesktop() {
    const page = document.querySelector('.page');
    if (!page) return;

    const totals = this._getTotals();
    const user = Storage.getUser() || {};
    const name = user.name || user.nome || 'Estudante';
    const greeting = Helpers.greeting();

    /* ── Imagem do vinicius no background esquerdo ── */
    const vinicius = document.createElement('img');
    vinicius.src = '../assets/images/vinicius-fundo.png';
    vinicius.alt = '';
    vinicius.className = 'desk-vinicius';
    vinicius.setAttribute('aria-hidden', 'true');
    page.appendChild(vinicius);

    /* ── Layout em grid 3 colunas ── */
    const layout = document.createElement('div');
    layout.className = 'dash-desk-layout';
    layout.innerHTML = `
      <!-- Coluna esquerda: saudação + stats -->
      <div class="desk-col-left">
        <p class="hero-greeting">${greeting}</p>
        <h2 class="hero-name desk-name">${name}</h2>
        <p class="hero-sub desk-sub">O que você vai resumir hoje?</p>
        <div class="hero-stats desk-stats">
          <div class="hstat">
            <div class="hstat-num">${totals.sheets}</div>
            <div class="hstat-lbl">Folhas</div>
          </div>
          <div class="hstat">
            <div class="hstat-num">${totals.subjects}</div>
            <div class="hstat-lbl">Matérias</div>
          </div>
          <div class="hstat">
            <div class="hstat-num">${totals.topics}</div>
            <div class="hstat-lbl">Tópicos</div>
          </div>
        </div>
      </div>

      /* ── Coluna central: logo grande ── */
<div class="desk-col-center">
  <img src="../assets/images/logo-folium-v2.png"
       alt="Folium" class="desk-logo">
  <p class="desk-tagline">Transforme qualquer conteúdo em uma<br>folha de estudos inteligente.</p>
</div>

      <!-- Coluna direita: atividade recente -->
      <div class="desk-col-right" id="desk-recent"></div>`;

    page.appendChild(layout);
    this._buildRecentPanel(document.getElementById('desk-recent'));
  },

  _buildRecentPanel(el) {
    if (!el) return;
    const subjects = Storage.getSubjects() || [];
    const recentes = subjects
      .flatMap(s => (s.folhas || []).map(f => ({ ...f, sid: s.id, materia: s.nomeNormalizado })))
      .sort((a, b) => new Date(b.criadaEm) - new Date(a.criadaEm))
      .slice(0, 5);

    const cards = recentes.length
      ? recentes.map(f => `
          <div class="recent-card"
               onclick="Router.go('materia',{subjectId:'${f.sid}',sheetId:'${f.id}',viewSheet:true})">
            <div class="rc-tag">${f.materia}</div>
            <div class="rc-title">${f.titulo || 'Folha'}</div>
            <div class="rc-meta">${f.dataFormatada || ''} &middot; ${(f.topicos || []).length} tópicos</div>
          </div>`).join('')
      : `<div class="recent-empty">
           <p>Nenhuma folha criada ainda.</p>
           <p>Use o botão <strong>Criar</strong> para começar.</p>
         </div>`;

    el.innerHTML = `
      <h3 class="recent-title">Atividade recente</h3>
      <p class="recent-sub">Suas folhas mais recentes</p>
      ${cards}`;
  },

  /* ── Totais ── */
  _getTotals() {
    const subjects = Storage.getSubjects() || [];
    let sheets = 0, topics = 0;
    for (const s of subjects) {
      const folhas = Array.isArray(s.folhas) ? s.folhas : [];
      sheets += folhas.length;
      for (const f of folhas) topics += Array.isArray(f.topicos) ? f.topicos.length : 0;
    }
    return { sheets, subjects: subjects.length, topics };
  }
};

document.addEventListener('DOMContentLoaded', () => HomePage.init());
