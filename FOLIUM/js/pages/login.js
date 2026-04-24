const LoginPage = {
  currentForm: 'login',
  pendingEmail: null,
  pendingAction: null,
  resendCooldown: false,

  init() {
    if (Storage.isAuthenticated()) { Router.redirect('home'); return; }
    this._bindForms();
    this._bindEnterKey();
    this._bindCodeInputs();
  },

  swapForm(to) {
    this.currentForm = to;
    const isReg = to === 'register';
    DOM.$('#f-login').style.display     = isReg ? 'none'  : 'flex';
    DOM.$('#f-register').style.display  = isReg ? 'flex'  : 'none';
    DOM.$('#f-verify').style.display    = 'none';
    DOM.$('#sw-login').style.display    = isReg ? 'none'  : 'block';
    DOM.$('#sw-register').style.display = isReg ? 'block' : 'none';
    const old = document.querySelector('.login-error');
    if (old) old.remove();
  },

  _showVerifyForm(email, action) {
    this.pendingEmail  = email;
    this.pendingAction = action;
    DOM.$('#f-login').style.display     = 'none';
    DOM.$('#f-register').style.display  = 'none';
    DOM.$('#f-verify').style.display    = 'flex';
    DOM.$('#sw-login').style.display    = 'none';
    DOM.$('#sw-register').style.display = 'none';
    DOM.$('#verify-email-display').textContent = email;

    const digits = DOM.$$('.code-digit');
    digits.forEach(d => { d.value = ''; });
    if (digits[0]) digits[0].focus();

    const old = document.querySelector('.login-error');
    if (old) old.remove();
  },

  async doAuth() {
    this.currentForm === 'register' ? await this._register() : await this._login();
  },

  _wakeServer() {
    return Config.wake();
  },

  async _register() {
    const nameEl  = DOM.$('#r-name');
    const emailEl = DOM.$('#r-email');
    const passEl  = DOM.$('#r-pass');

    if (!nameEl.value.trim())                 { DOM.markError(nameEl);  this._showError('Por favor, informe seu nome.');            return; }
    if (!Helpers.isValidEmail(emailEl.value)) { DOM.markError(emailEl); this._showError('E-mail inválido.');                        return; }
    if (passEl.value.length < 4)              { DOM.markError(passEl);  this._showError('Senha deve ter pelo menos 4 caracteres.'); return; }

    Modal.showLoading('Conectando ao servidor…', 'Isso pode levar até 1 minuto na primeira vez');

    const online = await this._wakeServer();
    if (!online) {
      Modal.hideLoading();
      this._showError('Servidor indisponível. Tente novamente em instantes.');
      return;
    }

    Modal.showLoading('Criando sua conta...', 'Enviando código de verificação');

    try {
      const res = await fetch(`${Config.API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:     nameEl.value.trim(),
          email:    emailEl.value.trim(),
          password: passEl.value,
        }),
      });

      const data = await res.json();
      Modal.hideLoading();

      if (!res.ok) {
        this._showError(data.detail || 'Erro ao criar conta.');
        return;
      }

      if (data.pending_verification) {
        this._showVerifyForm(data.email, 'register');
        return;
      }

      Storage.setAuth({ id: data.user.id, name: data.user.name, email: data.user.email }, data.token);
      Router.go('home');

    } catch (err) {
      Modal.hideLoading();
      this._showError('Erro de conexão. Tente novamente.');
    }
  },

  async _login() {
    const emailEl = DOM.$('#l-email');
    const passEl  = DOM.$('#l-pass');

    if (!emailEl.value.trim()) { DOM.markError(emailEl); return; }
    if (!passEl.value.trim())  { DOM.markError(passEl);  return; }

    Modal.showLoading('Conectando ao servidor…', 'Isso pode levar até 1 minuto na primeira vez');

    const online = await this._wakeServer();
    if (!online) {
      Modal.hideLoading();
      this._showError('Servidor indisponível. Tente novamente em instantes.');
      return;
    }

    Modal.showLoading('Entrando...', 'Verificando suas credenciais');

    try {
      const res = await fetch(`${Config.API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:    emailEl.value.trim(),
          password: passEl.value,
        }),
      });

      const data = await res.json();
      Modal.hideLoading();

      if (!res.ok) {
        DOM.markError(emailEl);
        DOM.markError(passEl);
        this._showError(data.detail || 'E-mail ou senha incorretos.');
        return;
      }

      if (data.pending_verification) {
        this._showVerifyForm(data.email, 'login');
        return;
      }

      Storage.setAuth({ id: data.user.id, name: data.user.name, email: data.user.email }, data.token);
      Router.go('home');

    } catch (err) {
      Modal.hideLoading();
      this._showError('Erro de conexão. Tente novamente.');
    }
  },

  /* ── Google Login ── */

  async doGoogleLogin() {
    if (typeof google === 'undefined' || !google.accounts) {
      this._showError('Google Sign-In não carregou. Recarregue a página.');
      return;
    }

    const clientId = Config.GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'SEU_GOOGLE_CLIENT_ID_AQUI') {
      this._showError('Login com Google ainda não configurado.');
      return;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => this._handleGoogleResponse(response),
      auto_select: false,
    });

    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        google.accounts.id.renderButton(
          document.createElement('div'),
          { theme: 'outline', size: 'large' }
        );
        google.accounts.id.prompt();
      }
    });
  },

  async _handleGoogleResponse(response) {
    if (!response.credential) {
      this._showError('Erro ao autenticar com Google.');
      return;
    }

    Modal.showLoading('Conectando ao servidor…', 'Isso pode levar até 1 minuto na primeira vez');

    const online = await this._wakeServer();
    if (!online) {
      Modal.hideLoading();
      this._showError('Servidor indisponível. Tente novamente em instantes.');
      return;
    }

    Modal.showLoading('Autenticando com Google...', 'Enviando código de verificação');

    try {
      const res = await fetch(`${Config.API}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();
      Modal.hideLoading();

      if (!res.ok) {
        this._showError(data.detail || 'Erro ao autenticar com Google.');
        return;
      }

      if (data.pending_verification) {
        this._showVerifyForm(data.email, 'google');
        return;
      }

      Storage.setAuth({ id: data.user.id, name: data.user.name, email: data.user.email }, data.token);
      Router.go('home');

    } catch (err) {
      Modal.hideLoading();
      this._showError('Erro de conexão. Tente novamente.');
    }
  },

  /* ── Verificação de código ── */

  async doVerify() {
    const digits = DOM.$$('.code-digit');
    const code = digits.map(d => d.value).join('');

    if (code.length !== 6) {
      this._showError('Digite o código completo de 6 dígitos.');
      return;
    }

    Modal.showLoading('Verificando código...', 'Quase lá!');

    try {
      const res = await fetch(`${Config.API}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.pendingEmail,
          code:  code,
        }),
      });

      const data = await res.json();
      Modal.hideLoading();

      if (!res.ok) {
        this._showError(data.detail || 'Código inválido ou expirado.');
        digits.forEach(d => { d.value = ''; });
        if (digits[0]) digits[0].focus();
        return;
      }

      Storage.setAuth({ id: data.user.id, name: data.user.name, email: data.user.email }, data.token);
      Router.go('home');

    } catch (err) {
      Modal.hideLoading();
      this._showError('Erro de conexão. Tente novamente.');
    }
  },

  async _resendCode() {
    if (this.resendCooldown) return;

    this.resendCooldown = true;
    const link = DOM.$('#resend-link');
    let seconds = 30;
    link.textContent = `Reenviar em ${seconds}s`;
    link.classList.add('disabled');

    const timer = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        clearInterval(timer);
        link.textContent = 'Reenviar código';
        link.classList.remove('disabled');
        this.resendCooldown = false;
      } else {
        link.textContent = `Reenviar em ${seconds}s`;
      }
    }, 1000);

    try {
      await fetch(`${Config.API}/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:  this.pendingEmail,
          action: this.pendingAction || 'login',
        }),
      });
    } catch (err) {
      this._showError('Erro ao reenviar código.');
    }
  },

  backFromVerify() {
    this.pendingEmail  = null;
    this.pendingAction = null;
    this.swapForm(this.currentForm);
  },

  _showError(msg) {
    const old = document.querySelector('.login-error');
    if (old) old.remove();
    const el   = DOM.create('div', { class: 'login-error', text: msg });
    const card = document.querySelector('.login-card');
    const visibleForm = DOM.$('#f-verify').style.display !== 'none'
      ? DOM.$('#f-verify')
      : (this.currentForm === 'register' ? DOM.$('#f-register') : DOM.$('#f-login'));
    card.insertBefore(el, visibleForm);
    setTimeout(() => el.remove(), 5000);
  },

  _bindEnterKey() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        if (DOM.$('#f-verify').style.display !== 'none') {
          this.doVerify();
        } else {
          this.doAuth();
        }
      }
    });
  },

  _bindCodeInputs() {
    document.addEventListener('DOMContentLoaded', () => {
      const digits = DOM.$$('.code-digit');
      digits.forEach((inp, i) => {
        inp.addEventListener('input', () => {
          inp.value = inp.value.replace(/\D/g, '');
          if (inp.value && i < digits.length - 1) {
            digits[i + 1].focus();
          }
        });
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !inp.value && i > 0) {
            digits[i - 1].focus();
          }
        });
        inp.addEventListener('paste', (e) => {
          e.preventDefault();
          const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
          for (let j = 0; j < Math.min(pasted.length, digits.length); j++) {
            digits[j].value = pasted[j];
          }
          const nextIdx = Math.min(pasted.length, digits.length - 1);
          digits[nextIdx].focus();
        });
      });
    });
  },

  _bindForms() {
    window.swapForm      = to => LoginPage.swapForm(to);
    window.doAuth        = ()  => LoginPage.doAuth();
    window.doGoogleLogin = ()  => LoginPage.doGoogleLogin();
    window.doVerify      = ()  => LoginPage.doVerify();
    window.backFromVerify= ()  => LoginPage.backFromVerify();
    DOM.$('#resend-link')?.addEventListener('click', () => LoginPage._resendCode());
  }
};

document.addEventListener('DOMContentLoaded', () => LoginPage.init());
