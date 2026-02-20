// ═══ Companies API — каталог, детали, заявки ═══

// ═══ loadCompanies ═══

async function loadCompanies(filter, limit) {
  var query = window.sb.from('companies')
    .select('*')
    .eq('is_active', true)
    .order('members_count', { ascending: false })
    .limit(limit || 20);

  if (filter) {
    query = query.eq('category', filter);
  }

  var result = await query;
  return { data: result.data, error: result.error };
}

// ═══ loadCompanyDetail ═══

async function loadCompanyDetail(companyId) {
  var result = await window.sb.from('companies')
    .select('*, experts:expert_cards(*, user:users(id, name, avatar_url, dna_type))')
    .eq('id', companyId)
    .single();

  return { data: result.data, error: result.error };
}

// ═══ sendApplication ═══

async function sendApplication(companyId, message) {
  var user = window.getCurrentUser();
  if (!user) return { data: null, error: { message: 'Не авторизован' } };

  var result = await window.sb.from('orders').insert({
    client_id: user.id,
    title: 'Заявка в компанию',
    description: message || '',
    category: companyId,
    status: 'open'
  }).select().single();

  return { data: result.data, error: result.error };
}

// ═══ Экспорт ═══

window.loadCompanies = loadCompanies;
window.loadCompanyDetail = loadCompanyDetail;
window.sendApplication = sendApplication;
