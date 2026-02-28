// ═══ Companies API — каталог, детали, участники, отзывы ═══

// ═══ loadCompanies ═══

async function loadCompanies(options) {
  const o = options || {};
  let query = window.sb.from('companies')
    .select('*')
    .eq('is_active', true);

  if (o.category) query = query.eq('category', o.category);
  if (o.city) query = query.eq('city', o.city);
  if (o.search) query = query.ilike('name', '%' + o.search + '%');

  const sortMap = {
    rating: ['rating', false],
    popular: ['members_count', false],
    newest: ['created_at', false],
    name: ['name', true]
  };
  const sort = sortMap[o.sort] || sortMap.popular;
  query = query.order(sort[0], { ascending: sort[1] });

  if (o.offset) {
    query = query.range(o.offset, o.offset + (o.limit || 20) - 1);
  } else {
    query = query.limit(o.limit || 20);
  }

  const result = await query;
  return { data: result.data, error: result.error };
}

// ═══ loadCompanyDetail ═══

async function loadCompanyDetail(companyId) {
  const result = await window.sb.from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  return { data: result.data, error: result.error };
}

// ═══ loadCompanyMembers ═══

async function loadCompanyMembers(companyId, limit) {
  const result = await window.sb.from('company_members')
    .select('*, user:users(id, name, avatar_url, dna_type, level)')
    .eq('company_id', companyId)
    .order('joined_at', { ascending: false })
    .limit(limit || 20);

  return { data: result.data, error: result.error };
}

// ═══ checkMembership ═══

async function checkMembership(companyId) {
  const user = window.getCurrentUser();
  if (!user) return { member: false, role: null };

  const result = await window.sb.from('company_members')
    .select('id, role')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .maybeSingle();

  return { member: !!result.data, role: result.data ? result.data.role : null };
}

// ═══ joinCompany ═══

async function joinCompany(companyId) {
  const user = window.getCurrentUser();
  if (!user) return { data: null, error: { message: 'Не авторизован' } };

  const result = await window.sb.from('company_members').insert({
    company_id: companyId,
    user_id: user.id,
    role: 'member'
  }).select().single();

  return { data: result.data, error: result.error };
}

// ═══ leaveCompany ═══

async function leaveCompany(companyId) {
  const user = window.getCurrentUser();
  if (!user) return { data: null, error: { message: 'Не авторизован' } };

  const result = await window.sb.from('company_members')
    .delete()
    .eq('company_id', companyId)
    .eq('user_id', user.id);

  return { data: result.data, error: result.error };
}

// ═══ loadCompanyReviews ═══

async function loadCompanyReviews(companyId, limit) {
  const result = await window.sb.from('reviews')
    .select('*, reviewer:users!reviewer_id(id, name, avatar_url, dna_type, level)')
    .eq('target_type', 'company')
    .eq('target_id', companyId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit || 20);

  return { data: result.data, error: result.error };
}

// ═══ addCompanyReview ═══

async function addCompanyReview(companyId, rating, content) {
  const user = window.getCurrentUser();
  if (!user) return { data: null, error: { message: 'Не авторизован' } };

  const result = await window.sb.from('reviews').insert({
    reviewer_id: user.id,
    target_type: 'company',
    target_id: companyId,
    rating: rating,
    content: content
  }).select().single();

  return { data: result.data, error: result.error };
}

// ═══ searchCompanies ═══

async function searchCompanies(query) {
  const result = await window.sb.from('companies')
    .select('id, name, logo_url, category, city, rating, members_count, is_verified')
    .eq('is_active', true)
    .ilike('name', '%' + query + '%')
    .order('members_count', { ascending: false })
    .limit(10);

  return { data: result.data, error: result.error };
}

// ═══ Экспорт ═══

window.loadCompanies = loadCompanies;
window.loadCompanyDetail = loadCompanyDetail;
window.loadCompanyMembers = loadCompanyMembers;
window.checkMembership = checkMembership;
window.joinCompany = joinCompany;
window.leaveCompany = leaveCompany;
window.loadCompanyReviews = loadCompanyReviews;
window.addCompanyReview = addCompanyReview;
window.searchCompanies = searchCompanies;
