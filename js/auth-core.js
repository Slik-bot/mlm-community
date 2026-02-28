// ===== AUTH CORE — АВТОЛОГИН, РЕГИСТРАЦИЯ, ВХОД, ВЫХОД =====

// АНТИМЕЛЬКАНИЕ — выполняется ДО всего остального
(function(){
  const s = document.createElement('style');
  s.id = 'preload-hide';
  s.textContent = '.scr{display:none!important;transition:none!important}body{background:#0a0a0f!important}';
  document.head.appendChild(s);
})();

(function() {

  localStorage.removeItem('trafiqo_saved_pass');

  function showApp() {
    const ph = document.getElementById('preload-hide');
    if (ph) ph.remove();
  }
  window.showApp = showApp;

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

  // ═══════════════════════════════════════
  // ФОРМЫ АВТОРИЗАЦИИ — см. auth-forms.js
  // ═══════════════════════════════════════

  // ===== Routing после успешной авторизации =====
  async function routeAfterAuth(profile) {
    clearTimeout(_fallbackTimer);
    if (window._authRoutingDone) {
      console.error('routeAfterAuth: повторный вызов заблокирован');
      return;
    }
    window._authRoutingDone = true;

    if (profile) {
      const onboardingDone = localStorage.getItem('onboardingDone');
      const localDna = localStorage.getItem('dnaType');

      if (profile.name) localStorage.setItem('userName', profile.name);

      const hasDna = profile.dna_type || localDna;
      const hasName = profile.name && profile.name !== 'Участник';

      // Серверный фоллбэк: профиль с dna_type+level = онбординг завершён
      const localDnaCheck = localStorage.getItem('dnaType');
      if (!onboardingDone && profile.dna_type && profile.level) {
        localStorage.setItem('onboardingDone', '1');
      }

      if (onboardingDone || (profile.dna_type && profile.level)
        || (localDnaCheck && profile.name && profile.name !== 'Участник')
        || (profile.level && profile.level !== 'pawn')) {
        if (!onboardingDone) {
          localStorage.setItem('onboardingDone', '1');
        }
        const revMap = { strategist:'S', communicator:'C', creator:'K', analyst:'A' };
        if (profile.dna_type) {
          localStorage.setItem('dnaType', revMap[profile.dna_type] || localDna || 'S');
        }
        if (window.applyDnaTheme) {
          applyDnaTheme(revMap[profile.dna_type] || localDna || 'S');
        }
        if (!profile.quest_completed && !localStorage.getItem('quest_shown_permanent')) {
          localStorage.setItem('quest_shown_permanent', '1');
          await switchScreenInstant('scrQuest');
          navHistory.unshift('scrFeed');
          showApp();
        } else {
          const safeScreens = ['scrFeed','scrCompanies','scrSearch','scrProfile','scrChatList','scrShop','scrMore'];
          const last = localStorage.getItem('lastScreen') || 'scrFeed';
          const safeScreen = safeScreens.includes(last) ? last : 'scrFeed';
          await switchScreenInstant(safeScreen);
          showApp();
          if (window.initFeedFromDB) initFeedFromDB();
        }
      } else if (hasDna && hasName) {
        await switchScreenInstant('scrSetup1');
        showApp();
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

    async function runAppInit() {
      window._authRoutingDone = false;

      // ===== Telegram Mini App — показываем лендинг, если нет сессии =====
      if (window.isTelegram && isTelegram()) {
        if (sessionStorage.getItem('manually_logged_out')) {
          await routeAfterAuth(null);
        } else {
          try {
            const profile = await authCheckSession();
            if (profile) {
              await routeAfterAuth(profile);
            } else {
              await routeAfterAuth(null);
            }
          } catch (e) {
            console.error('Telegram session check error:', e);
            await routeAfterAuth(null);
          }
        }
      }

      // ===== АВТОЛОГИН при загрузке =====
      if (!window._authRoutingDone) {
        const hasToken = !!localStorage.getItem('sb-tydavmiamwdrfjbcgwny-auth-token');
        if (!hasToken) {
          routeAfterAuth(null); // Нет токена — сразу лендинг
        }
        // Токен есть → ждём INITIAL_SESSION от onAuthStateChange
      }

      // ===== ВОССТАНОВЛЕНИЕ СЕССИИ ЧЕРЕЗ SUPABASE =====
      window.sb.auth.onAuthStateChange(function(event, session) {
        if (event === 'INITIAL_SESSION') {
          if (session && !window._authRoutingDone) {
            authCheckSession().then(function(profile) {
              routeAfterAuth(profile);
            });
          } else if (!session && !window._authRoutingDone) {
            showApp();
            switchScreenInstant('scrLanding');
          }
          return;
        }
        if (event === 'SIGNED_IN' && session && !window._authRoutingDone) {
          authCheckSession().then(function(profile) {
            routeAfterAuth(profile);
          });
        }
        if (event === 'SIGNED_OUT') {
          if (sessionStorage.getItem('manually_logged_out')) {
            sessionStorage.removeItem('manually_logged_out');
            switchScreenInstant('scrLanding');
            if (window.initLandingModals) window.initLandingModals();
          }
          // Побочный SIGNED_OUT от refresh — игнорируем
        }
      });

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
    }

    if (!sessionStorage.getItem('splashShown')) {
      sessionStorage.setItem('splashShown', '1');
      try {
        window.initSplash(function() {
          runAppInit();
        });
      } catch(e) {
        runAppInit();
      }
    } else {
      runAppInit();
    }
  });

  // ===== Выход из аккаунта =====
  window.doAppLogout = async function() {
    const savedEmail = localStorage.getItem('trafiqo_saved_email');
    const questShown = localStorage.getItem('quest_shown_permanent');
    sessionStorage.setItem('manually_logged_out', '1');
    try {
      await authLogout();
    } catch (e) {}
    localStorage.clear();
    if (savedEmail) localStorage.setItem('trafiqo_saved_email', savedEmail);
    if (questShown) localStorage.setItem('quest_shown_permanent', questShown);
    location.reload();
  };

})();
