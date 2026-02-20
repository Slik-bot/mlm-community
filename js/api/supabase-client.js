// ═══ Supabase Client — единственное подключение к БД ═══

var SB_URL = 'https://tydavmiamwdrfjbcgwny.supabase.co';
var SB_KEY = 'sb_publishable_OBX-vskypeogQyJlViaqpQ_9kI1mDY4';

var sb = supabase.createClient(SB_URL, SB_KEY);

function getCurrentUser() {
  return window.AppState ? window.AppState.currentUser : null;
}

function getSession() {
  return window.AppState ? window.AppState.session : null;
}

function isAuthenticated() {
  return !!(window.AppState && window.AppState.session);
}

window.sb = sb;
window.getCurrentUser = getCurrentUser;
window.getSession = getSession;
window.isAuthenticated = isAuthenticated;
