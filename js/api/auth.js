// ═══ Auth API — регистрация, вход, сессия (БД v5.1) ═══

const EDGE_URL = 'https://tydavmiamwdrfjbcgwny.supabase.co/functions/v1';

// ═══ detectPlatform ═══

function detectPlatform() {
  let platform = 'web';
  if (window.Telegram && window.Telegram.WebApp &&
     (window.Telegram.WebApp.initData || window.Telegram.WebApp.platform)) {
    platform = 'telegram_mini_app';
  } else if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
    platform = 'native_app';
  }
  window.setState('platform', platform);
  document.body.classList.add('platform-' + platform.replace(/_/g, '-'));
  return platform;
}

// ═══ authRegister ═══

async function authRegister(email, password, name) {
  const res = await fetch(EDGE_URL + '/auth-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', email: email, password: password, name: name })
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Ошибка регистрации');
  }
  await window.sb.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token
  });
  window.setState('currentUser', data.user);
  window.setState('session', data.session);
  window.AppEvents.emit('user:login', data.user);
  return data;
}

// ═══ authLogin ═══

async function authLogin(email, password) {
  const res = await fetch(EDGE_URL + '/auth-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: email, password: password })
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Ошибка входа');
  }
  await window.sb.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token
  });
  window.setState('currentUser', data.user);
  window.setState('session', data.session);
  window.AppEvents.emit('user:login', data.user);
  return data;
}

// ═══ authTelegram ═══

async function waitForSb(timeout) {
  if (window.sb) return;
  const start = Date.now();
  await new Promise(function(resolve, reject) {
    const interval = setInterval(function() {
      if (window.sb) { clearInterval(interval); resolve(); }
      else if (Date.now() - start > timeout) { clearInterval(interval); reject(new Error('Supabase клиент не инициализирован')); }
    }, 100);
  });
}

async function authTelegram() {
  const tgApp = window.Telegram && window.Telegram.WebApp;
  if (!tgApp) {
    throw new Error('Telegram WebApp недоступен');
  }
  if (!tgApp.initData) {
    throw new Error('Telegram initData отсутствует. Откройте приложение через Telegram');
  }

  const res = await fetch(EDGE_URL + '/auth-telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: tgApp.initData })
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    alert('SERVER ERROR: ' + JSON.stringify(data));
    throw new Error(data.error || 'Ошибка авторизации через Telegram');
  }

  await waitForSb(3000);

  await window.sb.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token
  });

  const { data: profile } = await window.sb
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  const user = profile || data.user;
  window.setState('currentUser', user);
  window.setState('session', data.session);
  window.currentUser = user;
  if (window.AppEvents) window.AppEvents.emit('user:login', user);
  return { user: user, session: data.session };
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
  try {
    const result = await window.sb.auth.getSession();
    const session = result.data && result.data.session;
    if (!session) return null;

    const { data: user, error } = await window.sb
      .from('users')
      .select('*')
      .eq('supabase_auth_id', session.user.id)
      .maybeSingle();

    if (error) return null;

    // Профиль не найден — возвращаем базовый объект из сессии
    // чтобы не выкидывать на лендинг если таблица недоступна
    if (!user) {
      return {
        id: session.user.id,
        supabase_auth_id: session.user.id,
        email: session.user.email,
        dna_type: null,
        level: null
      };
    }

    if (window.setState) {
      window.setState('currentUser', user);
      window.setState('session', session);
    }
    window.currentUser = user;

    window.sb.from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.id)
      .then(function() {});

    return user;
  } catch (err) {
    return null;
  }
}

// ═══ Экспорт ═══

window.authRegister = authRegister;
window.authLogin = authLogin;
window.authTelegram = authTelegram;
window.authLogout = authLogout;
window.authCheckSession = authCheckSession;
window.detectPlatform = detectPlatform;
