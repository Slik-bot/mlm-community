// ═══════════════════════════════════════
// VERIFY EMAIL — экран ввода 6-значного кода
// ═══════════════════════════════════════

const VE_EDGE_URL = 'https://tydavmiamwdrfjbcgwny.supabase.co/functions/v1/verify-email';
const VE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZGF2bWlhbXdkcmZqYmNnd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NTUxNTUsImV4cCI6MjA4MzQzMTE1NX0.Wyhhvdy-EnzazbFywr5Nk3d0F3JknWVXz1Sgvz3x67g';
const VE_RESEND_INTERVAL = 60;

let veTimerInterval = null;

function initVerifyEmail() {
  const data = window._verifyData;
  if (!data) { window.goTo('scrLanding'); return; }

  document.getElementById('ve-email-display').textContent = data.email;

  callSendCode(data.user_id, data.email);
  setupCodeInputs();
  startResendTimer();

  document.getElementById('ve-submit-btn').addEventListener('click', () => handleSubmit(data));
  document.getElementById('ve-resend-btn').addEventListener('click', () => handleResend(data));
  document.getElementById('ve-change-email').addEventListener('click', handleChangeEmail);
}

function setupCodeInputs() {
  const inputs = document.querySelectorAll('.ve-code-digit');

  inputs.forEach((input, i) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 1);
      input.classList.toggle('ve-filled', input.value.length === 1);
      if (input.value && i < 5) inputs[i + 1].focus();
      updateSubmitState();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) {
        inputs[i - 1].focus();
        inputs[i - 1].value = '';
        inputs[i - 1].classList.remove('ve-filled');
        updateSubmitState();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      for (let j = 0; j < 6; j++) {
        inputs[j].value = text[j] || '';
        inputs[j].classList.toggle('ve-filled', !!text[j]);
      }
      if (text.length > 0) inputs[Math.min(text.length, 5)].focus();
      updateSubmitState();
    });
  });
}

function updateSubmitState() {
  const code = getCode();
  document.getElementById('ve-submit-btn').disabled = code.length !== 6;
}

function getCode() {
  const inputs = document.querySelectorAll('.ve-code-digit');
  let code = '';
  inputs.forEach((input) => { code += input.value; });
  return code;
}

async function handleSubmit(data) {
  const code = getCode();
  if (code.length !== 6) return;

  const btn = document.getElementById('ve-submit-btn');
  btn.classList.add('ve-loading');
  btn.disabled = true;
  hideError();

  try {
    const result = await callVerifyCode(data.user_id, data.email, code);
    if (result.error) {
      let msg = result.error;
      if (result.attempts_left !== undefined) msg += ` (осталось ${result.attempts_left})`;
      showError(msg);
      btn.classList.remove('ve-loading');
      btn.disabled = false;
      return;
    }
    await autoLogin(data.email, data.password);
  } catch (err) {
    console.error('verify submit error:', err);
    showError('Ошибка проверки кода');
    btn.classList.remove('ve-loading');
    btn.disabled = false;
  }
}

function handleResend(data) {
  callSendCode(data.user_id, data.email);
  startResendTimer();
}

function handleChangeEmail() {
  window._verifyData = null;
  if (veTimerInterval) clearInterval(veTimerInterval);
  window.goTo('scrLanding');
}

async function callSendCode(userId, email) {
  hideError();
  try {
    const res = await fetch(VE_EDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + VE_ANON_KEY, 'apikey': VE_ANON_KEY },
      body: JSON.stringify({ action: 'send-code', user_id: userId, email }),
    });
    const data = await res.json();
    if (data.error) showError(data.error);
  } catch (err) {
    console.error('send-code error:', err);
    showError('Ошибка отправки кода');
  }
}

async function callVerifyCode(userId, email, code) {
  const res = await fetch(VE_EDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + VE_ANON_KEY, 'apikey': VE_ANON_KEY },
    body: JSON.stringify({ action: 'verify-code', user_id: userId, email, code }),
  });
  return await res.json();
}

async function autoLogin(email, password) {
  try {
    await window.authLogin(email, password);
    window._verifyData = null;
    if (veTimerInterval) clearInterval(veTimerInterval);
    if (window.freshRegistration) window.freshRegistration();
    if (window.closeLndModals) window.closeLndModals();
    if (window.showApp) window.showApp();
    window.goTo('scrWelcome');
  } catch (err) {
    console.error('auto-login error:', err);
    showError('Email подтверждён, но вход не удался. Попробуйте войти вручную.');
  }
}

function startResendTimer() {
  const timerEl = document.getElementById('ve-resend-timer');
  const btnEl = document.getElementById('ve-resend-btn');
  let seconds = VE_RESEND_INTERVAL;

  timerEl.textContent = `Повторная отправка через ${seconds}с`;
  timerEl.classList.remove('ve-hidden');
  btnEl.classList.remove('ve-visible');

  if (veTimerInterval) clearInterval(veTimerInterval);
  veTimerInterval = setInterval(() => {
    seconds--;
    timerEl.textContent = `Повторная отправка через ${seconds}с`;
    if (seconds <= 0) {
      clearInterval(veTimerInterval);
      timerEl.classList.add('ve-hidden');
      btnEl.classList.add('ve-visible');
    }
  }, 1000);
}

function showError(msg) {
  const el = document.getElementById('ve-error');
  el.textContent = msg;
  el.classList.add('ve-visible');
}

function hideError() {
  const el = document.getElementById('ve-error');
  el.textContent = '';
  el.classList.remove('ve-visible');
}

window.initVerifyEmail = initVerifyEmail;
