// ═══════════════════════════════════════
// AUTH FORMS — обработчики модалок входа/регистрации
// Отделено от auth-core.js
// ═══════════════════════════════════════

// ===== ПОЛУЧЕНИЕ ИНПУТОВ МОДАЛОК =====
function getLoginInputs() {
  const modal = document.getElementById('lndLoginModal');
  if (!modal) return null;
  const inputs = modal.querySelectorAll('.lnd-input');
  return {
    email: inputs[0],
    password: inputs[1],
    submit: modal.querySelector('.lnd-submit')
  };
}

function getRegisterInputs() {
  const modal = document.getElementById('lndRegisterModal');
  if (!modal) return null;
  const inputs = modal.querySelectorAll('.lnd-input');
  return {
    name: inputs[0],
    email: inputs[1],
    password: inputs[2],
    submit: modal.querySelector('.lnd-submit')
  };
}

// ===== Показать ошибку в модалке =====
function showAuthError(type, msg) {
  const modalId = type === 'register' ? 'lndRegisterModal' : 'lndLoginModal';
  const modal = document.getElementById(modalId);
  if (!modal) return;

  let errEl = modal.querySelector('.auth-error');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'auth-error';
    errEl.style.cssText = 'color:#ef4444;font-size:13px;text-align:center;padding:8px 0;';
    const submit = modal.querySelector('.lnd-submit');
    if (submit) submit.parentNode.insertBefore(errEl, submit);
  }

  errEl.textContent = msg;
  setTimeout(function() { errEl.textContent = ''; }, 5000);
}

// ===== ОБРАБОТЧИК РЕГИСТРАЦИИ =====
function handleRegister() {
  const reg = getRegisterInputs();
  if (!reg || !reg.submit) return;
  reg.submit.onclick = async function(e) {
    e.preventDefault();
    const name = reg.name ? reg.name.value.trim() : '';
    const email = reg.email ? reg.email.value.trim().toLowerCase() : '';
    const password = reg.password ? reg.password.value : '';
    if (!email || !password) {
      showAuthError('register', 'Введите email и пароль');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAuthError('register', 'Некорректный формат email');
      return;
    }
    if (password.length < 6) {
      showAuthError('register', 'Пароль минимум 6 символов');
      return;
    }
    reg.submit.textContent = 'Создание...';
    reg.submit.disabled = true;
    try {
      const result = await authRegister(email, password, name);
      if (window.haptic) haptic('success');
      if (name) localStorage.setItem('userName', name);
      // Email требует верификации
      if (result && result.needs_verification) {
        window._verifyData = {
          user_id: result.user_id,
          email: result.email,
          password: password,
        };
        closeLndModals();
        showApp();
        goTo('scrVerifyEmail');
        return;
      }
      // Fallback: прямая сессия (Telegram OAuth и т.д.)
      freshRegistration();
      closeLndModals();
      showApp();
      await goTo('scrWelcome');
    } catch (err) {
      if (window.haptic) haptic('error');
      let msg = err.message || 'Ошибка регистрации';
      if (msg.includes('already registered')) msg = 'Email уже зарегистрирован';
      else if (msg.includes('validate email') || msg.includes('invalid format')) msg = 'Некорректный формат email';
      else if (msg.includes('invalid')) msg = 'Некорректный email';
      else if (msg.includes('Database error')) msg = 'Ошибка базы данных. Попробуйте позже';
      showAuthError('register', msg);
    }
    reg.submit.textContent = 'Создать аккаунт';
    reg.submit.disabled = false;
  };
}

// ===== ОБРАБОТЧИК ВХОДА =====
function handleLogin() {
  const login = getLoginInputs();
  if (!login || !login.submit) return;
  login.submit.onclick = async function(e) {
    e.preventDefault();
    const email = login.email ? login.email.value.trim() : '';
    const password = login.password ? login.password.value : '';
    if (!email || !password) {
      showAuthError('login', 'Введите email и пароль');
      return;
    }
    login.submit.textContent = 'Вход...';
    login.submit.disabled = true;
    try {
      const data = await authLogin(email, password);
      if (window.haptic) haptic('success');
      localStorage.setItem('trafiqo_saved_email', email);
      if (window.PasswordCredential) {
        try {
          const cred = new PasswordCredential({ id: email, password: password, name: email });
          navigator.credentials.store(cred);
        } catch (e) {}
      }
      const loginForm = document.querySelector('#lndLoginModal form');
      if (loginForm) {
        try { loginForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); } catch(e) {}
      }
      closeLndModals();
      const user = data.user || {};
      if (!user.dna_type) {
        await goTo('scrDnaTest');
        if (window.dnaReset) window.dnaReset();
      } else if (!user.level) {
        goTo('scrSetup1');
      } else {
        localStorage.setItem('onboardingDone', 'true');
        goTo('scrFeed');
        initFeedFromDB();
      }
    } catch (err) {
      if (window.haptic) haptic('error');
      let msg = err.message || 'Ошибка входа';
      if (msg.includes('Invalid login')) msg = 'Неверный email или пароль';
      showAuthError('login', msg);
    }
    login.submit.textContent = 'Войти';
    login.submit.disabled = false;
  };
}

// ===== ОБРАБОТЧИК OAuth (Telegram, Google) =====
function handleOAuth() {
  document.querySelectorAll('.lnd-btn-tg, .lnd-btn-gl').forEach(function(btn) {
    btn.onclick = async function(e) {
      e.preventDefault(); e.stopPropagation();
      const originalText = btn.textContent.trim();
      if (originalText.includes('Telegram')) {
        if (!window.isTelegram || !isTelegram()) {
          showToast('Доступно только в Telegram приложении');
          return;
        }
        if (window.haptic) haptic('medium');
        btn.disabled = true; btn.classList.add('loading');
        btn.textContent = 'Подключение...';
        try {
          const result = await authTelegram();
          sessionStorage.removeItem('manually_logged_out');
          if (window.haptic) haptic('success');
          closeLndModals();
          showApp();
          const user = result.user || {};
          if (user.name) localStorage.setItem('userName', user.name);
          if (!user.dna_type) {
            await goTo('scrWelcome');
          } else if (!user.level) {
            goTo('scrSetup1');
          } else {
            localStorage.setItem('onboardingDone', 'true');
            goTo('scrFeed');
            if (window.initFeedFromDB) initFeedFromDB();
          }
        } catch (err) {
          if (window.haptic) haptic('error');
          btn.textContent = err.message || 'Ошибка входа';
          btn.classList.remove('loading');
          setTimeout(function() {
            btn.textContent = originalText;
            btn.disabled = false;
          }, 3000);
          return;
        }
        btn.classList.remove('loading');
        btn.textContent = originalText;
        btn.disabled = false;
      } else {
        showToast('Скоро будет доступен');
      }
    };
  });
}

// ===== ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ МОДАЛОК =====
function initAuthHandlers() {
  handleRegister();
  handleLogin();
  handleOAuth();
}

// ===== ЭКСПОРТЫ =====
window.getLoginInputs = getLoginInputs;
window.getRegisterInputs = getRegisterInputs;
window.handleRegister = handleRegister;
window.handleLogin = handleLogin;
window.handleOAuth = handleOAuth;
window.initLandingModals = initAuthHandlers;
window.initAuthHandlers = initAuthHandlers;
