/* ═══════════════════════════════════════
   FOLIUM — pages/home.js
═══════════════════════════════════════ */

const HomePage = {
  init() {
    if (!Router.requireAuth()) return;
    // Add class for CSS desktop 2-col targeting
    const page = document.querySelector('.page');
    if (page) page.classList.add('page-home');
    this._renderNavbar();
    this._renderLayout();
    Navbar.renderBottom('home');
    Sidebar.init();
  },

  _renderLayout() {
    const page = document.querySelector('.page');
    if (!page) return;

    // Remove old body if any
    const old = page.querySelector('.dash-body');
    if (old) old.remove();

    const isDesktop = window.innerWidth >= 900;

    if (isDesktop) {
      const layout = document.createElement('div');
      layout.className = 'dash-layout dash-body';
      layout.innerHTML = `
        <div class="dash-col-left">
          <div id="hero-slot"></div>
          <p class="t-label mb-16">O QUE DESEJA FAZER?</p>
          <div id="dash-actions"></div>
        </div>
        <div class="dash-col-right" id="desk-right">
        </div>`;
      page.insertBefore(layout, page.querySelector('.bottom-nav') || null);
      // Re-render hero into left col slot
      this._renderHeroInto(document.getElementById('hero-slot'));
      this._renderRightPanel(document.getElementById('desk-right'));
    } else {
      this._renderHero();
      this._renderActions();
    }
  },

  _renderRightPanel(el) {
    if (!el) return;
    const subjects = Storage.getSubjects() || [];
    const totalFolhas   = subjects.reduce((s, sub) => s + (sub.folhas?.length || 0), 0);
    const totalTopicos  = subjects.reduce((s, sub) => s + sub.folhas.reduce((a,f) => a + (f.topicos?.length || 0), 0), 0);
    const recentes = subjects.flatMap(s => (s.folhas || []).map(f => ({...f, sid: s.id, materia: s.nomeNormalizado}))).sort((a,b) => new Date(b.criadaEm) - new Date(a.criadaEm)).slice(0,3);

    el.innerHTML = `
      <h3 class="t-section mb-8">Atividade recente</h3>
      <p class="t-sub mb-20">Suas folhas mais recentes</p>
      ${recentes.length ? recentes.map(f => `
        <div class="act-recent-card au" onclick="Router.go('materia',{subjectId:'${f.sid || ''}',sheetId:'${f.id}',viewSheet:true})" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px 18px;margin-bottom:10px;cursor:pointer;transition:box-shadow var(--t-mid),transform var(--t-mid);box-shadow:var(--sh-sm)">
          <div style="font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--text-light);margin-bottom:5px">${f.materia}</div>
          <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px;line-height:1.3">${f.titulo || 'Folha'}</div>
          <div style="font-size:12px;color:var(--text-light)">${f.dataFormatada || ''} &middot; ${(f.topicos||[]).length} tópicos</div>
        </div>`).join('')
        : `<div style="color:var(--text-light);font-size:14px;font-weight:300;line-height:1.7;padding:20px 0">Nenhuma folha criada ainda.<br>Clique em "Criar folha" para começar.</div>`}`;
  },

  _renderNavbar() {
    // On desktop home, top-nav is hidden via CSS; only renders on mobile
    Navbar.renderTop({
      title: 'Foli<em>um</em>',
    });
  },

  _renderHeroInto(slot) {
    if (!slot) return;
    const user = Storage.getUser() || {};
    const name = user.name || user.nome || 'Estudante';
    const subjects = Storage.getSubjects() || [];
    const totalFolhas  = subjects.reduce((s,sub) => s + (sub.folhas?.length||0), 0);
    const totalMateria = subjects.length;
    const totalTopicos = subjects.reduce((s,sub) => s + sub.folhas.reduce((a,f) => a + (f.topicos?.length||0), 0), 0);
    const greeting = Helpers.greeting();
    slot.innerHTML = `
      <p class="hero-greeting" style="font-size:12px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:var(--caramel);margin-bottom:5px;opacity:.8">${greeting}</p>
      <h2 class="hero-name" style="font-family:var(--font-serif);font-size:clamp(24px,5vw,32px);font-weight:700;letter-spacing:-.025em;color:var(--text);margin-bottom:6px;line-height:1.15">${name}</h2>
      <p class="hero-sub mb-24">O que você vai resumir hoje?</p>
      <div class="hero-stats mb-28">
        <div class="hstat"><div class="hstat-num">${totalFolhas}</div><div class="hstat-lbl">Folhas</div></div>
        <div class="hstat"><div class="hstat-num">${totalMateria}</div><div class="hstat-lbl">Matérias</div></div>
        <div class="hstat"><div class="hstat-num">${totalTopicos}</div><div class="hstat-lbl">Tópicos</div></div>
      </div>`;
  },

  _renderHero() {
    const page = document.querySelector('.page');
    if (!page) return;

    const user      = Storage.getUser() || {};
    const firstName = (user.name || user.nome || 'Estudante').split(' ')[0];
    const subjects  = Storage.getSubjects() || [];
    const totals    = this._getTotals();
    const greeting  = Helpers.greeting();

    const hero = document.createElement('div');
    hero.className = 'dash-hero';
    hero.innerHTML = `
      <p class="hero-greeting">${greeting}</p>
      <h2 class="hero-name">${firstName}</h2>
      <p class="hero-sub">O que você vai resumir hoje?</p>
      <div class="hero-stats">
        <div class="hstat"><div class="hstat-num">${totals.sheets}</div><div class="hstat-lbl">Folhas</div></div>
        <div class="hstat"><div class="hstat-num">${totals.subjects}</div><div class="hstat-lbl">Matérias</div></div>
        <div class="hstat"><div class="hstat-num">${totals.topics}</div><div class="hstat-lbl">Tópicos</div></div>
      </div>`;

    // Insert after top-nav
    const nav  = page.querySelector('.top-nav');
    const body = page.querySelector('.dash-body');
    if (nav && nav.nextSibling) {
      page.insertBefore(hero, nav.nextSibling);
    } else if (body) {
      page.insertBefore(hero, body);
    } else {
      page.appendChild(hero);
    }
  },

  /**
   * Computa totais reais vindos do localStorage.
   * Substitui Mock.getTotals() que foi removido.
   */
  _getTotals() {
    const subjects = Storage.getSubjects();
    let sheets = 0, topics = 0;

    for (const subj of subjects) {
      const folhas = Array.isArray(subj.folhas) ? subj.folhas : [];
      sheets += folhas.length;
      for (const f of folhas) {
        topics += Array.isArray(f.topicos) ? f.topicos.length : 0;
      }
    }

    return { sheets, subjects: subjects.length, topics };
  },

  _renderActions() {
    // Create body wrapper for mobile
    const page = document.querySelector('.page');
    let wrapper = page ? page.querySelector('.dash-body') : null;
    if (!wrapper && page) {
      wrapper = document.createElement('div');
      wrapper.className = 'dash-body page-body';
      page.appendChild(wrapper);
    }

    const label = document.createElement('p');
    label.className = 't-label mb-16';
    label.textContent = 'O QUE DESEJA FAZER?';
    if (wrapper) wrapper.appendChild(label);

    const container = document.createElement('div');
    container.id = 'dash-actions';
    if (wrapper) wrapper.appendChild(container);
    if (!container) return;

    const actions = [
      { iconClass: 'ai-1', title: 'Criar folha',   subtitle: 'Gere um resumo com IA em segundos', route: 'criar'   },
      { iconClass: 'ai-2', title: 'Minhas folhas', subtitle: 'Acesse seus resumos salvos',        route: 'folhas'  },
      { iconClass: 'ai-3', title: 'Suporte',       subtitle: 'Dúvidas e ajuda rápida',            route: 'suporte' },
    ];

    actions.forEach((a, i) => {
      const card = Card.action(a);
      card.style.animationDelay = `${i * 0.08}s`;
      card.classList.add('au');
      container.appendChild(card);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => HomePage.init());