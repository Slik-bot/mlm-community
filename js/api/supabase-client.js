// ═══ Supabase Client — единственное подключение к БД ═══

if (!window._sbClient) {
  window._sbClient = supabase.createClient(
    'https://tydavmiamwdrfjbcgwny.supabase.co',
    'sb_publishable_OBX-vskypeogQyJlViaqpQ_9kI1mDY4',
    {
      auth: {
        persistSession: true,
        storageKey: 'mlm-auth',
        storage: window.localStorage
      }
    }
  );
  window.sb = window._sbClient;
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
