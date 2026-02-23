// ═══ Supabase Client v5.1 ═══
(function() {
  let _attempts = 0;

  function tryCreate() {
    _attempts++;

    if (typeof supabase === 'undefined' || !supabase.createClient) {
      if (_attempts < 50) setTimeout(tryCreate, 200);
      else console.error('Supabase CDN не загрузился за 10 секунд');
      return;
    }

    if (window.sb) return;

    try {
      window.sb = supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        }
      );
    } catch (err) {
      console.error('createClient error:', err);
      if (_attempts < 50) setTimeout(tryCreate, 500);
    }
  }

  // Запуск — сразу и после DOMContentLoaded
  tryCreate();
  document.addEventListener('DOMContentLoaded', tryCreate);
})();
