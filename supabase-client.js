// ═══ Supabase Client — создание window.sb ═══
// Ждём готовности CDN, затем создаём клиент

function createSbClient() {
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    setTimeout(createSbClient, 100);
    return;
  }
  if (window.sb) return;
  try {
    window.sb = supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
  } catch (err) {
    console.error('Supabase createClient error:', err);
    setTimeout(createSbClient, 500);
  }
}

createSbClient();
