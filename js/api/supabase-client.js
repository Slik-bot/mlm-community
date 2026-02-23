// ═══ Supabase Helpers — хелперы для работы с auth ═══
// window.sb создаётся в /supabase-client.js (загружается первым)

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
