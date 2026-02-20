// ═══ Auth API — регистрация, вход, сессия (БД v5.1) ═══

var EDGE_URL = 'https://tydavmiamwdrfjbcgwny.supabase.co/functions/v1';

// ═══ detectPlatform ═══

function detectPlatform() {
  var platform = 'web';
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
    platform = 'telegram_mini_app';
  } else if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
    platform = 'native_app';
  }
  window.setState('platform', platform);
  return platform;
}

// ═══ authRegister ═══

async function authRegister(email, password, name) {
  var res = await fetch(EDGE_URL + '/auth-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', email: email, password: password, name: name })
  });
  var data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Ошибка регистрации');
  }
  window.setState('currentUser', data.user);
  window.setState('session', data.session);
  window.AppEvents.emit('user:login', data.user);
  return data;
}

// ═══ authLogin ═══

async function authLogin(email, password) {
  var res = await fetch(EDGE_URL + '/auth-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: email, password: password })
  });
  var data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Ошибка входа');
  }
  window.setState('currentUser', data.user);
  window.setState('session', data.session);
  window.AppEvents.emit('user:login', data.user);
  return data;
}

// ═══ authLogout ═══

async function authLogout() {
  try {
    await window.sb.auth.signOut();
  } catch (err) {
    console.error('authLogout:', err);
  }
  window.resetState();
  window.AppEvents.emit('user:logout');
  if (typeof window.goTo === 'function') {
    window.goTo('scrLanding');
  }
}

// ═══ authCheckSession ═══

async function authCheckSession() {
  var result = await window.sb.auth.getSession();
  var session = result.data && result.data.session;
  if (!session) return null;

  var resp = await window.sb.from('users')
    .select('*')
    .eq('supabase_auth_id', session.user.id)
    .single();

  if (resp.error || !resp.data) return null;

  var profile = resp.data;
  window.setState('currentUser', profile);
  window.setState('session', session);
  window.AppEvents.emit('user:login', profile);

  window.sb.from('users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', profile.id)
    .then(function () {});

  return profile;
}

// ═══ Экспорт ═══

window.authRegister = authRegister;
window.authLogin = authLogin;
window.authLogout = authLogout;
window.authCheckSession = authCheckSession;
window.detectPlatform = detectPlatform;
