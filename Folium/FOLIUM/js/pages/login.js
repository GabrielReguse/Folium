/* ═══════════════════════════════════════
   FOLIUM — pages/login.js
═══════════════════════════════════════ */

const LoginPage = {
  currentForm: 'login',   /* 'login' | 'register' */

  init() {
    this._bindForms();
  },

  /* ── Alterna entre login e cadastro ── */
  swapForm(to) {
    this.currentForm = to;
    const isReg = to === 'register';

    DOM.toggle(DOM.$('#f-login'),    'hidden-form',  isReg);
    DOM.toggle(DOM.$('#f-register'), 'hidden-form', !isReg);
    DOM.toggle(DOM.$('#sw-login'),   'hidden-form',  isReg);
    DOM.toggle(DOM.$('#sw-register'),'hidden-form', !isReg);

    /* Exibe/oculta com display */
    DOM.$('#f-login').style.display    = isReg ? 'none' : 'flex';
    DOM.$('#f-register').style.display = isReg ? 'flex' : 'none';
    DOM.$('#sw-login').style.display   = isReg ? 'none' : 'block';
    DOM.$('#sw-register').style.display= isReg ? 'block': 'none';
  },

  /* ── Autenticação fake ── */
  async doAuth() {
    const isReg = this.currentForm === 'register';

    if (isReg) {
      /* Validação básica */
      const nameEl  = DOM.$('#r-name');
      const emailEl = DOM.$('#r-email');
      const passEl  = DOM.$('#r-pass');

      if (!nameEl.value.trim())  { DOM.markError(nameEl);  return; }
      if (!Helpers.isValidEmail(emailEl.value)) { DOM.markError(emailEl); return; }
      if (passEl.value.length < 4) { DOM.markError(passEl); return; }

      await Modal.simulate(
        'Criando conta...', 'Configurando seu espaço pessoal', 1400,
        () => {
          Storage.setUser({ name: nameEl.value.trim(), email: emailEl.value });
          Router.go('home');
        }
      );
    } else {
      const emailEl = DOM.$('#l-email');
      const passEl  = DOM.$('#l-pass');

      if (!emailEl.value.trim()) { DOM.markError(emailEl); return; }
      if (!passEl.value.trim())  { DOM.markError(passEl);  return; }

      await Modal.simulate(
        'Entrando...', 'Verificando suas credenciais', 1100,
        () => {
          Storage.setUser({ name: Mock.user.name, email: emailEl.value });
          Router.go('home');
        }
      );
    }
  },

  /* ── Bind global p/ inline handlers ── */
  _bindForms() {
    /* Expõe no window para uso nos onclick do HTML */
    window.swapForm = (to)  => LoginPage.swapForm(to);
    window.doAuth   = ()    => LoginPage.doAuth();
  }
};

document.addEventListener('DOMContentLoaded', () => LoginPage.init());
