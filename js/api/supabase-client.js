// ═══ Supabase Client — единственное подключение к БД ═══

if (typeof supabase === 'undefined') {
  console.error('FATAL: Supabase CDN не загружен. Проверьте подключение к интернету.');
}

if (!window._sbClient) {
  window._sbClient = supabase.createClient(
    'https://tydavmiamwdrfjbcgwny.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZGF2bWlhbXdkcmZqYmNnd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NTUxNTUsImV4cCI6MjA4MzQzMTE1NX0.Wyhhvdy-EnzazbFywr5Nk3d0F3JknWVXz1Sgvz3x67g',
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
