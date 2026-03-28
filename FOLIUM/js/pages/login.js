/* ═══════════════════════════════════════
   FOLIUM — pages/login.js
   Autenticação real com o backend
═══════════════════════════════════════ */

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
    try {
      const resp = await fetch(`${Config.API}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:     nameEl.value.trim(),
          email:    emailEl.value.trim(),
          password: passEl.value,
        }),
      });
      const data = await resp.json();
      Modal.hideLoading();
      if (!resp.ok) { this._showError(data.error || 'Erro ao criar conta.'); return; }
      Storage.setAuth(data.user, data.token);
      Router.go('home');
    } catch (err) {
      Modal.hideLoading();
      this._showError('Servidor offline.\nVerifique se o backend está no ar.');
    }
  },

  async _login() {
    const emailEl = DOM.$('#l-email');
    const passEl  = DOM.$('#l-pass');

    if (!emailEl.value.trim()) { DOM.markError(emailEl); return; }
    if (!passEl.value.trim())  { DOM.markError(passEl);  return; }

    Modal.showLoading('Entrando...', 'Verificando suas credenciais');
    try {
      const resp = await fetch(`${Config.API}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:    emailEl.value.trim(),
          password: passEl.value,
        }),
      });
      const data = await resp.json();
      Modal.hideLoading();
      if (!resp.ok) { DOM.markError(emailEl); DOM.markError(passEl); this._showError(data.error || 'E-mail ou senha incorretos.'); return; }
      Storage.setAuth(data.user, data.token);
      Router.go('home');
    } catch (err) {
      Modal.hideLoading();
      this._showError('Servidor offline.\nVerifique se o backend está no ar.');
    }
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

document.addEventListener('DOMContentLoaded', () => LoginPage.init());
