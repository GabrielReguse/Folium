const LoginPage = {
  currentForm: 'login',          // 'login' | 'register' | 'verify'
  _pending: null,                // { ticket, email, expires_in }
  _resendCooldownEnd: 0,
  _resendTimerId: null,
  _googleClientId: '',
  _googleReady: false,

  init() {
    if (Storage.isAuthenticated()) { Router.redirect('home'); return; }
    this._bindForms();
    this._bindEnterKey();
    this._bindCodeInputs();
    /* Carrega o client ID e inicializa Google Sign-In (silencioso — se falhar, o botão mostra erro ao clicar) */
    this._initGoogle();
  },

  swapForm(to) {
    this.currentForm = to;
    DOM.$('#f-login').style.display     = to === 'login'    ? 'flex' : 'none';
    DOM.$('#f-register').style.display  = to === 'register' ? 'flex' : 'none';
    DOM.$('#f-verify').style.display    = to === 'verify'   ? 'flex' : 'none';
    DOM.$('#sw-login').style.display    = to === 'login'    ? 'block' : 'none';
    DOM.$('#sw-register').style.display = to === 'register' ? 'block' : 'none';
    const old = document.querySelector('.login-error');
    if (old) old.remove();
  },

  async doAuth() {
    if (this.currentForm === 'register') await this._register();
    else if (this.currentForm === 'login') await this._login();
  },

  /* ── Acorda o servidor antes da requisição real ── */
  _wakeServer() { return Config.wake(); },

  /* ─────────────────────────────────────────────
     REGISTRO (email/senha) → código por email
     ───────────────────────────────────────────── */
  async _register() {
    const nameEl  = DOM.$('#r-name');
    const emailEl = DOM.$('#r-email');
    const passEl  = DOM.$('#r-pass');

    if (!nameEl.value.trim())                 { DOM.markError(nameEl);  this._showError('Por favor, informe seu nome.');            return; }
    if (!Helpers.isValidEmail(emailEl.value)) { DOM.markError(emailEl); this._showError('E-mail inválido.');                        return; }
    if (passEl.value.length < 4)              { DOM.markError(passEl);  this._showError('Senha deve ter pelo menos 4 caracteres.'); return; }

    Modal.showLoading('Conectando ao servidor…', 'Isso pode levar até 1 minuto na primeira vez');
    const online = await this._wakeServer();
    if (!online) { Modal.hideLoading(); this._showError('Servidor indisponível. Tente novamente em instantes.'); return; }

    Modal.showLoading('Enviando código…', 'Preparando verificação por e-mail');
    try {
      const res  = await fetch(`${Config.API}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:     nameEl.value.trim(),
          email:    emailEl.value.trim(),
          password: passEl.value,
        }),
      });
      const data = await res.json();
      Modal.hideLoading();
      if (!res.ok) { this._showError(data.detail || 'Erro ao criar conta.'); return; }
      this._enterVerification(data);
    } catch (err) {
      Modal.hideLoading();
      this._showError('Erro de conexão. Tente novamente.');
    }
  },

  /* ─────────────────────────────────────────────
     LOGIN (email/senha) → código por email
     ───────────────────────────────────────────── */
  async _login() {
    const emailEl = DOM.$('#l-email');
    const passEl  = DOM.$('#l-pass');
    if (!emailEl.value.trim()) { DOM.markError(emailEl); return; }
    if (!passEl.value.trim())  { DOM.markError(passEl);  return; }

    Modal.showLoading('Conectando ao servidor…', 'Isso pode levar até 1 minuto na primeira vez');
    const online = await this._wakeServer();
    if (!online) { Modal.hideLoading(); this._showError('Servidor indisponível. Tente novamente em instantes.'); return; }

    Modal.showLoading('Verificando credenciais…', 'Preparando código por e-mail');
    try {
      const res  = await fetch(`${Config.API}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: emailEl.value.trim(), password: passEl.value }),
      });
      const data = await res.json();
      Modal.hideLoading();
      if (!res.ok) {
        DOM.markError(emailEl); DOM.markError(passEl);
        this._showError(data.detail || 'E-mail ou senha incorretos.');
        return;
      }
      this._enterVerification(data);
    } catch (err) {
      Modal.hideLoading();
      this._showError('Erro de conexão. Tente novamente.');
    }
  },

  /* ─────────────────────────────────────────────
     GOOGLE SIGN-IN
     ───────────────────────────────────────────── */
  async _initGoogle() {
    try {
      const res = await fetch(`${Config.API}/auth/google/config`);
      if (!res.ok) return;
      const data = await res.json();
      this._googleClientId = data.client_id || '';
      if (!this._googleClientId) return;
      /* Aguarda o SDK carregar (script é async) */
      await this._waitForGoogleSDK();
      google.accounts.id.initialize({
        client_id: this._googleClientId,
        callback: (resp) => this._onGoogleCredential(resp),
        ux_mode:  'popup',
      });
      this._googleReady = true;
    } catch (_) { /* silencioso */ }
  },

  _waitForGoogleSDK(maxMs = 8000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const tick  = () => {
        if (window.google && window.google.accounts && window.google.accounts.id) return resolve(true);
        if (Date.now() - start > maxMs) return resolve(false);
        setTimeout(tick, 120);
      };
      tick();
    });
  },

  async doGoogle() {
    if (!this._googleReady) {
      /* Tenta tardiamente caso init tenha falhado antes */
      await this._initGoogle();
    }
    if (!this._googleReady || !window.google) {
      this._showError('Login com Google indisponível no momento.');
      return;
    }
    try {
      google.accounts.id.prompt((notification) => {
        /* Se o prompt não puder ser exibido (iframe/cookies), cai no fluxo alternativo abaixo */
        if (notification.isNotDisplayed && notification.isNotDisplayed()) {
          this._showError('Não foi possível abrir o Google. Verifique se os cookies de terceiros estão habilitados.');
        }
      });
    } catch (err) {
      this._showError('Erro ao iniciar login com Google.');
    }
  },

  async _onGoogleCredential(resp) {
    if (!resp || !resp.credential) { this._showError('Login com Google cancelado.'); return; }

    Modal.showLoading('Conectando ao servidor…', 'Isso pode levar até 1 minuto na primeira vez');
    const online = await this._wakeServer();
    if (!online) { Modal.hideLoading(); this._showError('Servidor indisponível. Tente novamente em instantes.'); return; }

    Modal.showLoading('Validando conta Google…', 'Preparando código por e-mail');
    try {
      const r = await fetch(`${Config.API}/auth/google`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ credential: resp.credential }),
      });
      const data = await r.json();
      Modal.hideLoading();
      if (!r.ok) { this._showError(data.detail || 'Falha no login com Google.'); return; }
      this._enterVerification(data);
    } catch (err) {
      Modal.hideLoading();
      this._showError('Erro de conexão. Tente novamente.');
    }
  },

  /* ─────────────────────────────────────────────
     VERIFICAÇÃO DE CÓDIGO
     ───────────────────────────────────────────── */
  _enterVerification(data) {
    this._pending = { ticket: data.ticket, email: data.email, expires_in: data.expires_in };
    DOM.$('#v-email-display').textContent = data.email;
    this._clearCodeInputs();
    this.swapForm('verify');
    this._startResendCooldown(30);
    setTimeout(() => {
      const first = document.querySelector('.code-cell[data-i="0"]');
      if (first) first.focus();
    }, 50);
  },

  cancelVerify() {
    this._pending = null;
    this._stopResendTimer();
    this._clearCodeInputs();
    this.swapForm('login');
  },

  _readCode() {
    return Array.from(document.querySelectorAll('.code-cell'))
      .map(el => el.value.trim())
      .join('');
  },

  _clearCodeInputs() {
    document.querySelectorAll('.code-cell').forEach(el => { el.value = ''; el.classList.remove('filled'); });
  },

  async doVerify() {
    if (!this._pending) { this._showError('Sessão expirada. Comece de novo.'); return; }
    const code = this._readCode();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      this._showError('Informe os 6 dígitos do código.');
      return;
    }

    Modal.showLoading('Confirmando código…', '');
    try {
      const res  = await fetch(`${Config.API}/auth/verify`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ticket: this._pending.ticket, code }),
      });
      const data = await res.json();
      Modal.hideLoading();
      if (!res.ok) {
        this._showError(data.detail || 'Código inválido.');
        this._clearCodeInputs();
        const first = document.querySelector('.code-cell[data-i="0"]');
        if (first) first.focus();
        return;
      }
      Storage.setAuth({ id: data.user.id, name: data.user.name, email: data.user.email }, data.token);
      this._pending = null;
      this._stopResendTimer();
      Router.go('home');
    } catch (err) {
      Modal.hideLoading();
      this._showError('Erro de conexão. Tente novamente.');
    }
  },

  async doResend() {
    if (!this._pending) return;
    if (Date.now() < this._resendCooldownEnd) return;

    Modal.showLoading('Reenviando código…', '');
    try {
      const res  = await fetch(`${Config.API}/auth/resend`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ticket: this._pending.ticket }),
      });
      const data = await res.json();
      Modal.hideLoading();
      if (!res.ok) { this._showError(data.detail || 'Não foi possível reenviar o código.'); return; }
      this._clearCodeInputs();
      this._startResendCooldown(30);
    } catch (err) {
      Modal.hideLoading();
      this._showError('Erro de conexão. Tente novamente.');
    }
  },

  _startResendCooldown(seconds) {
    this._stopResendTimer();
    this._resendCooldownEnd = Date.now() + seconds * 1000;
    const link   = DOM.$('#v-resend');
    const timer  = DOM.$('#v-resend-timer');
    const tick = () => {
      const remaining = Math.ceil((this._resendCooldownEnd - Date.now()) / 1000);
      if (remaining <= 0) {
        if (link)  link.classList.remove('disabled');
        if (timer) timer.textContent = '';
        this._stopResendTimer();
        return;
      }
      if (link)  link.classList.add('disabled');
      if (timer) timer.textContent = ` (em ${remaining}s)`;
    };
    tick();
    this._resendTimerId = setInterval(tick, 1000);
  },

  _stopResendTimer() {
    if (this._resendTimerId) { clearInterval(this._resendTimerId); this._resendTimerId = null; }
  },

  /* ─── Inputs de código (auto-avanço, backspace, colar) ─── */
  _bindCodeInputs() {
    const cells = Array.from(document.querySelectorAll('.code-cell'));
    if (!cells.length) return;

    cells.forEach((el, idx) => {
      el.addEventListener('input', (e) => {
        const v = el.value.replace(/\D/g, '').slice(-1);
        el.value = v;
        el.classList.toggle('filled', !!v);
        if (v && idx < cells.length - 1) cells[idx + 1].focus();
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !el.value && idx > 0) cells[idx - 1].focus();
        if (e.key === 'ArrowLeft'  && idx > 0)               cells[idx - 1].focus();
        if (e.key === 'ArrowRight' && idx < cells.length - 1) cells[idx + 1].focus();
        if (e.key === 'Enter') LoginPage.doVerify();
      });
      el.addEventListener('paste', (e) => {
        const text = (e.clipboardData || window.clipboardData).getData('text') || '';
        const digits = text.replace(/\D/g, '').slice(0, cells.length - idx);
        if (!digits) return;
        e.preventDefault();
        digits.split('').forEach((ch, k) => {
          const target = cells[idx + k];
          if (!target) return;
          target.value = ch;
          target.classList.add('filled');
        });
        const next = Math.min(idx + digits.length, cells.length - 1);
        cells[next].focus();
      });
    });
  },

  _showError(msg) {
    const old = document.querySelector('.login-error');
    if (old) old.remove();
    const el   = DOM.create('div', { class: 'login-error', text: msg });
    const card = document.querySelector('.login-card');
    const activeId = this.currentForm === 'register' ? '#f-register'
                   : this.currentForm === 'verify'   ? '#f-verify'
                   : '#f-login';
    const form = DOM.$(activeId);
    card.insertBefore(el, form);
    setTimeout(() => el.remove(), 5000);
  },

  _bindEnterKey() {
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      /* Nos inputs de código, o handler local já trata o Enter */
      if (e.target && e.target.classList && e.target.classList.contains('code-cell')) return;
      if (this.currentForm === 'verify') this.doVerify();
      else this.doAuth();
    });
  },

  _bindForms() {
    window.swapForm      = (to) => LoginPage.swapForm(to);
    window.doAuth        = ()   => LoginPage.doAuth();
    window.doGoogle      = ()   => LoginPage.doGoogle();
    window.doVerify      = ()   => LoginPage.doVerify();
    window.doResend      = ()   => LoginPage.doResend();
    window.cancelVerify  = ()   => LoginPage.cancelVerify();
  }
};

document.addEventListener('DOMContentLoaded', () => LoginPage.init());
