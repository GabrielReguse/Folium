const LoginPage = {
  currentForm: 'login',
  pendingEmail: null,

  init() {
    if (Storage.isAuthenticated()) { Router.redirect('home'); return; }
    this._bindForms();
    this._bindEnterKey();
    this._initCodeInputs();
    this._initTabs();
    this._initPasswordToggles();
    this._initPasswordMeter();
  },

  swapForm(to) {
    const prev = this.currentForm;
    this.currentForm = to;
    const isReg = to === 'register';
    const isVerify = to === 'verify';

    const forms = {
      login:    document.getElementById('f-login'),
      register: document.getElementById('f-register'),
      verify:   document.getElementById('f-verify'),
    };

    // direção da animação: registrar entra da direita, login da esquerda
    const dir = (to === 'register') ? 'slide-from-right'
              : (to === 'login')    ? 'slide-from-left'
              : '';

    Object.entries(forms).forEach(([key, el]) => {
      if (!el) return;
      el.classList.remove('is-active', 'slide-from-right', 'slide-from-left');
      if (key === to) {
        el.classList.add('is-active');
        if (dir) el.classList.add(dir);
      }
    });

    // Atualiza tabs (visíveis apenas em login/register)
    const tabsWrap = document.getElementById('auth-tabs');
    if (tabsWrap) {
      if (isVerify) {
        tabsWrap.classList.add('is-locked');
      } else {
        tabsWrap.classList.remove('is-locked');
        tabsWrap.dataset.active = isReg ? 'register' : 'login';
        tabsWrap.querySelectorAll('.auth-tab').forEach(t => {
          t.classList.toggle('is-active', t.dataset.target === to);
        });
      }
    }

    // Subtítulo dinâmico
    const sub = document.getElementById('login-subtitle');
    if (sub) {
      sub.textContent = isVerify
        ? 'Quase lá!'
        : isReg
          ? 'Crie sua conta gratuita'
          : 'Bem-vindo de volta';
    }

    const old = document.querySelector('.login-error');
    if (old) old.remove();
  },

  showVerification(email) {
    this.pendingEmail = email;
    DOM.$('#verify-email-display').textContent = email;
    this.swapForm('verify');
    this._clearCodeInputs();
    const first = DOM.$('.code-digit[data-idx="0"]');
    if (first) first.focus();
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

    Modal.showLoading('Criando sua conta...', 'Configurando seu espaço pessoal');

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
        this.showVerification(data.email);
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
        this.showVerification(data.email);
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

  async loginWithGoogle() {
    if (typeof google === 'undefined' || !google.accounts) {
      this._showError('Google Sign-In não carregou. Verifique sua conexão.');
      return;
    }

    const clientId = Config.GOOGLE_CLIENT_ID;
    if (!clientId) {
      this._showError('Google Client ID não configurado.');
      return;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => this._handleGoogleResponse(response),
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        google.accounts.id.renderButton(
          document.createElement('div'),
          { type: 'standard' }
        );
        this._googlePopupFallback(clientId);
      }
    });
  },

  _googlePopupFallback(clientId) {
    const popup = document.createElement('div');
    popup.id = 'google-btn-popup';
    popup.innerHTML = '<div id="g-signin-btn"></div>';
    popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999';
    popup.addEventListener('click', (e) => {
      if (e.target === popup) popup.remove();
    });
    document.body.appendChild(popup);

    google.accounts.id.renderButton(
      document.getElementById('g-signin-btn'),
      { theme: 'outline', size: 'large', text: 'continue_with', locale: 'pt-BR', width: 300 }
    );
  },

  async _handleGoogleResponse(response) {
    const popup = document.getElementById('google-btn-popup');
    if (popup) popup.remove();

    if (!response.credential) {
      this._showError('Não foi possível autenticar com o Google.');
      return;
    }

    Modal.showLoading('Conectando ao servidor…', 'Isso pode levar até 1 minuto na primeira vez');

    const online = await this._wakeServer();
    if (!online) {
      Modal.hideLoading();
      this._showError('Servidor indisponível. Tente novamente em instantes.');
      return;
    }

    Modal.showLoading('Autenticando com Google...', 'Verificando sua conta');

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
        this.showVerification(data.email);
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

  async verifyCode() {
    const code = this._getCodeValue();
    if (code.length !== 6) {
      this._showError('Digite o código de 6 dígitos.');
      return;
    }

    Modal.showLoading('Verificando código...', 'Quase lá!');

    try {
      const res = await fetch(`${Config.API}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.pendingEmail, code }),
      });

      const data = await res.json();
      Modal.hideLoading();

      if (!res.ok) {
        this._showError(data.detail || 'Código inválido.');
        this._clearCodeInputs();
        return;
      }

      Storage.setAuth({ id: data.user.id, name: data.user.name, email: data.user.email }, data.token);
      Router.go('home');

    } catch (err) {
      Modal.hideLoading();
      this._showError('Erro de conexão. Tente novamente.');
    }
  },

  async resendCode() {
    if (!this.pendingEmail) return;

    const btn = DOM.$('#btn-resend');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      const res = await fetch(`${Config.API}/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.pendingEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        this._showError(data.detail || 'Erro ao reenviar código.');
      } else {
        this._showSuccess('Novo código enviado!');
        this._clearCodeInputs();
      }
    } catch (err) {
      this._showError('Erro de conexão.');
    }

    let countdown = 30;
    btn.textContent = `Reenviar (${countdown}s)`;
    const timer = setInterval(() => {
      countdown--;
      btn.textContent = `Reenviar (${countdown}s)`;
      if (countdown <= 0) {
        clearInterval(timer);
        btn.disabled = false;
        btn.textContent = 'Reenviar código';
      }
    }, 1000);
  },

  backToLogin() {
    this.pendingEmail = null;
    this.swapForm('login');
  },

  /* ── Code inputs ── */

  _initCodeInputs() {
    const digits = document.querySelectorAll('.code-digit');
    digits.forEach((inp, i) => {
      inp.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val.slice(0, 1);
        if (val && i < digits.length - 1) digits[i + 1].focus();
        if (this._getCodeValue().length === 6) this.verifyCode();
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && i > 0) {
          digits[i - 1].focus();
          digits[i - 1].value = '';
        }
      });
      inp.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
        text.split('').forEach((ch, idx) => {
          if (digits[idx]) digits[idx].value = ch;
        });
        if (text.length === 6) this.verifyCode();
        else if (digits[text.length]) digits[text.length].focus();
      });
    });
  },

  _getCodeValue() {
    return Array.from(document.querySelectorAll('.code-digit')).map(i => i.value).join('');
  },

  _clearCodeInputs() {
    document.querySelectorAll('.code-digit').forEach(i => { i.value = ''; });
    const first = DOM.$('.code-digit[data-idx="0"]');
    if (first) first.focus();
  },

  /* ── UI helpers ── */

  _showError(msg) {
    const old = document.querySelector('.login-error');
    if (old) old.remove();
    const el   = DOM.create('div', { class: 'login-error', text: msg });
    const card = document.querySelector('.login-card');
    const formId = this.currentForm === 'register' ? '#f-register' : this.currentForm === 'verify' ? '#f-verify' : '#f-login';
    const form = DOM.$(formId);
    card.insertBefore(el, form);
    setTimeout(() => el.remove(), 5000);
  },

  _showSuccess(msg) {
    const old = document.querySelector('.login-success');
    if (old) old.remove();
    const el = DOM.create('div', { class: 'login-success', text: msg });
    const card = document.querySelector('.login-card');
    const form = DOM.$('#f-verify');
    card.insertBefore(el, form);
    setTimeout(() => el.remove(), 3000);
  },

  _bindEnterKey() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        if (this.currentForm === 'verify') this.verifyCode();
        else this.doAuth();
      }
    });
  },

  _bindForms() {
    window.swapForm       = to => LoginPage.swapForm(to);
    window.doAuth         = ()  => LoginPage.doAuth();
    window.loginWithGoogle = ()  => LoginPage.loginWithGoogle();
    window.verifyCode     = ()  => LoginPage.verifyCode();
    window.resendCode     = ()  => LoginPage.resendCode();
    window.backToLogin    = ()  => LoginPage.backToLogin();
  },

  /* ── Tab switcher ── */
  _initTabs() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.target;
        if (!target || this.currentForm === target) return;
        this.swapForm(target);
      });
    });
  },

  /* ── Toggle visibilidade de senha ── */
  _initPasswordToggles() {
    document.querySelectorAll('[data-toggle-pass]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-toggle-pass');
        const inp = document.getElementById(id);
        if (!inp) return;
        const show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        btn.classList.toggle('is-on', show);
        btn.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
      });
    });
  },

  /* ── Medidor de força de senha (cadastro) ── */
  _initPasswordMeter() {
    const inp   = document.getElementById('r-pass');
    const meter = document.getElementById('pass-meter');
    if (!inp || !meter) return;
    const score = (v) => {
      let s = 0;
      if (!v) return 0;
      if (v.length >= 4)  s++;
      if (v.length >= 8)  s++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
      if (/\d/.test(v) || /[^A-Za-z0-9]/.test(v)) s++;
      return Math.min(4, s);
    };
    inp.addEventListener('input', () => {
      meter.dataset.strength = String(score(inp.value));
    });
  }
};

document.addEventListener('DOMContentLoaded', () => LoginPage.init());
