// ===== AUTH CORE — АВТОЛОГИН, РЕГИСТРАЦИЯ, ВХОД, ВЫХОД =====

// АНТИМЕЛЬКАНИЕ — выполняется ДО всего остального
(function(){
  const s = document.createElement('style');
  s.id = 'preload-hide';
  s.textContent = '.scr{display:none!important;transition:none!important}body{background:#0a0a0f!important}';
  document.head.appendChild(s);
})();

(function() {

  localStorage.removeItem('mlm_saved_pass');

  function showApp() {
    const ph = document.getElementById('preload-hide');
    if (ph) ph.remove();
  }

  // Страховка: 8 секунд максимум
  const _fallbackTimer = setTimeout(async function() {
    const ph = document.getElementById('preload-hide');
    if (ph) {
      window._authRoutingDone = true;
      await switchScreenInstant('scrLanding');
      if (window.initLandingModals) window.initLandingModals();
      ph.remove();
    }
  }, 8000);

  // ===== МГНОВЕННОЕ ПЕРЕКЛЮЧЕНИЕ ЭКРАНА (без анимации) =====
  async function switchScreenInstant(screenId) {
    if (window.ensureTemplate) {
      await window.ensureTemplate(screenId);
    }

    isTransitioning = false;

    document.querySelectorAll('.scr').forEach(function(scr) {
      scr.classList.add('hidden');
      scr.classList.remove('back-hidden', 'scr-tr-enter', 'scr-tr-enter-right', 'scr-tr-enter-left', 'scr-tr-exit-left', 'scr-tr-exit-right');
    });

    // Также скрываем лендинг (у него нет класса .scr)
    const _lnd = document.getElementById('scrLanding');
    if (_lnd && screenId !== 'scrLanding') {
      _lnd.style.display = 'none';
    }
    if (screenId === 'scrLanding' && _lnd) {
      _lnd.style.display = '';
    }

    const target = document.getElementById(screenId);
    if (target) {
      target.classList.remove('hidden', 'back-hidden');
      // Принудительно сбрасываем opacity после удаления hidden
      target.style.opacity = '1';
      target.style.transform = 'translateX(0)';
      if (screenId === 'scrWelcome') {
        resetWelcomeAnimations();
      }
    }

    navHistory.length = 0;
    navHistory.push(screenId);

    updateChrome(screenId);

    const onbScreens = ['scrWelcome', 'scrDnaTest', 'scrDnaResult', 'scrSetup1', 'scrSetup2', 'scrSetup3', 'scrDone'];
    if (onbScreens.indexOf(screenId) !== -1) {
      document.body.classList.add('onboarding-mode');
    } else {
      document.body.classList.remove('onboarding-mode');
    }
  }

  // ===== ПОЛУЧЕНИЕ ИНПУТОВ МОДАЛОК =====
  window.getLoginInputs = function() {
    const modal = document.getElementById('lndLoginModal');
    if (!modal) return null;
    const inputs = modal.querySelectorAll('.lnd-input');
    return {
      email: inputs[0],
      password: inputs[1],
      submit: modal.querySelector('.lnd-submit')
    };
  };

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

  // ===== ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ МОДАЛОК =====
  function initAuthHandlers() {
    // ===== Патчим кнопку РЕГИСТРАЦИИ =====
    const reg = getRegisterInputs();
    if (reg && reg.submit) {
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
          await authRegister(email, password, name);
          if (window.haptic) haptic('success');
          if (name) localStorage.setItem('userName', name);
          freshRegistration();
          closeLndModals();
          showApp();
          await goTo('scrWelcome');
        } catch (err) {
          if (window.haptic) haptic('error');
          const msg = err.message || 'Ошибка регистрации';
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

    // ===== Патчим кнопку ВХОДА =====
    const login = getLoginInputs();
    if (login && login.submit) {
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
          localStorage.setItem('mlm_saved_email', email);

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
          const msg = err.message || 'Ошибка входа';
          if (msg.includes('Invalid login')) msg = 'Неверный email или пароль';
          showAuthError('login', msg);
        }

        login.submit.textContent = 'Войти';
        login.submit.disabled = false;
      };
    }

    // ===== Патчим кнопки OAuth (Telegram, Google, Apple) =====
    document.querySelectorAll('.lnd-btn-tg, .lnd-btn-gl').forEach(function(btn) {
      btn.onclick = async function(e) {
        e.preventDefault();
        e.stopPropagation();

        const text = btn.textContent.trim();
        if (text.includes('Telegram')) {
          btn.disabled = true;
          try {
            console.error('BTN CLICK - isTelegram:', typeof isTelegram !== 'undefined' ? isTelegram() : 'not defined', 'initData:', window.Telegram?.WebApp?.initData?.length || 0);
            const result = await authTelegram();
            if (window.haptic) haptic('success');
            closeLndModals();
            showApp();
            const user = result.user || {};
            if (!user.dna_type) {
              await goTo('scrDnaTest');
              if (window.dnaReset) window.dnaReset();
            } else if (!user.level) {
              goTo('scrSetup1');
            } else {
              localStorage.setItem('onboardingDone', 'true');
              goTo('scrFeed');
              if (window.initFeedFromDB) initFeedFromDB();
            }
          } catch (err) {
            if (window.haptic) haptic('error');
            alert('ERROR: ' + err.message + ' | stack: ' + (err.stack || 'no stack'));
          }
          btn.disabled = false;
        } else {
          showToast('Скоро будет доступен');
        }
      };
    });
  }

  // Экспорт для router.js (динамическая загрузка landing)
  window.initLandingModals = initAuthHandlers;

  // ===== Routing после успешной авторизации =====
  async function routeAfterAuth(profile) {
    clearTimeout(_fallbackTimer);
    if (window._authRoutingDone) return;
    window._authRoutingDone = true;

    if (profile) {
      const onboardingDone = localStorage.getItem('onboardingDone');
      const localDna = localStorage.getItem('dnaType');

      if (profile.name) localStorage.setItem('userName', profile.name);

      const hasDna = profile.dna_type || localDna;
      const hasName = profile.name && profile.name !== 'Участник';

      if (onboardingDone) {
        if (profile.dna_type) {
          const revMap = { strategist:'S', communicator:'C', creator:'K', analyst:'A' };
          localStorage.setItem('dnaType', revMap[profile.dna_type] || localDna || 'S');
        }
        await switchScreenInstant('scrFeed');
        showApp();
        if (window.initFeedFromDB) initFeedFromDB();
      } else if (hasDna && hasName) {
        localStorage.setItem('onboardingDone', 'true');
        if (profile.dna_type) {
          const revMap = { strategist:'S', communicator:'C', creator:'K', analyst:'A' };
          localStorage.setItem('dnaType', revMap[profile.dna_type] || localDna || 'S');
        }
        await switchScreenInstant('scrFeed');
        showApp();
        if (window.initFeedFromDB) initFeedFromDB();
      } else if (hasDna && !hasName) {
        await switchScreenInstant('scrSetup1');
        showApp();
      } else {
        await switchScreenInstant('scrWelcome');
        showApp();
      }
    } else {
      await switchScreenInstant('scrLanding');
      if (window.initLandingModals) window.initLandingModals();
      showApp();
    }
  }

  // ===== Ждём загрузки DOM =====
  window.addEventListener('DOMContentLoaded', async function() {

    // Telegram Mini App
    if (window.initTelegram) initTelegram();

    // Новые модули v5.1
    if (window.detectPlatform) detectPlatform();

    // ===== Telegram Mini App — автовход без участия пользователя =====
    if (window.isTelegram && isTelegram()) {
      try {
        const result = await authTelegram();
        await routeAfterAuth(result.user);
      } catch (err) {
        console.error('Telegram auto-login error:', err);
        if (window.showToast) showToast('Ошибка автовхода. Попробуйте войти вручную');
        try {
          const profile = await authCheckSession();
          await routeAfterAuth(profile);
        } catch (e) {
          console.error('Session fallback error:', e);
        }
      }
    }

    // ===== АВТОЛОГИН при загрузке =====
    if (!window._authRoutingDone) {
      authCheckSession().then(async function(profile) {
        await routeAfterAuth(profile);
      });
    }

    // ===== АВАТАРКА → МЕНЮ ПРОФИЛЯ =====

    const hdrAvatar = document.querySelector('#scrFeed .hdr-avatar');
    if (hdrAvatar) {
      hdrAvatar.removeAttribute('onclick');
      hdrAvatar.style.cssText += ';min-width:44px;min-height:44px;cursor:pointer;-webkit-tap-highlight-color:transparent;position:relative;z-index:100;';
      hdrAvatar.addEventListener('click', function(e) {
        e.stopPropagation();
        showProfileMenu();
      });
    }

    // Перехват вкладки "Профиль" в нижней навигации
    document.querySelectorAll('.nav .nav-i').forEach(function(item) {
      const lb = item.querySelector('.nav-lb');
      if (lb && lb.textContent.trim() === 'Профиль') {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          showProfileMenu();
        });
      }
    });
  });

  // ===== Выход из аккаунта =====
  window.doAppLogout = async function() {
    const savedEmail = localStorage.getItem('mlm_saved_email');
    try {
      await authLogout();
    } catch (e) {}
    localStorage.clear();
    if (savedEmail) localStorage.setItem('mlm_saved_email', savedEmail);
    location.reload();
  };

})();
