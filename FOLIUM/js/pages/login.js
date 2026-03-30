const LoginPage = {
  currentForm: 'login',

  init() {
    if (Storage.isAuthenticated()) { Router.redirect('home'); return; }
    this._bindForms();
    this._bindEnterKey();
  },

  swapForm(to) {
    this.currentForm = to;
    const isReg = to === 'register';
    DOM.$('#f-login').style.display     = isReg ? 'none'  : 'flex';
    DOM.$('#f-register').style.display  = isReg ? 'flex'  : 'none';
    DOM.$('#sw-login').style.display    = isReg ? 'none'  : 'block';
    DOM.$('#sw-register').style.display = isReg ? 'block' : 'none';
    const old = document.querySelector('.login-error');
    if (old) old.remove();
  },

  async doAuth() {
    this.currentForm === 'register' ? await this._register() : await this._login();
  },

  async _register() {
    const nameEl  = DOM.$('#r-name');
    const emailEl = DOM.$('#r-email');
    const passEl  = DOM.$('#r-pass');

    if (!nameEl.value.trim())                 { DOM.markError(nameEl);  this._showError('Por favor, informe seu nome.');            return; }
    if (!Helpers.isValidEmail(emailEl.value)) { DOM.markError(emailEl); this._showError('E-mail inválido.');                        return; }
    if (passEl.value.length < 4)              { DOM.markError(passEl);  this._showError('Senha deve ter pelo menos 4 caracteres.'); return; }

    Modal.showLoading('Criando sua conta...', 'Configurando seu espaço pessoal');

    // ── MOCK: simula delay de rede ──
    await new Promise(r => setTimeout(r, 1200));

    // Verifica se e-mail já existe no "banco" local
    const users = JSON.parse(localStorage.getItem('folium_users') || '[]');
    if (users.find(u => u.email === emailEl.value.trim())) {
      Modal.hideLoading();
      this._showError('Este e-mail já está cadastrado.');
      return;
    }

    // Salva novo usuário
    const newUser = {
      id:       crypto.randomUUID(),
      name:     nameEl.value.trim(),
      email:    emailEl.value.trim(),
      password: passEl.value,
    };
    users.push(newUser);
    localStorage.setItem('folium_users', JSON.stringify(users));

    const mockToken = `mock_token_${newUser.id}`;
    Modal.hideLoading();
    Storage.setAuth({ id: newUser.id, name: newUser.name, email: newUser.email }, mockToken);
    Router.go('home');
  },

  async _login() {
    const emailEl = DOM.$('#l-email');
    const passEl  = DOM.$('#l-pass');

    if (!emailEl.value.trim()) { DOM.markError(emailEl); return; }
    if (!passEl.value.trim())  { DOM.markError(passEl);  return; }

    Modal.showLoading('Entrando...', 'Verificando suas credenciais');

    // ── MOCK: simula delay de rede ──
    await new Promise(r => setTimeout(r, 1000));

    const users = JSON.parse(localStorage.getItem('folium_users') || '[]');
    const user  = users.find(
      u => u.email === emailEl.value.trim() && u.password === passEl.value
    );

    Modal.hideLoading();

    if (!user) {
      DOM.markError(emailEl);
      DOM.markError(passEl);
      this._showError('E-mail ou senha incorretos.');
      return;
    }

    const mockToken = `mock_token_${user.id}`;
    Storage.setAuth({ id: user.id, name: user.name, email: user.email }, mockToken);
    Router.go('home');
  },

  _showError(msg) {
    const old = document.querySelector('.login-error');
    if (old) old.remove();
    const el   = DOM.create('div', { class: 'login-error', text: msg });
    const card = document.querySelector('.login-card');
    const form = DOM.$(this.currentForm === 'register' ? '#f-register' : '#f-login');
    card.insertBefore(el, form);
    setTimeout(() => el.remove(), 5000);
  },

  _bindEnterKey() {
    document.addEventListener('keydown', e => { if (e.key === 'Enter') this.doAuth(); });
  },

  _bindForms() {
    window.swapForm = to => LoginPage.swapForm(to);
    window.doAuth   = ()  => LoginPage.doAuth();
  }
};

document.addEventListener('DOMContentLoaded