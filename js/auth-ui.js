// ===== AUTH UI — ПАРОЛЬ, АВТОЗАПОЛНЕНИЕ, МЕНЮ ПРОФИЛЯ, ПЕРЕХВАТЫ =====

(function() {

  var SVG_EYE_OPEN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var SVG_EYE_CLOSED = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  // ===== Меню профиля (модальное) =====
  window.showProfileMenu = function() {
    var existing = document.getElementById('profileMenuOverlay');
    if (existing) { existing.remove(); return; }

    var overlay = document.createElement('div');
    overlay.id = 'profileMenuOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;';

    var menu = document.createElement('div');
    menu.style.cssText = 'background:#16161e;border-radius:14px;padding:20px;width:280px;max-width:90vw;';

    var title = document.createElement('div');
    title.textContent = 'Профиль';
    title.style.cssText = 'color:#fff;font-size:17px;font-weight:600;text-align:center;margin-bottom:16px;';
    menu.appendChild(title);

    var profileItem = document.createElement('div');
    profileItem.textContent = 'Мой профиль (скоро)';
    profileItem.style.cssText = 'padding:14px;border-radius:10px;text-align:center;font-size:15px;color:rgba(255,255,255,.3);margin-bottom:8px;background:rgba(255,255,255,.03);';
    menu.appendChild(profileItem);

    var logoutItem = document.createElement('div');
    logoutItem.textContent = 'Выйти из аккаунта';
    logoutItem.style.cssText = 'padding:14px;border-radius:10px;text-align:center;font-size:15px;font-weight:500;color:#ef4444;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.15);cursor:pointer;margin-bottom:8px;-webkit-tap-highlight-color:transparent;';
    function doLogout() { overlay.remove(); doAppLogout(); }
    logoutItem.onclick = doLogout;
    menu.appendChild(logoutItem);

    var closeItem = document.createElement('div');
    closeItem.textContent = 'Закрыть';
    closeItem.style.cssText = 'padding:14px;border-radius:10px;text-align:center;font-size:14px;color:rgba(255,255,255,.5);cursor:pointer;-webkit-tap-highlight-color:transparent;';
    function doClose() { overlay.remove(); }
    closeItem.onclick = doClose;
    menu.appendChild(closeItem);

    overlay.appendChild(menu);

    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    document.body.appendChild(overlay);
  };

  // ===== Ждём загрузки DOM =====
  window.addEventListener('DOMContentLoaded', function() {

    // ===== КНОПКА "ПОКАЗАТЬ ПАРОЛЬ" =====

    var pwStyles = document.createElement('style');
    pwStyles.textContent = '.pw-wrap{position:relative;width:100%}.pw-toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:transparent;border:none;cursor:pointer;padding:0;color:rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;transition:color .2s;z-index:2}.pw-toggle:hover{color:rgba(255,255,255,.7)}';
    document.head.appendChild(pwStyles);

    document.querySelectorAll('.lnd-modal input[type="password"]').forEach(function(inp) {
      if (inp.parentElement.classList.contains('pw-wrap')) return;

      inp.style.paddingRight = '40px';

      var wrap = document.createElement('div');
      wrap.className = 'pw-wrap';
      inp.parentNode.insertBefore(wrap, inp);
      wrap.appendChild(inp);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pw-toggle';
      btn.innerHTML = SVG_EYE_CLOSED;
      btn.setAttribute('tabindex', '-1');
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (inp.type === 'password') {
          inp.type = 'text';
          btn.innerHTML = SVG_EYE_OPEN;
        } else {
          inp.type = 'password';
          btn.innerHTML = SVG_EYE_CLOSED;
        }
      });

      wrap.appendChild(btn);
    });

    // ===== АВТОЗАПОЛНЕНИЕ ПАРОЛЕЙ БРАУЗЕРОМ =====

    var loginModal = document.getElementById('lndLoginModal');
    if (loginModal) {
      var lInputs = loginModal.querySelectorAll('.lnd-input');
      if (lInputs[0]) { lInputs[0].setAttribute('type', 'email'); lInputs[0].setAttribute('name', 'email'); lInputs[0].setAttribute('autocomplete', 'email'); lInputs[0].setAttribute('inputmode', 'email'); }
      if (lInputs[1]) { lInputs[1].setAttribute('name', 'password'); lInputs[1].setAttribute('autocomplete', 'current-password'); }
    }

    var regModal = document.getElementById('lndRegisterModal');
    if (regModal) {
      var rInputs = regModal.querySelectorAll('.lnd-input');
      if (rInputs[0]) { rInputs[0].setAttribute('name', 'name'); rInputs[0].setAttribute('autocomplete', 'name'); }
      if (rInputs[1]) { rInputs[1].setAttribute('type', 'email'); rInputs[1].setAttribute('name', 'email'); rInputs[1].setAttribute('autocomplete', 'email'); rInputs[1].setAttribute('inputmode', 'email'); }
      if (rInputs[2]) { rInputs[2].setAttribute('name', 'new-password'); rInputs[2].setAttribute('autocomplete', 'new-password'); }
    }

    // Обёртка полей в <form> для распознавания браузером
    ['lndLoginModal', 'lndRegisterModal'].forEach(function(modalId) {
      var modal = document.getElementById(modalId);
      if (!modal) return;
      var body = modal.querySelector('.lnd-modal-body');
      if (!body || body.querySelector('form')) return;

      var form = document.createElement('form');
      form.method = 'POST';
      form.action = '#';
      form.setAttribute('autocomplete', 'on');

      var toMove = [];
      Array.from(body.children).forEach(function(child) {
        if (child.classList.contains('lnd-input') ||
            child.classList.contains('pw-wrap') ||
            child.classList.contains('lnd-submit') ||
            child.classList.contains('lnd-forgot')) {
          toMove.push(child);
        }
      });

      if (!toMove.length) return;

      body.insertBefore(form, toMove[0]);
      toMove.forEach(function(el) { form.appendChild(el); });

      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var submitBtn = form.querySelector('.lnd-submit');
        if (submitBtn) submitBtn.click();
      });
    });

    // ===== АВТОЗАПОЛНЕНИЕ ИЗ LOCALSTORAGE =====
    var _origOpenLndModal = window.openLndModal;
    window.openLndModal = function(type) {
      if (_origOpenLndModal) _origOpenLndModal(type);
      if (type === 'login') {
        var loginInputs = getLoginInputs();
        if (loginInputs) {
          var savedEmail = localStorage.getItem('mlm_saved_email');
          if (savedEmail && loginInputs.email) {
            loginInputs.email.value = savedEmail;
          }
        }
      }
    };
  });


  // ===== ПЕРЕХВАТ СОХРАНЕНИЯ ПРОФИЛЯ =====

  var _origSetupGoStep2 = window.setupGoStep2;
  window.setupGoStep2 = function() {
    var inp = document.getElementById('stpNameInput');
    var name = inp ? inp.value.trim() : 'Участник';
    if (name.length < 2) name = 'Участник';

    saveOnboardingStep('name', { name: name });

    if (_origSetupGoStep2) _origSetupGoStep2();
  };

  var _origSetupSkipName = window.setupSkipName;
  window.setupSkipName = function() {
    saveOnboardingStep('name', { name: 'Участник' });
    if (_origSetupSkipName) _origSetupSkipName();
  };

  var _origStartDnaReveal = window.startDnaReveal;
  if (_origStartDnaReveal) {
    window.startDnaReveal = function() {
      var promise = _origStartDnaReveal.apply(this, arguments);

      // localStorage.setItem('dnaType') выполняется синхронно в начале startDnaReveal
      var dnaType = localStorage.getItem('dnaType');
      var scores = localStorage.getItem('dnaScores');
      if (dnaType) {
        saveDnaResult(dnaType, { answers: scores ? JSON.parse(scores) : {} });
      }

      return promise;
    };
  }

  var _origSetupShowDone = window.setupShowDone;
  window.setupShowDone = function() {
    var interests = window.setupSelectedInterests || [];
    if (interests.length) saveOnboardingStep('interests', { interests: interests });

    var goal = window.setupSelectedGoal || '';
    if (goal) saveOnboardingStep('goal', { goal: goal });

    saveOnboardingStep('complete', {});

    if (_origSetupShowDone) _origSetupShowDone();
  };

  var _origSetupFinish = window.setupFinish;
  window.setupFinish = function() {
    if (_origSetupFinish) _origSetupFinish();
    setTimeout(initFeedFromDB, 500);
  };

})();
