// ═══ Supabase Client — единственное подключение к БД ═══

if (!window.sb) {
  window.sb = supabase.createClient(
    'https://tydavmiamwdrfjbcgwny.supabase.co',
    'sb_publishable_OBX-vskypeogQyJlViaqpQ_9kI1mDY4'
  );
}

function getCurrentUser() {
  return window.AppState ? window.AppState.currentUser : null;
}

function getSession() {
  return window.AppState ? window.AppState.session : null;
}

function isAuthenticated() {
  return !!(window.AppState && window.AppState.session);
}
window.getCurrentUser = getCurrentUser;
window.getSession = getSession;
window.isAuthenticated = isAuthenticated;
