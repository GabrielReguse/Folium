/* FOLIUM — pages/home.js  (v4 — reescrito limpo) */

const HomePage = {

  init() {
    if (!Router.requireAuth()) return;
    document.querySelector('.page')?.classList.add('page-home');
    this._buildNavbar();
    if (window.innerWidth >= 900) {
      this._buildDesktop();
    } else {
      this._buildMobile();
    }
    Navbar.renderBottom('home');
    Sidebar.init();
  },

  /* ────────────────────────────────────────
     NAVBAR
  ──────────────────────────────────────── */
  _buildNavbar() {
    Navbar.renderTop({ title: 'Foli<em>um</em>' });
  },

  /* ────────────────────────────────────────
     MOBILE
  ──────────────────────────────────────── */
  _buildMobile() {
    const page = document.querySelector('.page');
    if (!page) return;

    /* Hero */
    const totals   = this._getTotals();
    const user     = Storage.getUser() || {};
    const name     = (user.name || user.nome || 'Estudante').split(' ')[0];
    const greeting = Helpers.greeting();

    const hero = document.createElement('div');
    hero.className = 'dash-hero';
    hero.innerHTML = `
      <p class="hero-greeting">${greeting}</p>
      <h2 class="hero-name">${name}</h2>
      <p class="hero-sub">O que você vai resumir hoje?</p>
      <div class="hero-stats">
        <div class="hstat"><div class="hstat-num">${totals.sheets}</div><div class="hstat-lbl">Folhas</div></div>
        <div class="hstat"><div class="hstat-num">${totals.subjects}</div><div class="hstat-lbl">Matérias</div></div>
        <div class="hstat"><div class="hstat-num">${totals.topics}</div><div class="hstat-lbl">Tópicos</div></div>
      </div>
      <div class="hero-fade"></div>`;

    const nav = page.querySelector('.top-nav');
    if (nav) nav.after(hero);
    else page.prepend(hero);

    /* Body com action cards */
    const body = document.createElement('div');
    body.className = 'dash-body page-body';
    hero.after(body);

    const label = document.createElement('p');
    label.className = 't-label mb-16';
    label.textContent = 'O QUE DESEJA FAZER?';
    body.appendChild(label);

    this._appendActions(body);
  },

  /* ────────────────────────────────────────
     DESKTOP
  ──────────────────────────────────────── */
  _buildDesktop() {
    const page = document.querySelector('.page');
    if (!page) return;

    const totals   = this._getTotals();
    const user     = Storage.getUser() || {};
    const name     = user.name || user.nome || 'Estudante';
    const greeting = Helpers.greeting();

    const layout = document.createElement('div');
    layout.className = 'dash-layout dash-body';
    layout.innerHTML = `
      <div class="dash-col-left">
        <p class="hero-greeting">${greeting}</p>
        <h2 class="hero-name" style="font-family:var(--font-serif);font-size:clamp(26px,4vw,36px);font-weight:700;letter-spacing:-.025em;color:var(--text);margin-bottom:6px;line-height:1.15">${name}</h2>
        <p class="hero-sub" style="font-size:14px;font-weight:300;color:var(--text-mid);margin-bottom:22px">O que você vai resumir hoje?</p>
        <div class="hero-stats mb-32">
          <div class="hstat"><div class="hstat-num">${totals.sheets}</div><div class="hstat-lbl">Folhas</div></div>
          <div class="hstat"><div class="hstat-num">${totals.subjects}</div><div class="hstat-lbl">Matérias</div></div>
          <div class="hstat"><div class="hstat-num">${totals.topics}</div><div class="hstat-lbl">Tópicos</div></div>
        </div>
        <p class="t-label mb-16">O QUE DESEJA FAZER?</p>
        <div id="dash-actions"></div>
      </div>
      <div class="dash-col-right" id="desk-right"></div>`;

    const nav = page.querySelector('.top-nav');
    if (nav) nav.after(layout);
    else page.prepend(layout);

    /* Popula action cards no #dash-actions já existente */
    this._appendActions(document.getElementById('dash-actions'));

    /* Painel direito */
    this._buildRightPanel(document.getElementById('desk-right'));
  },

  /* ────────────────────────────────────────
     ACTION CARDS — reutilizável
  ──────────────────────────────────────── */
  _appendActions(container) {
    if (!container) return;
    const actions = [
      { iconClass: 'ai-1', title: 'Criar folha',   subtitle: 'Gere um resumo com IA em segundos', route: 'criar'   },
      { iconClass: 'ai-2', title: 'Minhas folhas', subtitle: 'Acesse seus resumos salvos',        route: 'folhas'  },
      { iconClass: 'ai-3', title: 'Suporte',       subtitle: 'Dúvidas e ajuda rápida',            route: 'suporte' },
    ];
    actions.forEach((a, i) => {
      const card = Card.action(a);
      card.classList.add('au');
      card.style.animationDelay = `${i * 0.08}s`;
      container.appendChild(card);
    });
  },

  /* ────────────────────────────────────────
     PAINEL DIREITO (desktop)
  ──────────────────────────────────────── */
  _buildRightPanel(el) {
    if (!el) return;
    const subjects = Storage.getSubjects() || [];
    const recentes = subjects
      .flatMap(s => (s.folhas || []).map(f => ({ ...f, sid: s.id, materia: s.nomeNormalizado })))
      .sort((a, b) => new Date(b.criadaEm) - new Date(a.criadaEm))
      .slice(0, 4);

    const cards = recentes.length
      ? recentes.map(f => `
          <div class="recent-card au"
               onclick="Router.go('materia',{subjectId:'${f.sid}',sheetId:'${f.id}',viewSheet:true})">
            <div class="rc-tag">${f.materia}</div>
            <div class="rc-title">${f.titulo || 'Folha'}</div>
            <div class="rc-meta">${f.dataFormatada || ''} &middot; ${(f.topicos || []).length} tópicos</div>
          </div>`).join('')
      : `<div class="recent-empty">
           <p>Nenhuma folha criada ainda.</p>
           <p>Clique em <strong>Criar folha</strong> para começar.</p>
         </div>`;

    el.innerHTML = `
      <h3 class="t-section mb-8">Atividade recente</h3>
      <p class="t-sub mb-20">Suas folhas mais recentes</p>
      ${cards}`;
  },

  /* ────────────────────────────────────────
     TOTAIS
  ──────────────────────────────────────── */
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
